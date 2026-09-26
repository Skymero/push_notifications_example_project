import { createHash, randomUUID, timingSafeEqual } from 'crypto';

export function createReceiptNonce() {
  return randomUUID();
}

export function deterministicId(...parts: string[]) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 36);
}

/** Bind the opaque FCM proof to the exact token used for this dispatch. */
export function hashReceiptNonce(nonce: string, token: string) {
  return createHash('sha256').update(JSON.stringify([nonce, token])).digest('hex');
}

export function matchesReceiptNonce(stored: unknown, nonce: string, token: string) {
  if (typeof stored !== 'string' || !/^[a-f0-9]{64}$/.test(stored)) return false;
  return timingSafeEqual(Buffer.from(stored, 'hex'), Buffer.from(hashReceiptNonce(nonce, token), 'hex'));
}

export function createNotificationData(jobId: string, recipientRecordId: string, receiptNonce: string) {
  return {
    schemaVersion: '1',
    jobId,
    recipientRecordId,
    notificationType: 'system_test',
    receiptNonce,
  };
}
