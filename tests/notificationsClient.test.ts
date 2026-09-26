const mockCreateExecution = jest.fn();
const mockGetExecution = jest.fn();
const mockListDocuments = jest.fn();

import {
  invokeNotificationFanout,
  invokeSendValidation,
  NotificationFunctionError,
  upsertDeviceToken,
} from '@/lib/appwrite/notifications';
import { databases, functions } from '@/lib/appwrite/client';

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(functions as object, { createExecution: mockCreateExecution, getExecution: mockGetExecution });
  Object.assign(databases as object, { listDocuments: mockListDocuments });
});

test('a failed Appwrite execution is rejected with its sanitized backend code', async () => {
  mockCreateExecution.mockResolvedValue({
    status: 'completed', responseStatusCode: 403,
    responseBody: JSON.stringify({ ok: false, code: 'AUTH_FORBIDDEN', message: 'hidden' }),
  });
  await expect(invokeSendValidation()).rejects.toMatchObject<Partial<NotificationFunctionError>>({
    code: 'AUTH_FORBIDDEN', status: 403,
  });
});

test('device registration never sends client-controlled ownership or readiness fields', async () => {
  mockCreateExecution.mockResolvedValue({ status: 'completed', responseStatusCode: 200,
    responseBody: JSON.stringify({ $id: 'device-row', userId: 'trusted-user' }) });
  await upsertDeviceToken({ userId: 'untrusted-user', deviceId: 'android-one', fcmToken: 'token',
    platform: 'android', appVersion: '1.0.0', permissionStatus: 'granted' });
  const envelope = JSON.parse(mockCreateExecution.mock.calls[0][1]);
  expect(envelope.action).toBe('registerDevice');
  expect(envelope.payload.userId).toBeUndefined();
  expect(envelope.payload.receiveStatus).toBeUndefined();
  expect(envelope.payload.tokenStatus).toBeUndefined();
});

test('fanout schedules an asynchronous execution and discovers the readable job by the same key', async () => {
  mockListDocuments
    .mockResolvedValueOnce({ documents: [] })
    .mockResolvedValueOnce({ documents: [{ $id: 'job-one', jobId: 'job-one', status: 'processing' }] });
  mockCreateExecution.mockResolvedValue({ $id: 'execution-one' });
  const result = await invokeNotificationFanout({ notificationType: 'system_test', idempotencyKey: 'request-one' }, 'user-one');
  expect(mockCreateExecution).toHaveBeenCalledWith('notification-fanout',
    JSON.stringify({ notificationType: 'system_test', idempotencyKey: 'request-one' }), true);
  expect(result).toEqual({ jobId: 'job-one', status: 'processing' });
  expect(mockListDocuments).toHaveBeenCalledTimes(2);
});
