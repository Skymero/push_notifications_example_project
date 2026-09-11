import type { DeviceTokenRecord } from '@/types/notifications';

export function compareLocalAndDatabaseToken(
  localToken: string | null,
  record: DeviceTokenRecord | null,
) {
  if (!localToken) {
    return { ok: false, code: 'FCM_TOKEN_MISSING' as const };
  }

  if (!record) {
    return { ok: false, code: 'DEVICE_RECORD_MISSING' as const };
  }

  if (!record.isActive) {
    return { ok: false, code: 'DEVICE_RECORD_INACTIVE' as const };
  }

  if (record.fcmToken !== localToken) {
    return { ok: false, code: 'FCM_TOKEN_MISMATCH' as const };
  }

  return { ok: true, code: 'TOKEN_MATCH' as const };
}
