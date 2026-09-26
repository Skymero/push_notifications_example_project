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

import { registerWithUsername, signInWithUsername } from '@/lib/appwrite/auth';
import { account } from '@/lib/appwrite/client';
import * as users from '@/lib/appwrite/users';
import * as receiptQueue from '@/lib/push-notifications/retryQueue';

beforeEach(() => {
  jest.clearAllMocks();
  mockCreate.mockResolvedValue({});
  mockCreateEmailPasswordSession.mockResolvedValue({});
  mockDeleteSession.mockResolvedValue({});
  mockGet.mockResolvedValue({ $id: 'user-one', email: 'alice@push.local', name: 'alice' });
  mockSetReceiptUser.mockResolvedValue(undefined);
  mockEnsureAppUserDocument.mockResolvedValue({});
  Object.assign(account as object, { create: mockCreate, createEmailPasswordSession: mockCreateEmailPasswordSession,
    deleteSession: mockDeleteSession, get: mockGet });
  jest.spyOn(users, 'ensureAppUserDocument').mockImplementation(mockEnsureAppUserDocument);
  jest.spyOn(receiptQueue, 'setReceiptUser').mockImplementation(mockSetReceiptUser);
});

test('support bootstrap failure rolls back the newly created session', async () => {
  mockEnsureAppUserDocument.mockRejectedValue(new Error('support unavailable'));
  await expect(signInWithUsername('alice', 'password123')).rejects.toThrow('support unavailable');
  expect(mockDeleteSession).toHaveBeenCalledWith('current');
  expect(mockSetReceiptUser).toHaveBeenLastCalledWith(null);
});

test('registration signs in and bootstraps the profile exactly once', async () => {
  await expect(registerWithUsername('alice', 'password123')).resolves.toMatchObject({ $id: 'user-one' });
  expect(mockCreate).toHaveBeenCalledTimes(1);
  expect(mockCreateEmailPasswordSession).toHaveBeenCalledTimes(1);
  expect(mockEnsureAppUserDocument).toHaveBeenCalledTimes(1);
});
