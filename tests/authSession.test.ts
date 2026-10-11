const mockCreate = jest.fn();
const mockCreateEmailPasswordSession = jest.fn();
const mockDeleteSession = jest.fn();
const mockGet = jest.fn();
const mockEnsureAppUserDocument = jest.fn();
const mockSetReceiptUser = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

import {
  AUTH_OPERATION_TIMEOUT_MS,
  AUTH_RECONCILIATION_TIMEOUT_MS,
  AuthFlowError,
  registerWithUsername,
  signInWithUsername,
  validateRegistrationPassword,
} from '@/lib/appwrite/auth';
import {
  getAuthErrorMessage,
  getNotificationProfileErrorMessage,
  logAuthError,
} from '@/lib/appwrite/authErrors';
import { finishAuthSubmission, tryBeginAuthSubmission } from '@/lib/appwrite/authSubmission';
import { account } from '@/lib/appwrite/client';
import * as users from '@/lib/appwrite/users';
import * as receiptQueue from '@/lib/push-notifications/retryQueue';

const authenticatedUser = { $id: 'user-one', email: 'alice@push.local', name: 'alice' };

beforeEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  mockCreateEmailPasswordSession.mockResolvedValue({});
  mockDeleteSession.mockResolvedValue({});
  mockGet.mockResolvedValue(authenticatedUser);
  mockSetReceiptUser.mockResolvedValue(undefined);
  mockEnsureAppUserDocument.mockResolvedValue({});
  Object.assign(account as object, {
    create: mockCreate,
    createEmailPasswordSession: mockCreateEmailPasswordSession,
    deleteSession: mockDeleteSession,
    get: mockGet,
  });
  jest.spyOn(users, 'ensureAppUserDocument').mockImplementation(mockEnsureAppUserDocument);
  jest.spyOn(receiptQueue, 'setReceiptUser').mockImplementation(mockSetReceiptUser);
});

test('sign-in returns the authenticated user without provisioning a notification profile', async () => {
  await expect(signInWithUsername('alice', 'password123')).resolves.toEqual(authenticatedUser);
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockEnsureAppUserDocument).not.toHaveBeenCalled();
  expect(mockDeleteSession).not.toHaveBeenCalled();
});

test('notification profile failure does not delete a valid Appwrite session', async () => {
  await expect(signInWithUsername('alice', 'password123')).resolves.toEqual(authenticatedUser);
  mockEnsureAppUserDocument.mockRejectedValueOnce(new Error('support unavailable'));
  await expect(users.ensureAppUserDocument()).rejects.toThrow('support unavailable');
  expect(mockDeleteSession).not.toHaveBeenCalled();
  expect(mockSetReceiptUser).toHaveBeenLastCalledWith('user-one');
});

test('registration signs in exactly once without waiting for profile provisioning', async () => {
  await expect(registerWithUsername('alice', 'password123')).resolves.toEqual(authenticatedUser);
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  expect(mockEnsureAppUserDocument).not.toHaveBeenCalled();
});

test('registration reports partial success when account creation succeeds but sign-in fails', async () => {
  mockCreateEmailPasswordSession.mockRejectedValueOnce({ code: 401, type: 'user_invalid_credentials' });
  const error = await registerWithUsername('alice', 'password123').catch((failure) => failure);
  expect(error).toBeInstanceOf(AuthFlowError);
  expect(error).toMatchObject({ code: 'REGISTRATION_PARTIAL', accountCreated: true, stage: 'signing-in' });
  expect(getAuthErrorMessage(error, 'register')).toContain('account was created');
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
});

test('a session timeout reconciles through account.get without repeating the mutation', async () => {
  jest.useFakeTimers();
  mockCreateEmailPasswordSession.mockReturnValueOnce(new Promise(() => undefined));
  const result = signInWithUsername('alice', 'password123');

  await jest.advanceTimersByTimeAsync(AUTH_OPERATION_TIMEOUT_MS);

  await expect(result).resolves.toEqual(authenticatedUser);
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('never-resolving session and reconciliation reads exit within the documented deadlines', async () => {
  jest.useFakeTimers();
  mockCreateEmailPasswordSession.mockReturnValueOnce(new Promise(() => undefined));
  mockGet.mockReturnValueOnce(new Promise(() => undefined));
  const result = signInWithUsername('alice', 'password123');
  const rejection = expect(result).rejects.toMatchObject({ code: 'AUTH_RESULT_UNKNOWN' });

  await jest.advanceTimersByTimeAsync(AUTH_OPERATION_TIMEOUT_MS);
  await jest.advanceTimersByTimeAsync(AUTH_RECONCILIATION_TIMEOUT_MS);

  await rejection;
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  expect(mockGet).toHaveBeenCalledTimes(1);
});

test('the submission lock accepts only one of ten rapid attempts', () => {
  const lock = { current: false };
  const accepted = Array.from({ length: 10 }, () => tryBeginAuthSubmission(lock));
  expect(accepted.filter(Boolean)).toHaveLength(1);
  finishAuthSubmission(lock);
  expect(tryBeginAuthSubmission(lock)).toBe(true);
});

test('registration rejects passwords shorter than eight characters before Appwrite is called', async () => {
  expect(() => validateRegistrationPassword('short')).toThrow('PASSWORD_TOO_SHORT');
  await expect(registerWithUsername('alice', 'short')).rejects.toMatchObject({ code: 'PASSWORD_TOO_SHORT' });
  expect(mockCreate).not.toHaveBeenCalled();
});

test.each([
  [{ code: 401, type: 'user_invalid_credentials' }, 'sign-in', 'incorrect'],
  [{ code: 409, type: 'user_already_exists' }, 'register', 'already registered'],
  [{ code: 429, type: 'general_rate_limit_exceeded' }, 'sign-in', 'Too many attempts'],
  [new Error('Network request failed'), 'sign-in', 'could not be reached'],
  [new AuthFlowError('AUTH_RESULT_UNKNOWN', 'checking-session', false), 'sign-in', 'did not confirm'],
  [{ code: 404, type: 'project_not_found' }, 'sign-in', 'not configured'],
] as const)('maps %# to a safe operation-specific message', (error, operation, expected) => {
  expect(getAuthErrorMessage(error, operation)).toContain(expected);
});

test('maps notification profile failures without presenting them as authentication failures', () => {
  expect(getNotificationProfileErrorMessage({ code: 'FUNCTION_TIMEOUT' })).toContain('still signed in');
  expect(getNotificationProfileErrorMessage({ code: 404, type: 'function_not_found' }))
    .toContain('not deployed');
  expect(getNotificationProfileErrorMessage({ code: 'FUNCTION_UNAVAILABLE' })).toContain('can retry');
});

test('treats a session-restore timeout as a recoverable startup warning', () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const failure = new AuthFlowError('AUTH_RESULT_UNKNOWN', 'checking-session', false);

  expect(getAuthErrorMessage(failure, 'session-restore')).toContain('sign in again');
  logAuthError(failure, 'session-restore');

  expect(warn).toHaveBeenCalledWith(
    '[AUTH] Request failed',
    expect.objectContaining({ operation: 'session-restore', code: 'AUTH_RESULT_UNKNOWN' }),
  );
  expect(error).not.toHaveBeenCalled();
});
