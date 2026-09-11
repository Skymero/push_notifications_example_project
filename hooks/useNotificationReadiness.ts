import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import {
  configureNotificationChannels,
  getNotificationPermissionStatus,
  requestNotificationPermission,
  subscribeToTokenRefresh,
} from '@/lib/push-notifications/firebaseMessaging';
import {
  getOrCreateDeviceId,
  syncCurrentDeviceToken,
  validateLocalAndDatabaseToken,
} from '@/lib/push-notifications/deviceRegistration';
import {
  getCurrentDeviceTokenRecord,
  invokeReceiveValidation,
  invokeSendValidation,
} from '@/lib/appwrite/notifications';
import type { AuthUser } from '@/lib/appwrite/auth';
import type { ReadinessState } from '@/types/notifications';

const untestedSend: ReadinessState = {
  color: 'yellow',
  code: 'SEND_UNTESTED',
  message: 'Send capability has not been tested yet.',
};

const untestedReceive: ReadinessState = {
  color: 'yellow',
  code: 'RECEIVE_UNTESTED',
  message: 'This device has not confirmed receipt of a validation notification yet.',
};

async function waitForVerifiedReceipt(userId: string, deviceId: string, timeoutMs = 60000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const record = await getCurrentDeviceTokenRecord(userId, deviceId);
    if (record?.receiveStatus === 'verified') {
      return {
        color: 'green' as const,
        code: 'RECEIVE_CONFIRMED',
        message: 'This Android device confirmed receipt of a validation notification.',
      };
    }

    if (record?.receiveStatus === 'failed' || record?.receiveStatus === 'expired') {
      return {
        color: 'red' as const,
        code: `RECEIVE_${record.receiveStatus.toUpperCase()}`,
        message: 'Receive validation did not complete on this Android device.',
      };
    }

    await new Promise((resolve) => setTimeout(resolve, 2500));
  }

  return {
    color: 'yellow' as const,
    code: 'RECEIPT_PENDING',
    message: 'Validation notification was sent; waiting for this Android device to confirm receipt.',
  };
}

export function useNotificationReadiness(user: AuthUser | null) {
  const [sendStatus, setSendStatus] = useState<ReadinessState>(untestedSend);
  const [receiveStatus, setReceiveStatus] = useState<ReadinessState>(untestedReceive);
  const [isTesting, setIsTesting] = useState(false);

  const testSendCapability = useCallback(async () => {
    if (!user) {
      setSendStatus({
        color: 'red',
        code: 'AUTH_REQUIRED',
        message: 'Sign in before sending notifications.',
      });
      return;
    }

    setSendStatus({ color: 'yellow', code: 'SEND_TESTING', message: 'Checking backend send access.' });

    try {
      const result = await invokeSendValidation();
      setSendStatus(result);
    } catch {
      setSendStatus({
        color: 'red',
        code: 'FUNCTION_UNAVAILABLE',
        message: 'The send validation function is unavailable or not configured.',
      });
    }
  }, [user]);

  const testReceiveCapability = useCallback(async () => {
    if (!user) {
      setReceiveStatus({
        color: 'red',
        code: 'AUTH_REQUIRED',
        message: 'Sign in before registering this device.',
      });
      return;
    }

    setReceiveStatus({
      color: 'yellow',
      code: 'RECEIVE_TESTING',
      message: 'Checking notification permission and device token.',
    });

    try {
      await configureNotificationChannels();
      const permission = await getNotificationPermissionStatus();

      await syncCurrentDeviceToken(user.$id);

      if (permission === 'not_requested') {
        setReceiveStatus({
          color: 'yellow',
          code: 'PERMISSION_NOT_REQUESTED',
          message: 'Use Android notification setup before receiving validation notifications.',
        });
        return;
      }

      if (permission === 'denied') {
        setReceiveStatus({
          color: 'red',
          code: 'PERMISSION_DENIED',
          message: 'Notification permission is denied. Open system settings to enable it.',
        });
        return;
      }

      const tokenCheck = await validateLocalAndDatabaseToken(user.$id);
      if (!tokenCheck.ok) {
        setReceiveStatus({
          color: 'yellow',
          code: tokenCheck.code,
          message: 'The device token was synced and needs receive validation.',
        });
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const result = await invokeReceiveValidation(
        deviceId,
        `${user.$id}:${deviceId}:receive-validation:${Date.now()}`,
      );
      if (result.color === 'red') {
        setReceiveStatus(result);
        return;
      }

      setReceiveStatus({
        color: 'yellow',
        code: 'RECEIPT_PENDING',
        message: 'Validation notification was accepted by FCM; waiting for device receipt.',
      });
      setReceiveStatus(await waitForVerifiedReceipt(user.$id, deviceId));
    } catch {
      setReceiveStatus({
        color: 'yellow',
        code: 'RECEIVE_UNTESTED',
        message: 'Receive validation could not complete. Retry after configuration is available.',
      });
    }
  }, [user]);

  const setupAndroidNotifications = useCallback(async () => {
    if (!user) {
      return;
    }

    setIsTesting(true);
    try {
      await configureNotificationChannels();
      const permission = await requestNotificationPermission();
      await syncCurrentDeviceToken(user.$id);

      if (permission === 'denied') {
        setReceiveStatus({
          color: 'red',
          code: 'PERMISSION_DENIED',
          message: 'Notification permission is denied. Open system settings to enable it.',
        });
        return;
      }

      await testReceiveCapability();
    } finally {
      setIsTesting(false);
    }
  }, [testReceiveCapability, user]);

  const refreshReadiness = useCallback(async () => {
    setIsTesting(true);
    try {
      await Promise.all([testSendCapability(), testReceiveCapability()]);
    } finally {
      setIsTesting(false);
    }
  }, [testReceiveCapability, testSendCapability]);

  useEffect(() => {
    if (!user) {
      setSendStatus(untestedSend);
      setReceiveStatus(untestedReceive);
      return;
    }

    void refreshReadiness();

    const unsubscribeToken = subscribeToTokenRefresh(async () => {
      await syncCurrentDeviceToken(user.$id);
      setReceiveStatus({
        color: 'yellow',
        code: 'TOKEN_RESYNC_REQUIRED',
        message: 'The FCM token changed and needs receive validation again.',
      });
    });

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshReadiness();
      }
    });

    return () => {
      unsubscribeToken();
      subscription.remove();
    };
  }, [refreshReadiness, user]);

  return useMemo(
    () => ({
      sendStatus,
      receiveStatus,
      isTesting,
      testSendCapability,
      testReceiveCapability,
      setupAndroidNotifications,
      refreshReadiness,
    }),
    [
      isTesting,
      receiveStatus,
      refreshReadiness,
      sendStatus,
      setupAndroidNotifications,
      testReceiveCapability,
      testSendCapability,
    ],
  );
}
