import { createAdminClients, ID, Query } from '../../../_shared/appwrite';
import { loadConfig } from '../../../_shared/env';
import { fail, ok } from '../../../_shared/http';
import type { AppwriteFunctionContext } from '../../../_shared/http';
import type { ReceiptPayload } from '../types';

export async function handleReceipt(
  context: AppwriteFunctionContext,
  userId: string,
  payload: unknown,
) {
  const request = (payload ?? {}) as ReceiptPayload;
  if (
    !request.jobId ||
    !request.recipientRecordId ||
    !request.deviceId ||
    !request.eventType ||
    !request.clientTimestamp ||
    !request.idempotencyKey
  ) {
    return fail(context, 400, 'RECEIPT_MALFORMED', 'Receipt request is missing required fields.');
  }

  const config = loadConfig();
  const { databases } = createAdminClients(config);

  const duplicate = await databases.listDocuments(config.databaseId, config.notificationReceiptsCollectionId, [
    Query.equal('receiptId', request.idempotencyKey),
    Query.limit(1),
  ]);
  if (duplicate.documents[0]) {
    return ok(context, { ok: true, duplicate: true });
  }

  const recipient = await databases.getDocument(
    config.databaseId,
    config.notificationRecipientsCollectionId,
    request.recipientRecordId,
  );

  if (recipient.jobId !== request.jobId || recipient.recipientUserId !== userId) {
    return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt does not belong to this user.');
  }

  if (recipient.receiptNonce && recipient.receiptNonce !== request.receiptNonce) {
    return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt validation nonce did not match.');
  }

  const deviceToken = await databases.getDocument(
    config.databaseId,
    config.deviceTokensCollectionId,
    recipient.deviceTokenId,
  );

  if (deviceToken.userId !== userId || deviceToken.deviceId !== request.deviceId || !deviceToken.isActive) {
    return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt device is not the active recipient device.');
  }

  const serverTimestamp = new Date().toISOString();
  await databases.createDocument(config.databaseId, config.notificationReceiptsCollectionId, ID.unique(), {
    receiptId: request.idempotencyKey,
    jobId: request.jobId,
    recipientRecordId: request.recipientRecordId,
    recipientUserId: userId,
    deviceId: request.deviceId,
    eventType: request.eventType,
    clientTimestamp: request.clientTimestamp,
    serverTimestamp,
  });

  const recipientUpdate =
    request.eventType === 'opened'
      ? { receiptStatus: 'opened', openedAt: serverTimestamp }
      : { receiptStatus: 'received', receivedAt: serverTimestamp };
  await databases.updateDocument(
    config.databaseId,
    config.notificationRecipientsCollectionId,
    request.recipientRecordId,
    recipientUpdate,
  );
  await databases.updateDocument(config.databaseId, config.deviceTokensCollectionId, recipient.deviceTokenId, {
    receiveStatus: 'verified',
    tokenStatus: 'valid',
    lastReceivedAt: serverTimestamp,
    updatedAt: serverTimestamp,
  });

  if (recipient.receiptStatus !== 'received' && recipient.receiptStatus !== 'opened') {
    const job = await databases.getDocument(config.databaseId, config.notificationJobsCollectionId, request.jobId);
    await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, request.jobId, {
      confirmedCount: Number(job.confirmedCount ?? 0) + 1,
    });
  }

  return ok(context, { ok: true });
}
