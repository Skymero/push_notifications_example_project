import { randomUUID } from 'crypto';
import type { Databases } from 'node-appwrite';
import type { Messaging } from 'firebase-admin/messaging';
import type { FunctionConfig } from './env';
import { Permission, Role } from './appwrite';
import { classifyFirebaseError } from './firebase';
import { createNotificationData, createReceiptNonce, hashReceiptNonce } from './notificationPayload';
import { inTransaction } from './transactions';

export type DispatchDevice = { $id: string; userId: string; deviceId: string; fcmToken: string };

/** Persist proof and recipient binding before FCM can deliver; never overwrite receipt state afterward. */
export async function dispatchNotification(databases: Databases, messaging: Messaging, config: FunctionConfig,
  input: { jobId: string; requesterId: string; token: DispatchDevice; title: string; body: string; username: string },
) {
  const recipientRecordId = randomUUID();
  const nonce = createReceiptNonce();
  const permissions = [...new Set([Permission.read(Role.user(input.requesterId)),
    Permission.read(Role.user(input.token.userId))])];
  await databases.createDocument(config.databaseId, config.notificationRecipientsCollectionId, recipientRecordId, {
    recipientRecordId, jobId: input.jobId, recipientUserId: input.token.userId, deviceTokenId: input.token.$id,
    username: input.username, platform: 'android', providerMessageId: null, dispatchStatus: 'pending',
    receiptStatus: 'not_confirmed', failureCode: null, failureMessage: null,
    receiptNonce: hashReceiptNonce(nonce, input.token.fcmToken), dispatchedAt: null, receivedAt: null, openedAt: null,
  }, permissions);

  let providerMessageId: string | null = null;
  let failure: ReturnType<typeof classifyFirebaseError> | null = null;
  try {
    providerMessageId = await messaging.send({ token: input.token.fcmToken,
      notification: { title: input.title, body: input.body },
      data: createNotificationData(input.jobId, recipientRecordId, nonce),
      android: { priority: 'high', notification: { channelId: 'default' } },
    });
  } catch (error) { failure = classifyFirebaseError(error); }

  // Persistence failures must propagate as retryable backend errors, never as invalid-token claims.
  await databases.updateDocument(config.databaseId, config.notificationRecipientsCollectionId, recipientRecordId, {
    providerMessageId, dispatchStatus: failure ? 'rejected' : 'accepted',
    failureCode: failure?.code ?? null, failureMessage: failure?.message ?? null,
    dispatchedAt: new Date().toISOString(),
  });
  if (failure?.permanent) {
    await inTransaction(databases, async (transactionId) => {
      const current = await databases.getDocument({ databaseId: config.databaseId,
        collectionId: config.deviceTokensCollectionId, documentId: input.token.$id, transactionId });
      if (current.fcmToken === input.token.fcmToken) {
        await databases.updateDocument({ databaseId: config.databaseId, collectionId: config.deviceTokensCollectionId,
          documentId: input.token.$id, transactionId,
          data: { tokenStatus: 'invalid', receiveStatus: 'failed', isActive: false, updatedAt: new Date().toISOString() } });
      }
    });
  }
  return { recipientRecordId, accepted: !failure, permanentFailure: failure?.permanent ?? false };
}
