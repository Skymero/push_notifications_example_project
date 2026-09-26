import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  configureNotificationChannels, ensureFirebaseInitialized, getNotificationPermissionStatus,
  requestNotificationPermission, subscribeToTokenRefresh,
} from '@/lib/push-notifications/firebaseMessaging';
import { syncCurrentDeviceToken, validateLocalAndDatabaseToken } from '@/lib/push-notifications/deviceRegistration';
import { getCurrentDeviceTokenRecord, invokeReceiveValidation, invokeSendValidation } from '@/lib/appwrite/notifications';
import { retryPendingReceipts } from '@/lib/push-notifications/backgroundHandler';
import type { AuthUser } from '@/lib/appwrite/auth';
import type { ReadinessState } from '@/types/notifications';

const untestedSend: ReadinessState = {
  color: 'yellow', code: 'SEND_UNTESTED', message: 'Send capability has not been tested yet.',
};
const untestedReceive: ReadinessState = {
  color: 'yellow', code: 'RECEIVE_UNTESTED',
  message: 'This device has not confirmed receipt of a validation notification yet.',
};
const pendingReceive: ReadinessState = {
  color: 'yellow', code: 'RECEIPT_PENDING',
  message: 'Validation was sent; waiting for this Android device to confirm receipt.',
};

export function useNotificationReadiness(user: AuthUser | null) {
  const userId = user?.$id;
  const [sendStatus, setSendStatus] = useState<ReadinessState>(untestedSend);
  const [receiveStatus, setReceiveStatus] = useState<ReadinessState>(untestedReceive);
  const [isTesting, setIsTesting] = useState(false);
  const currentUser = useRef(userId);
  currentUser.current = userId;
  const generation = useRef(0);
  const flight = useRef<Promise<void> | null>(null);

  const runReadiness = useCallback((requestPermission = false) => {
    if (flight.current) return flight.current;
    if (!userId) return Promise.resolve();
    const run = ++generation.current;
    const isCurrent = () => generation.current === run && currentUser.current === userId;
    const setReceive = (status: ReadinessState) => { if (isCurrent()) setReceiveStatus(status); };
    setIsTesting(true);
    setSendStatus({ color: 'yellow', code: 'SEND_TESTING', message: 'Checking backend send access.' });
    setReceive({ color: 'yellow', code: 'RECEIVE_TESTING', message: 'Checking permission and device registration.' });

    const testSend = async () => {
      try {
        const status = await invokeSendValidation();
        if (isCurrent()) setSendStatus(status);
      } catch {
        if (isCurrent()) setSendStatus({
          color: 'red', code: 'FUNCTION_UNAVAILABLE',
          message: 'Backend send validation failed. Check the two Appwrite function deployments.',
        });
      }
    };
    const testReceive = async () => {
      try {
        await configureNotificationChannels();
        const permission = requestPermission
          ? await requestNotificationPermission() : await getNotificationPermissionStatus();
        if (!isCurrent()) return;
        if (!await ensureFirebaseInitialized()) {
          setReceive({ color: 'yellow', code: 'FIREBASE_NOT_INITIALIZED',
            message: 'Install a native Android build with Firebase configuration to receive notifications.' });
          return;
        }
        if (!isCurrent()) return;
        await syncCurrentDeviceToken(userId);
        if (!isCurrent()) return;
        if (permission !== 'granted') {
          setReceive({
            color: permission === 'denied' ? 'red' : 'yellow',
            code: permission === 'denied' ? 'PERMISSION_DENIED' : 'PERMISSION_NOT_REQUESTED',
            message: permission === 'denied'
              ? 'Notifications are denied. Open system settings to enable them.'
              : 'Use Android notification setup to allow notifications.',
          });
          return;
        }
        const token = await validateLocalAndDatabaseToken(userId);
        if (!isCurrent()) return;
        if (!token.ok) {
          setReceive({ color: 'red', code: token.code, message: 'This device does not have an active matching FCM registration.' });
          return;
        }
        const result = await invokeReceiveValidation(token.deviceId,
          `${userId}:${token.deviceId}:receive-validation:${Date.now()}`);
        if (!isCurrent()) return;
        if (result.color === 'red') { setReceive(result); return; }
        setReceive(pendingReceive);
        const startedAt = Date.now();
        while (isCurrent() && Date.now() - startedAt < 60000) {
          const record = await getCurrentDeviceTokenRecord(userId, token.deviceId);
          if (!isCurrent()) return;
          if (record?.receiveStatus === 'verified') {
            setReceive({ color: 'green', code: 'RECEIVE_CONFIRMED',
              message: 'This Android device confirmed receipt of a validation notification.' });
            return;
          }
          if (record?.receiveStatus === 'failed' || record?.receiveStatus === 'expired') {
            setReceive({ color: 'red', code: `RECEIVE_${record.receiveStatus.toUpperCase()}`,
              message: 'Receive validation did not complete on this Android device.' });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 2500));
        }
      } catch {
        setReceive({ color: 'yellow', code: 'RECEIVE_UNTESTED',
          message: 'Receive validation failed. Check configuration and connection, then retest.' });
      }
    };
    const promise = Promise.all([testSend(), testReceive()]).then(() => undefined).finally(() => {
      if (isCurrent()) { flight.current = null; setIsTesting(false); }
    });
    flight.current = promise;
    return promise;
  }, [userId]);

  const refreshReadiness = useCallback(() => runReadiness(false), [runReadiness]);
  const setupAndroidNotifications = useCallback(() => runReadiness(true), [runReadiness]);

  useEffect(() => {
    generation.current += 1;
    flight.current = null;
    setSendStatus(untestedSend);
    setReceiveStatus(untestedReceive);
    setIsTesting(false);
    if (!userId) return;

    const retry = () => { void retryPendingReceipts().catch(() => undefined); };
    retry();
    void refreshReadiness();
    // Serialize native token callbacks with the current readiness attempt.
    const unsubscribeToken = subscribeToTokenRefresh(() => {
      generation.current += 1;
      flight.current = null;
      return refreshReadiness();
    });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') { retry(); void refreshReadiness(); }
    });
    const retryTimer = setInterval(() => {
      if (AppState.currentState === 'active') retry();
    }, 15000);
    return () => {
      generation.current += 1;
      flight.current = null;
      unsubscribeToken();
      subscription.remove();
      clearInterval(retryTimer);
    };
  }, [refreshReadiness, userId]);

  return useMemo(() => ({
    sendStatus, receiveStatus, isTesting, setupAndroidNotifications, refreshReadiness,
    testSendCapability: refreshReadiness, testReceiveCapability: refreshReadiness,
  }), [sendStatus, receiveStatus, isTesting, setupAndroidNotifications, refreshReadiness]);
}
