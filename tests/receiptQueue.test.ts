const mockStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { mockStorage.set(key, value); }),
  removeItem: jest.fn(async (key: string) => { mockStorage.delete(key); }),
}));

import { loadPendingReceipts, storePendingReceipt } from '@/lib/push-notifications/retryQueue';

beforeEach(() => mockStorage.clear());

test('concurrent receipts are serialized instead of overwriting each other', async () => {
  const base = { jobId: 'job-one', deviceId: 'device-one', eventType: 'received' as const,
    clientTimestamp: new Date().toISOString(), receiptNonce: 'nonce' };
  await Promise.all([
    storePendingReceipt({ ...base, recipientRecordId: 'recipient-one', idempotencyKey: 'event-one' }, 'user-one'),
    storePendingReceipt({ ...base, recipientRecordId: 'recipient-two', idempotencyKey: 'event-two' }, 'user-one'),
  ]);
  expect((await loadPendingReceipts('user-one')).map((item) => item.idempotencyKey).sort())
    .toEqual(['event-one', 'event-two']);
  expect(await loadPendingReceipts('user-two')).toEqual([]);
});
