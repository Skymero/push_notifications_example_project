import type { NotificationData } from '@/types/notifications';

export function parseNotificationData(data: Record<string, unknown> | undefined): NotificationData | null {
  if (!data) {
    return null;
  }

  if (
    data.schemaVersion !== '1' ||
    typeof data.jobId !== 'string' ||
    typeof data.recipientRecordId !== 'string' ||
    data.notificationType !== 'system_test'
  ) {
    return null;
  }

  return {
    schemaVersion: '1',
    jobId: data.jobId,
    recipientRecordId: data.recipientRecordId,
    notificationType: 'system_test',
    receiptNonce: typeof data.receiptNonce === 'string' ? data.receiptNonce : undefined,
  };
}

export function createReceiptIdempotencyKey(payload: NotificationData, eventType: string) {
  return `${payload.jobId}:${payload.recipientRecordId}:${eventType}`;
}
