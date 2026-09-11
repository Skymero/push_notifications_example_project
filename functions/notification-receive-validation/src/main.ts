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

type ReceiveValidationRequest = {
  deviceId?: string;
  idempotencyKey?: string;
};

const TITLE = 'Receive validation';
const BODY = 'Confirming this Android device can receive push notifications.';

export default async function main(context: AppwriteFunctionContext) {
  return withHandler(context, async () => {
    const userId = getAuthenticatedUserId(context);
    if (!userId) {
      return fail(context, 401, 'AUTH_REQUIRED', 'Sign in before validating this device.');
    }

    const request = parseJsonBody<ReceiveValidationRequest>(context.req.body);
    if (!request.deviceId || !request.idempotencyKey) {
      return fail(context, 400, 'INVALID_RECEIVE_VALIDATION_REQUEST', 'Device ID and idempotency key are required.');
    }

    const config = loadConfig();
    const { databases } = createAdminClients(config);
    const messaging = getFirebaseMessaging(config);
    const now = new Date().toISOString();

    const tokenResult = await databases.listDocuments(config.databaseId, config.deviceTokensCollectionId, [
      Query.equal('userId', userId),
      Query.equal('deviceId', request.deviceId),
      Query.equal('platform', 'android'),
      Query.limit(1),
    ]);
    const token = tokenResult.documents[0];

    if (!token || !token.isActive || !token.fcmToken) {
      return fail(context, 400, 'DEVICE_RECORD_INACTIVE', 'No active Android device token is registered.');
    }

    await databases.updateDocument(config.databaseId, config.deviceTokensCollectionId, token.$id, {
      receiveStatus: 'untested',
      lastValidatedAt: now,
      updatedAt: now,
    });

    const jobId = randomUUID();
    const recipientRecordId = randomUUID();
    const receiptNonce = createReceiptNonce();

    await databases.createDocument(
      config.databaseId,
      config.notificationJobsCollectionId,
      jobId,
      {
        jobId,
        idempotencyKey: request.idempotencyKey,
        requestedByUserId: userId,
        notificationType: 'receive_validation',
        title: TITLE,
        body: BODY,
        status: 'processing',
        targetCount: 1,
        providerAcceptedCount: 0,
        providerRejectedCount: 0,
        confirmedCount: 0,
        createdAt: now,
        completedAt: null,
      },
      [Permission.read(Role.user(userId))],
    );

    try {
      const providerMessageId = await messaging.send({
        token: token.fcmToken,
        notification: { title: TITLE, body: BODY },
        data: createNotificationData(jobId, recipientRecordId, receiptNonce),
        android: { priority: 'high', notification: { channelId: 'default' } },
      });

      await databases.createDocument(
        config.databaseId,
        config.notificationRecipientsCollectionId,
        recipientRecordId,
        {
          recipientRecordId,
          jobId,
          recipientUserId: userId,
          deviceTokenId: token.$id,
          username: '',
          platform: 'android',
          providerMessageId,
          dispatchStatus: 'accepted',
          receiptStatus: 'not_confirmed',
          failureCode: null,
          failureMessage: null,
          receiptNonce,
          dispatchedAt: new Date().toISOString(),
          receivedAt: null,
          openedAt: null,
        },
        [Permission.read(Role.user(userId))],
      );
      await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, jobId, {
        status: 'completed',
        providerAcceptedCount: 1,
        providerRejectedCount: 0,
        completedAt: new Date().toISOString(),
      });

      return ok(context, {
        color: 'yellow',
        code: 'RECEIPT_PENDING',
        message: 'Validation notification was accepted by FCM; waiting for device receipt.',
        jobId,
        recipientRecordId,
      });
    } catch {
      await databases.updateDocument(config.databaseId, config.deviceTokensCollectionId, token.$id, {
        tokenStatus: 'invalid',
        receiveStatus: 'failed',
        updatedAt: new Date().toISOString(),
      });
      await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, jobId, {
        status: 'failed',
        providerAcceptedCount: 0,
        providerRejectedCount: 1,
        completedAt: new Date().toISOString(),
      });
      return fail(context, 400, 'FCM_TOKEN_INVALID', 'FCM rejected the Android token during receive validation.');
    }
  });
}
