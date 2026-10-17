const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...ORIGINAL_ENV,
    APPWRITE_ENDPOINT: 'https://example.test/v1', APPWRITE_PROJECT_ID: 'project', APPWRITE_API_KEY: 'key',
    APPWRITE_DATABASE_ID: 'db', APPWRITE_USERS_COLLECTION_ID: 'users',
    APPWRITE_DEVICE_TOKENS_COLLECTION_ID: 'devices', APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID: 'jobs',
    APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID: 'recipients',
    APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID: 'receipts', FIREBASE_PROJECT_ID: 'firebase',
    FIREBASE_CLIENT_EMAIL: 'service@example.test', FIREBASE_PRIVATE_KEY: 'private-key' };
});

afterAll(() => { process.env = ORIGINAL_ENV; });

test('fanout defaults to the reviewed maximum of 25', () => {
  delete process.env.NOTIFICATION_FANOUT_LIMIT;
  const { loadConfig, MAX_FANOUT_LIMIT } = require('../functions/_shared/env');
  expect(MAX_FANOUT_LIMIT).toBe(25);
  expect(loadConfig().fanoutLimit).toBe(25);
});

test('fanout rejects a configured value above the reviewed maximum', () => {
  process.env.NOTIFICATION_FANOUT_LIMIT = '26';
  const { loadConfig } = require('../functions/_shared/env');
  expect(() => loadConfig()).toThrow('at most 25');
});
