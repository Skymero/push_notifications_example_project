import {
  createReceiptIdempotencyKey,
  parseNotificationData,
} from '@/lib/push-notifications/payload';

describe('notification payload parsing', () => {
  it('accepts the supported schema', () => {
    const payload = parseNotificationData({
      schemaVersion: '1',
      jobId: 'job-1',
      recipientRecordId: 'recipient-1',
      notificationType: 'system_test',
      receiptNonce: 'nonce-1',
    });

    expect(payload).toEqual({
      schemaVersion: '1',
      jobId: 'job-1',
      recipientRecordId: 'recipient-1',
      notificationType: 'system_test',
      receiptNonce: 'nonce-1',
    });
  });

  it('rejects unknown schemas', () => {
    expect(
      parseNotificationData({
        schemaVersion: '2',
        jobId: 'job-1',
        recipientRecordId: 'recipient-1',
        notificationType: 'system_test',
      }),
    ).toBeNull();
  });

  it('creates stable receipt idempotency keys', () => {
    expect(
      createReceiptIdempotencyKey(
        {
          schemaVersion: '1',
          jobId: 'job-1',
          recipientRecordId: 'recipient-1',
          notificationType: 'system_test',
        },
        'received',
      ),
    ).toBe('job-1:recipient-1:received');
  });
});
