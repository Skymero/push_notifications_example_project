import { createAdminClients } from '../../../_shared/appwrite';
import { loadAppwriteConfig } from '../../../_shared/env';
import { fail, isBoundedString, isDocumentId, isRecord, ok, RequestError } from '../../../_shared/http';
import { deterministicId, matchesReceiptNonce } from '../../../_shared/notificationPayload';
import { hasStatus, inTransaction } from '../../../_shared/transactions';
import type { AppwriteFunctionContext } from '../../../_shared/http';

export async function handleReceipt(context: AppwriteFunctionContext, userId: string, payload: unknown) {
  if (!isRecord(payload) || !isDocumentId(payload.jobId) || !isDocumentId(payload.recipientRecordId) ||
    !isDocumentId(payload.deviceId) || !isBoundedString(payload.idempotencyKey) ||
    !isBoundedString(payload.receiptNonce, 128) || !isBoundedString(payload.clientTimestamp, 64) ||
    !/^\d{4}-\d{2}-\d{2}T/.test(payload.clientTimestamp) || !Number.isFinite(Date.parse(payload.clientTimestamp)) ||
    !['received', 'displayed', 'opened'].includes(String(payload.eventType))) {
    return fail(context, 400, 'RECEIPT_MALFORMED', 'Receipt fields, timestamp, event type and nonce must be valid.');
  }
  const request = payload as Record<string, string>;
  const config = loadAppwriteConfig();
  const { databases } = createAdminClients(config);
  const databaseId = config.databaseId;
  const auditId = deterministicId('receipt', userId, request.idempotencyKey);
  const result = await inTransaction(databases, async (transactionId) => {
    const read = async (collectionId: string, documentId: string) =>
      databases.getDocument({ databaseId, collectionId, documentId, transactionId });
    const recipient = await read(config.notificationRecipientsCollectionId, request.recipientRecordId)
      .catch((error: unknown) => {
        if (hasStatus(error, 404)) throw new RequestError(403, 'RECEIPT_UNAUTHORIZED', 'The receipt target is unavailable.');
        throw error;
      });
    if (recipient.jobId !== request.jobId || recipient.recipientUserId !== userId) {
      throw new RequestError(403, 'RECEIPT_UNAUTHORIZED', 'Receipt does not belong to this user.');
    }
    const token = await read(config.deviceTokensCollectionId, String(recipient.deviceTokenId));
    if (token.userId !== userId || token.deviceId !== request.deviceId || !token.isActive ||
      token.permissionStatus !== 'granted' || token.tokenStatus === 'invalid' || token.tokenStatus === 'revoked' ||
      !matchesReceiptNonce(recipient.receiptNonce, request.receiptNonce, String(token.fcmToken))) {
      throw new RequestError(403, 'RECEIPT_UNAUTHORIZED', 'Receipt does not match the current active device and delivery proof.');
    }
    const job = await read(config.notificationJobsCollectionId, request.jobId);
    const audit = await read(config.notificationReceiptsCollectionId, auditId)
      .catch((error: unknown) => { if (hasStatus(error, 404)) return null; throw error; });
    if (audit) {
      if (audit.jobId !== request.jobId || audit.recipientRecordId !== request.recipientRecordId ||
        audit.recipientUserId !== userId || audit.deviceId !== request.deviceId || audit.eventType !== request.eventType) {
        throw new RequestError(409, 'RECEIPT_IDEMPOTENCY_CONFLICT', 'Receipt key was already used for another event.');
      }
      return { ok: true, duplicate: true };
    }
    const serverTimestamp = new Date().toISOString();
    await databases.createDocument({ databaseId, collectionId: config.notificationReceiptsCollectionId,
      documentId: auditId, transactionId, permissions: [], data: {
        receiptId: auditId, jobId: request.jobId, recipientRecordId: request.recipientRecordId,
        recipientUserId: userId, deviceId: request.deviceId, eventType: request.eventType,
        clientTimestamp: request.clientTimestamp, serverTimestamp,
      } });
    const wasConfirmed = recipient.receiptStatus === 'received' || recipient.receiptStatus === 'opened';
    const opened = recipient.receiptStatus === 'opened' || request.eventType === 'opened';
    await databases.updateDocument({ databaseId, collectionId: config.notificationRecipientsCollectionId,
      documentId: request.recipientRecordId, transactionId, data: {
        receiptStatus: opened ? 'opened' : 'received', receivedAt: recipient.receivedAt || serverTimestamp,
        ...(request.eventType === 'opened' ? { openedAt: recipient.openedAt || serverTimestamp } : {}),
      } });
    const isCurrentValidation = !token.lastValidatedAt || Date.parse(String(job.createdAt)) >= Date.parse(String(token.lastValidatedAt));
    await databases.updateDocument({ databaseId, collectionId: config.deviceTokensCollectionId,
      documentId: token.$id, transactionId, data: { tokenStatus: 'valid',
        ...(isCurrentValidation ? { receiveStatus: 'verified' } : {}),
        lastReceivedAt: serverTimestamp, updatedAt: serverTimestamp,
      } });
    if (!wasConfirmed) {
      await databases.incrementDocumentAttribute({ databaseId, collectionId: config.notificationJobsCollectionId,
        documentId: request.jobId, attribute: 'confirmedCount', value: 1, transactionId });
    }
    return { ok: true };
  });
  return ok(context, result);
}
