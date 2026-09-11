import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import {
  getCurrentFCMToken,
  getNotificationPermissionStatus,
} from '@/lib/push-notifications/firebaseMessaging';
import {
  deactivateDeviceToken,
  getCurrentDeviceTokenRecord,
  upsertDeviceToken,
} from '@/lib/appwrite/notifications';
import { compareLocalAndDatabaseToken } from '@/lib/push-notifications/tokenValidation';

const DEVICE_ID_KEY = '@push-notifications/device-id';

export async function getOrCreateDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function syncCurrentDeviceToken(userId: string) {
  const deviceId = await getOrCreateDeviceId();
  const permissionStatus = await getNotificationPermissionStatus();
  const fcmToken =
    permissionStatus === 'granted'
      ? await getCurrentFCMToken()
      : null;

  return upsertDeviceToken({
    userId,
    deviceId,
    fcmToken,
    platform: 'android',
    appVersion: Constants.expoConfig?.version ?? '0.0.0',
    buildNumber: Device.osBuildId ?? undefined,
    permissionStatus,
  });
}

export async function deactivateCurrentDeviceToken(userId: string) {
  const deviceId = await getOrCreateDeviceId();
  return deactivateDeviceToken(userId, deviceId);
}

export async function validateLocalAndDatabaseToken(userId: string) {
  const deviceId = await getOrCreateDeviceId();
  const localToken = await getCurrentFCMToken();
  const record = await getCurrentDeviceTokenRecord(userId, deviceId);

  return { ...compareLocalAndDatabaseToken(localToken, record), deviceId, record };
}
