import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QueuedNotificationReceipt, SubmitNotificationReceiptRequest } from '@/types/notifications';

const STORAGE_KEY = '@push-notifications/pending-receipts';
const USER_KEY = '@push-notifications/receipt-user';
const MAX_QUEUE_SIZE = 50;
let mutation: Promise<unknown> = Promise.resolve();

export async function setReceiptUser(userId: string | null) {
  if (userId) await AsyncStorage.setItem(USER_KEY, userId);
  else await AsyncStorage.removeItem(USER_KEY);
}

export function getReceiptUser() { return AsyncStorage.getItem(USER_KEY); }

async function readQueue(): Promise<QueuedNotificationReceipt[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    // Old unscoped entries cannot safely be attributed after an account switch.
    return Array.isArray(parsed) ? parsed.filter((item) => item &&
      typeof item.ownerUserId === 'string' && typeof item.idempotencyKey === 'string') : [];
  } catch { return []; }
}

export async function loadPendingReceipts(ownerUserId: string): Promise<QueuedNotificationReceipt[]> {
  await mutation;
  return (await readQueue()).filter((item) => item.ownerUserId === ownerUserId);
}

function mutateQueue(update: (current: QueuedNotificationReceipt[]) => QueuedNotificationReceipt[]) {
  const next = mutation.then(async () => {
    const current = await readQueue();
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(update(current)));
  });
  mutation = next.catch(() => undefined);
  return next;
}

export function storePendingReceipt(receipt: SubmitNotificationReceiptRequest, ownerUserId: string) {
  return mutateQueue((current) => {
    const now = new Date().toISOString();
    const matches = (item: QueuedNotificationReceipt) => item.ownerUserId === ownerUserId && item.idempotencyKey === receipt.idempotencyKey;
    const previous = current.find(matches);
    return [...current.filter((item) => !matches(item)), {
      ...receipt, ownerUserId,
      firstAttemptAt: previous?.firstAttemptAt ?? now,
      lastAttemptAt: now,
      attemptCount: (previous?.attemptCount ?? 0) + 1,
    }].slice(-MAX_QUEUE_SIZE);
  });
}

export function removePendingReceipt(idempotencyKey: string, ownerUserId: string) {
  return mutateQueue((current) => current.filter((item) =>
    item.ownerUserId !== ownerUserId || item.idempotencyKey !== idempotencyKey));
}
