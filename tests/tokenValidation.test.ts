import { compareLocalAndDatabaseToken } from '@/lib/push-notifications/tokenValidation';
import type { DeviceTokenRecord } from '@/types/notifications';

const record: DeviceTokenRecord = {
  $id: 'token-doc-1',
  userId: 'user-1',
  deviceId: 'device-1',
  fcmToken: 'local-token',
  platform: 'android',
  appVersion: '1.0.0',
  buildNumber: '1',
  permissionStatus: 'granted',
  tokenStatus: 'valid',
  receiveStatus: 'verified',
  isActive: true,
};

describe('local/database token comparison', () => {
  it('passes when local and database tokens match an active record', () => {
    expect(compareLocalAndDatabaseToken('local-token', record)).toEqual({
      ok: true,
      code: 'TOKEN_MATCH',
    });
  });

  it('fails when local token is missing', () => {
    expect(compareLocalAndDatabaseToken(null, record)).toEqual({
      ok: false,
      code: 'FCM_TOKEN_MISSING',
    });
  });

  it('fails when the database record is inactive', () => {
    expect(compareLocalAndDatabaseToken('local-token', { ...record, isActive: false })).toEqual({
      ok: false,
      code: 'DEVICE_RECORD_INACTIVE',
    });
  });

  it('fails when tokens do not match', () => {
    expect(compareLocalAndDatabaseToken('rotated-token', record)).toEqual({
      ok: false,
      code: 'FCM_TOKEN_MISMATCH',
    });
  });
});
