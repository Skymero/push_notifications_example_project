import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import type { PermissionStatus } from '@/types/notifications';

type MessagingModule = typeof import('@react-native-firebase/messaging').default;
type MessageCallback = (message: FirebaseMessagingTypes.RemoteMessage) => void | Promise<void>;
type TokenCallback = (token: string) => void | Promise<void>;

let messagingModule: MessagingModule | null | undefined;

function getMessaging(): MessagingModule | null {
  if (messagingModule !== undefined) {
    return messagingModule;
  }

  try {
    // React Native Firebase is available only in native builds with Firebase config files.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    messagingModule = require('@react-native-firebase/messaging').default;
  } catch {
    messagingModule = null;
  }

  return messagingModule ?? null;
}

export async function ensureFirebaseInitialized() {
  try { return Boolean(getMessaging()?.()); } catch { return false; }
}

export async function configureNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }
}

function normalizeAuthorizationStatus(status: number | undefined): PermissionStatus {
  const messaging = getMessaging();

  if (!messaging || status === undefined) {
    return 'unknown';
  }

  if (status === messaging.AuthorizationStatus.AUTHORIZED) {
    return 'granted';
  }

  if (status === messaging.AuthorizationStatus.PROVISIONAL) {
    return 'granted';
  }

  if (status === messaging.AuthorizationStatus.DENIED) {
    return 'denied';
  }

  if (status === messaging.AuthorizationStatus.NOT_DETERMINED) {
    return 'not_requested';
  }

  return 'unknown';
}

export async function getNotificationPermissionStatus(): Promise<PermissionStatus> {
  const nativeStatus = await Notifications.getPermissionsAsync();

  if (Platform.OS === 'android') {
    return nativeStatus.granted ? 'granted' : nativeStatus.status === 'denied'
      ? 'denied' : 'not_requested';
  }

  if (nativeStatus.granted) {
    return 'granted';
  }

  if (!nativeStatus.canAskAgain) {
    return 'denied';
  }

  const messaging = getMessaging();
  if (!messaging) {
    return nativeStatus.status === 'undetermined' ? 'not_requested' : 'unknown';
  }

  const status = await messaging().hasPermission();
  return normalizeAuthorizationStatus(status);
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  const messaging = getMessaging();
  const expoStatus = await Notifications.requestPermissionsAsync();

  if (Platform.OS === 'android') {
    return expoStatus.granted ? 'granted' : expoStatus.status === 'denied'
      ? 'denied' : 'not_requested';
  }

  if (messaging) {
    const status = await messaging().requestPermission();
    return normalizeAuthorizationStatus(status);
  }

  if (expoStatus.granted) {
    return 'granted';
  }

  return expoStatus.canAskAgain ? 'not_requested' : 'denied';
}

export async function getCurrentFCMToken(): Promise<string | null> {
  const messaging = getMessaging();

  if (!messaging) {
    return null;
  }

  const token = await messaging().getToken();
  return token || null;
}

export function subscribeToTokenRefresh(callback: TokenCallback) {
  const messaging = getMessaging();
  if (!messaging) {
    return () => undefined;
  }

  return messaging().onTokenRefresh(callback);
}

export function subscribeToForegroundMessages(callback: MessageCallback) {
  const messaging = getMessaging();
  if (!messaging) {
    return () => undefined;
  }

  return messaging().onMessage(callback);
}

export function subscribeToNotificationOpened(callback: MessageCallback) {
  const messaging = getMessaging();
  if (!messaging) {
    return () => undefined;
  }

  return messaging().onNotificationOpenedApp(callback);
}

export async function getInitialNotification() {
  const messaging = getMessaging();
  if (!messaging) {
    return null;
  }

  return messaging().getInitialNotification();
}
