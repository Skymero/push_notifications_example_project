import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  QueuedNotificationReceipt,
  SubmitNotificationReceiptRequest,
} from '@/types/notifications';

const STORAGE_KEY = '@push-notifications/pending-receipts';
const MAX_QUEUE_SIZE = 50;

export async function loadPendingReceipts(): Promise<QueuedNotificationReceipt[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function storePendingReceipt(receipt: SubmitNotificationReceiptRequest) {
  const current = await loadPendingReceipts();
  const now = new Date().toISOString();
  const previous = current.find((item) => item.idempotencyKey === receipt.idempotencyKey);
  const deduped = current.filter((item) => item.idempotencyKey !== receipt.idempotencyKey);
  const next = [
    ...deduped,
    {
      ...receipt,
      firstAttemptAt: previous?.firstAttemptAt ?? now,
      lastAttemptAt: now,
      attemptCount: (previous?.attemptCount ?? 0) + 1,
    },
  ].slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function removePendingReceipt(idempotencyKey: string) {
  const current = await loadPendingReceipts();
  const next = current.filter((item) => item.idempotencyKey !== idempotencyKey);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
