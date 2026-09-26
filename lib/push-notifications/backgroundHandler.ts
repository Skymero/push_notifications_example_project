import {
  createReceiptIdempotencyKey,
  parseNotificationData,
} from '@/lib/push-notifications/payload';
import { submitNotificationReceipt } from '@/lib/appwrite/notifications';
import { getOrCreateDeviceId } from '@/lib/push-notifications/deviceRegistration';
import {
  getInitialNotification,
  subscribeToForegroundMessages,
  subscribeToNotificationOpened,
} from '@/lib/push-notifications/firebaseMessaging';
import {
  loadPendingReceipts,
  removePendingReceipt,
  storePendingReceipt,
} from '@/lib/push-notifications/retryQueue';
import {
  classifyReceiptSubmitError,
  classifyReceiptSubmitResult,
} from '@/lib/push-notifications/receiptRetryPolicy';
import * as Notifications from 'expo-notifications';
import { getReceiptUser } from '@/lib/push-notifications/retryQueue';
import type { ReceiptEventType, SubmitNotificationReceiptRequest } from '@/types/notifications';

let backgroundRegistered = false;

export function registerBackgroundMessagingHandler() {
  if (backgroundRegistered) {
    return;
  }

  try {
    // React Native Firebase must register background handlers during module startup.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messaging = require('@react-native-firebase/messaging').default;
    messaging().setBackgroundMessageHandler((message: { data?: Record<string, unknown> }) =>
      processNotificationData(message.data, 'received'),
    );
    backgroundRegistered = true;
  } catch {
    // Missing Firebase config is retried if registration is called after setup.
  }
}

async function submitOrQueueReceipt(receipt: SubmitNotificationReceiptRequest) {
  const ownerUserId = await getReceiptUser();
  if (!ownerUserId) return;
  // Persist first: Android may suspend the process during the network request.
  await storePendingReceipt(receipt, ownerUserId);
  await retryPendingReceipts();
}

export async function processNotificationData(
  data: Record<string, unknown> | undefined,
  eventType: ReceiptEventType,
) {
  const payload = parseNotificationData(data);
  if (!payload) {
    return;
  }

  const deviceId = await getOrCreateDeviceId();
  await submitOrQueueReceipt({
    jobId: payload.jobId,
    recipientRecordId: payload.recipientRecordId,
    deviceId,
    eventType,
    clientTimestamp: new Date().toISOString(),
    idempotencyKey: createReceiptIdempotencyKey(payload, eventType),
    receiptNonce: payload.receiptNonce,
  });
}

let retryFlight: Promise<void> | null = null;

export function retryPendingReceipts(): Promise<void> {
  if (retryFlight) return retryFlight;
  retryFlight = flushPendingReceipts().finally(() => { retryFlight = null; });
  return retryFlight;
}

async function flushPendingReceipts() {
  const ownerUserId = await getReceiptUser();
  if (!ownerUserId) return;
  const pending = await loadPendingReceipts(ownerUserId);

  for (const receipt of pending) {
    if (await getReceiptUser() !== ownerUserId) return;
    try {
      const { ownerUserId: _owner, firstAttemptAt: _first, lastAttemptAt: _last, attemptCount: _count, ...request } = receipt;
      const result = await submitNotificationReceipt(request);
      if (await getReceiptUser() !== ownerUserId) return;
      const decision = classifyReceiptSubmitResult(result);
      if (decision === 'success' || decision === 'terminal') {
        await removePendingReceipt(receipt.idempotencyKey, ownerUserId);
      }
      if (decision === 'retry') {
        await storePendingReceipt(receipt, ownerUserId);
        return;
      }
    } catch (error) {
      if (await getReceiptUser() !== ownerUserId) return;
      const decision = classifyReceiptSubmitError(error);
      if (decision === 'terminal') {
        await removePendingReceipt(receipt.idempotencyKey, ownerUserId);
        continue;
      }
      await storePendingReceipt(receipt, ownerUserId);
      return;
    }
  }
}

export function registerForegroundNotificationHandlers() {
  let disposed = false;
  const safelyProcess = (data: Record<string, unknown> | undefined, event: ReceiptEventType) =>
    processNotificationData(data, event).catch(() => undefined);
  Notifications.setNotificationHandler({ handleNotification: async () => ({
    shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false,
  }) });
  const unsubscribeMessage = subscribeToForegroundMessages(async (message) => {
    // Receipt work begins immediately but must not delay the banner for a push
    // that has already reached this device.
    const receiptWork = safelyProcess(message.data, 'received');
    if (!disposed && message.notification && parseNotificationData(message.data)) {
      try {
        await Notifications.scheduleNotificationAsync({ content: {
          title: message.notification.title, body: message.notification.body,
          data: message.data, sound: 'default',
        }, trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, channelId: 'default' } });
      } catch { /* The received receipt remains valid if local presentation fails. */ }
    }
    await receiptWork;
  });
  const unsubscribeOpened = subscribeToNotificationOpened((message) =>
    safelyProcess(message.data, 'opened'),
  );
  const localResponse = Notifications.addNotificationResponseReceivedListener((response) => {
    void safelyProcess(response.notification.request.content.data, 'opened');
  });

  getInitialNotification().then((message) => {
    if (message && !disposed) {
      void safelyProcess(message.data, 'opened');
    }
  }).catch(() => undefined);
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (response && !disposed) void safelyProcess(response.notification.request.content.data, 'opened');
  }).catch(() => undefined);

  return () => {
    disposed = true;
    unsubscribeMessage();
    unsubscribeOpened();
    localResponse.remove();
  };
}
