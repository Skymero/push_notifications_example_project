import { createAdminClients, Query } from '../../../_shared/appwrite';
import { loadConfig } from '../../../_shared/env';
import { getFirebaseMessaging } from '../../../_shared/firebase';
import { dispatchNotification } from '../../../_shared/dispatch';
import { assertJobSchema, claimJob } from '../../../_shared/jobs';
import { fail, isBoundedString, isDocumentId, isRecord, ok, RequestError } from '../../../_shared/http';
import { inTransaction } from '../../../_shared/transactions';
import type { AppwriteFunctionContext } from '../../../_shared/http';

const TITLE = 'Receive validation';
const BODY = 'Confirming this Android device can receive push notifications.';

export async function handleReceiveValidation(context: AppwriteFunctionContext, userId: string, payload: unknown) {
  if (!isRecord(payload) || !isDocumentId(payload.deviceId) || !isBoundedString(payload.idempotencyKey)) {
    return fail(context, 400, 'INVALID_RECEIVE_VALIDATION_REQUEST', 'A valid device ID and idempotency key are required.');
  }
  const config = loadConfig();
  const { databases, users } = createAdminClients(config);
  const messaging = getFirebaseMessaging(config);
  const result = await databases.listDocuments(config.databaseId, config.deviceTokensCollectionId, [
    Query.equal('userId', userId), Query.equal('deviceId', payload.deviceId), Query.equal('platform', 'android'), Query.limit(1),
  ]);
  const token = result.documents[0];
  if (!token || !token.isActive || !token.fcmToken || token.permissionStatus !== 'granted' ||
    token.tokenStatus === 'invalid' || token.tokenStatus === 'revoked') {
    return fail(context, 400, 'DEVICE_RECORD_INACTIVE', 'No active Android device token is registered.');
  }
  await assertJobSchema(databases, config);
  const { job, claimed } = await claimJob(databases, config, { userId, idempotencyKey: payload.idempotencyKey,
    deviceId: payload.deviceId, type: 'receive_validation', title: TITLE, body: BODY });
  if (!claimed) {
    if (job.status === 'failed') return fail(context, 409, 'VALIDATION_FAILED', 'The previous validation failed. Start a new validation.');
    const previous = await databases.listDocuments(config.databaseId, config.notificationRecipientsCollectionId, [
      Query.equal('jobId', job.$id), Query.limit(1),
    ]);
    return ok(context, { color: 'yellow', code: 'RECEIPT_PENDING', message: 'Waiting for the existing validation receipt.',
      jobId: job.$id, recipientRecordId: previous.documents[0]?.$id });
  }

  const now = new Date().toISOString();
  await inTransaction(databases, async (transactionId) => {
    const current = await databases.getDocument({ databaseId: config.databaseId,
      collectionId: config.deviceTokensCollectionId, documentId: token.$id, transactionId });
    if (current.fcmToken !== token.fcmToken || !current.isActive || current.permissionStatus !== 'granted') {
      throw new RequestError(409, 'DEVICE_REGISTRATION_CHANGED', 'The device registration changed. Run validation again.');
    }
    if (!current.lastValidatedAt || Date.parse(String(current.lastValidatedAt)) <= Date.parse(String(job.createdAt))) {
      await databases.updateDocument({ databaseId: config.databaseId, collectionId: config.deviceTokensCollectionId,
        documentId: token.$id, transactionId,
        data: { receiveStatus: 'untested', lastValidatedAt: job.createdAt, updatedAt: now } });
    }
  });
  await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id, { targetCount: 1 });
  const account = await users.get(userId);
  const outcome = await dispatchNotification(databases, messaging, config, { jobId: job.$id, requesterId: userId,
    token: { $id: token.$id, userId, deviceId: String(token.deviceId), fcmToken: String(token.fcmToken) },
    title: TITLE, body: BODY, username: account.name || 'Android user' });
  await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id, {
    status: outcome.accepted ? 'completed' : 'failed', providerAcceptedCount: outcome.accepted ? 1 : 0,
    providerRejectedCount: outcome.accepted ? 0 : 1, completedAt: new Date().toISOString(),
  });
  if (!outcome.accepted) return fail(context, outcome.permanentFailure ? 400 : 503,
    outcome.permanentFailure ? 'FCM_TOKEN_INVALID' : 'FUNCTION_UNAVAILABLE',
    outcome.permanentFailure ? 'The Android token is no longer valid.' : 'The push provider is temporarily unavailable.');
  return ok(context, { color: 'yellow', code: 'RECEIPT_PENDING',
    message: 'FCM accepted the validation; waiting for a device receipt.', jobId: job.$id, recipientRecordId: outcome.recipientRecordId });
}
