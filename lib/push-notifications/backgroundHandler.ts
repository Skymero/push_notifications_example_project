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
    backgroundRegistered = true;
  }
}

async function submitOrQueueReceipt(receipt: SubmitNotificationReceiptRequest) {
  try {
    const result = await submitNotificationReceipt(receipt);
    if (classifyReceiptSubmitResult(result) === 'retry') {
      await storePendingReceipt(receipt);
    }
  } catch (error) {
    if (classifyReceiptSubmitError(error) === 'retry') {
      await storePendingReceipt(receipt);
    }
  }
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

export async function retryPendingReceipts() {
  const pending = await loadPendingReceipts();

  for (const receipt of pending) {
    try {
      const result = await submitNotificationReceipt(receipt);
      const decision = classifyReceiptSubmitResult(result);
      if (decision === 'success' || decision === 'terminal') {
        await removePendingReceipt(receipt.idempotencyKey);
      }
      if (decision === 'retry') {
        await storePendingReceipt(receipt);
        return;
      }
    } catch (error) {
      const decision = classifyReceiptSubmitError(error);
      if (decision === 'terminal') {
        await removePendingReceipt(receipt.idempotencyKey);
        continue;
      }
      await storePendingReceipt(receipt);
      return;
    }
  }
}

export function registerForegroundNotificationHandlers() {
  const unsubscribeMessage = subscribeToForegroundMessages((message) =>
    processNotificationData(message.data, 'received'),
  );
  const unsubscribeOpened = subscribeToNotificationOpened((message) =>
    processNotificationData(message.data, 'opened'),
  );

  getInitialNotification().then((message) => {
    if (message) {
      void processNotificationData(message.data, 'opened');
    }
  });

  return () => {
    unsubscribeMessage();
    unsubscribeOpened();
  };
}
