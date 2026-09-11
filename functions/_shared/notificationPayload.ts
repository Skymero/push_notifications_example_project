import { randomUUID } from 'crypto';

export function createReceiptNonce() {
  return randomUUID();
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
