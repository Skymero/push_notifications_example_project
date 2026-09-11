import { randomUUID } from 'crypto';
import { createAdminClients, Permission, Query, Role } from '../../_shared/appwrite';
import { loadConfig } from '../../_shared/env';
import { getFirebaseMessaging } from '../../_shared/firebase';
import {
  fail,
  getAuthenticatedUserId,
  ok,
  parseJsonBody,
  withHandler,
} from '../../_shared/http';
import { createNotificationData, createReceiptNonce } from '../../_shared/notificationPayload';
import type { AppwriteFunctionContext } from '../../_shared/http';

type FanoutRequest = {
  notificationType?: string;
  idempotencyKey?: string;
};

type DeviceTokenDocument = {
  $id: string;
  userId: string;
  deviceId: string;
  fcmToken: string;
  platform: 'android';
  isActive: boolean;
  tokenStatus: string;
  receiveStatus: string;
};

const TITLE = 'Push notification test';
const BODY = 'Your Android device received a database-defined notification.';
const TERMINAL_STATUSES = new Set(['completed', 'partially_completed', 'failed']);

function isStaleProcessingJob(createdAt: unknown, staleSeconds: number) {
  if (typeof createdAt !== 'string') {
    return true;
  }

  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return true;
  }

  return Date.now() - createdAtMs > staleSeconds * 1000;
}

export default async function main(context: AppwriteFunctionContext) {
  return withHandler(context, async () => {
    const requesterId = getAuthenticatedUserId(context);
    if (!requesterId) {
      return fail(context, 401, 'AUTH_REQUIRED', 'Sign in before sending notifications.');
    }

    const request = parseJsonBody<FanoutRequest>(context.req.body);
    if (request.notificationType !== 'system_test' || !request.idempotencyKey) {
      return fail(context, 400, 'INVALID_FANOUT_REQUEST', 'Fanout requires system_test and an idempotency key.');
    }

    const config = loadConfig();
    const { databases } = createAdminClients(config);
    const messaging = getFirebaseMessaging(config);

    const existing = await databases.listDocuments(config.databaseId, config.notificationJobsCollectionId, [
      Query.equal('idempotencyKey', request.idempotencyKey),
      Query.equal('requestedByUserId', requesterId),
      Query.limit(1),
    ]);

    const existingJob = existing.documents[0];
    if (existingJob) {
      if (
        existingJob.status === 'processing' &&
        isStaleProcessingJob(existingJob.createdAt, config.jobStaleSeconds)
      ) {
        await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, existingJob.$id, {
          status: 'failed',
          completedAt: new Date().toISOString(),
        });
        return ok(context, { jobId: existingJob.jobId, status: 'failed' });
      }

      if (TERMINAL_STATUSES.has(String(existingJob.status)) || existingJob.status === 'processing') {
        return ok(context, { jobId: existingJob.jobId, status: existingJob.status });
      }

      return ok(context, { jobId: existingJob.jobId, status: existingJob.status });
    }

    const now = new Date().toISOString();
    const jobId = randomUUID();
    await databases.createDocument(
      config.databaseId,
      config.notificationJobsCollectionId,
      jobId,
      {
        jobId,
        idempotencyKey: request.idempotencyKey,
        requestedByUserId: requesterId,
        notificationType: 'system_test',
        title: TITLE,
        body: BODY,
        status: 'processing',
        targetCount: 0,
        providerAcceptedCount: 0,
        providerRejectedCount: 0,
        confirmedCount: 0,
        createdAt: now,
        completedAt: null,
      },
      [Permission.read(Role.user(requesterId))],
    );

    const tokenFilters = [
      Query.equal('platform', 'android'),
      Query.equal('isActive', true),
      Query.equal('tokenStatus', ['untested', 'valid']),
      Query.limit(config.fanoutLimit),
    ];
    const tokenResult = await databases.listDocuments(
      config.databaseId,
      config.deviceTokensCollectionId,
      config.includeSender ? tokenFilters : [...tokenFilters, Query.notEqual('userId', requesterId)],
    );
    const tokens = tokenResult.documents as unknown as DeviceTokenDocument[];

    let accepted = 0;
    let rejected = 0;

    for (const token of tokens) {
      const recipientRecordId = randomUUID();
      const receiptNonce = createReceiptNonce();
      const recipientPermissions = [
        Permission.read(Role.user(requesterId)),
        Permission.read(Role.user(token.userId)),
      ];

      try {
        const response = await messaging.send({
          token: token.fcmToken,
          notification: { title: TITLE, body: BODY },
          data: createNotificationData(jobId, recipientRecordId, receiptNonce),
          android: { priority: 'high', notification: { channelId: 'default' } },
        });
        accepted += 1;
        await databases.createDocument(
          config.databaseId,
          config.notificationRecipientsCollectionId,
          recipientRecordId,
          {
            recipientRecordId,
            jobId,
            recipientUserId: token.userId,
            deviceTokenId: token.$id,
            username: '',
            platform: 'android',
            providerMessageId: response,
            dispatchStatus: 'accepted',
            receiptStatus: 'not_confirmed',
            failureCode: null,
            failureMessage: null,
            receiptNonce,
            dispatchedAt: new Date().toISOString(),
            receivedAt: null,
            openedAt: null,
          },
          recipientPermissions,
        );
      } catch (error) {
        rejected += 1;
        const failureMessage = error instanceof Error ? error.message.slice(0, 500) : 'FCM send failed.';
        await databases.createDocument(
          config.databaseId,
          config.notificationRecipientsCollectionId,
          recipientRecordId,
          {
            recipientRecordId,
            jobId,
            recipientUserId: token.userId,
            deviceTokenId: token.$id,
            username: '',
            platform: 'android',
            providerMessageId: null,
            dispatchStatus: 'rejected',
            receiptStatus: 'not_confirmed',
            failureCode: 'FCM_SEND_FAILED',
            failureMessage,
            receiptNonce,
            dispatchedAt: new Date().toISOString(),
            receivedAt: null,
            openedAt: null,
          },
          recipientPermissions,
        );
      }
    }

    const status = rejected === 0 ? 'completed' : accepted > 0 ? 'partially_completed' : 'failed';
    await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, jobId, {
      status,
      targetCount: tokens.length,
      providerAcceptedCount: accepted,
      providerRejectedCount: rejected,
      completedAt: new Date().toISOString(),
    });

    return ok(context, { jobId, status });
  });
}
