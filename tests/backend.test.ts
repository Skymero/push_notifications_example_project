/** Handler regressions: the database double models staged writes and optimistic commit conflicts. */
import fanout from '../functions/notification-fanout/src/main';
import support from '../functions/notification-support/src/main';
import { hashReceiptNonce } from '../functions/_shared/notificationPayload';
import { createAdminClients } from '../functions/_shared/appwrite';
import { getFirebaseMessaging, verifyFirebaseCredentials } from '../functions/_shared/firebase';
import { loadAppwriteConfig, loadConfig } from '../functions/_shared/env';

jest.mock('node-fetch-native-with-agent', () => ({ fetch: jest.fn() }));

jest.mock('../functions/_shared/appwrite', () => ({
  ...jest.requireActual('../functions/_shared/appwrite'), createAdminClients: jest.fn(),
}));
jest.mock('../functions/_shared/env', () => ({ loadConfig: jest.fn(), loadAppwriteConfig: jest.fn() }));
jest.mock('../functions/_shared/firebase', () => ({
  ...jest.requireActual('../functions/_shared/firebase'), getFirebaseMessaging: jest.fn(), verifyFirebaseCredentials: jest.fn(),
}));

type Doc = Record<string, any> & { $id: string };
type Tx = { reads: Map<string, number>; writes: Map<string, Doc> };
const errorWithCode = (code: number) => Object.assign(new Error('Injected failure'), { code });
const config = { databaseId: 'db', usersCollectionId: 'users', deviceTokensCollectionId: 'devices',
  notificationJobsCollectionId: 'jobs', notificationRecipientsCollectionId: 'recipients',
  notificationReceiptsCollectionId: 'receipts', includeSender: true, fanoutLimit: 100,
  jobStaleSeconds: 300, fanoutCooldownSeconds: 10, validationCooldownSeconds: 30 };

class DatabaseDouble {
  docs = new Map<string, Doc>();
  versions = new Map<string, number>();
  transactions = new Map<string, Tx>();
  sequence = 0;
  conflicts = 0;
  failUpdateCollection: string | null = null;
  loseCommitResponse = false;
  schemaReady = true;
  seed(collection: string, value: Doc) {
    const key = collection + '/' + value.$id;
    this.docs.set(key, structuredClone({ $permissions: [], ...value }));
    this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
  }
  all(collection: string) { return [...this.docs.entries()].filter(([key]) => key.startsWith(collection + '/')).map(([, value]) => value); }
  private args(args: any[], names: string[]) {
    return typeof args[0] === 'object' ? args[0] : Object.fromEntries(names.map((name, i) => [name, args[i]]));
  }
  private read(collectionId: string, documentId: string, transactionId?: string) {
    const key = collectionId + '/' + documentId;
    const tx = transactionId ? this.transactions.get(transactionId)! : undefined;
    if (tx && !tx.reads.has(key)) tx.reads.set(key, this.versions.get(key) ?? 0);
    const doc = tx?.writes.get(key) ?? this.docs.get(key);
    if (!doc) throw errorWithCode(404);
    return structuredClone(doc);
  }
  private save(collectionId: string, doc: Doc, transactionId?: string) {
    if (transactionId) this.transactions.get(transactionId)!.writes.set(collectionId + '/' + doc.$id, doc);
    else this.seed(collectionId, doc);
    return structuredClone(doc);
  }
  getCollection = jest.fn(async () => ({ attributes: this.schemaReady ? [{ key: 'rateLimitKey', size: 64, status: 'available' }] : [],
    indexes: [{ type: 'unique', status: 'available', attributes: ['rateLimitKey'] }] }));
  getDocument = jest.fn(async (...args: any[]) => {
    const a = this.args(args, ['databaseId', 'collectionId', 'documentId', 'queries', 'transactionId']);
    return this.read(a.collectionId, a.documentId, a.transactionId);
  });
  listDocuments = jest.fn(async (...args: any[]) => {
    const a = this.args(args, ['databaseId', 'collectionId', 'queries', 'transactionId']);
    let rows = this.all(a.collectionId);
    for (const raw of a.queries ?? []) {
      const q = JSON.parse(raw);
      if (q.method === 'equal') rows = rows.filter((r) => q.values.includes(r[q.attribute]));
      if (q.method === 'notEqual') rows = rows.filter((r) => !q.values.includes(r[q.attribute]));
      if (q.method === 'limit') rows = rows.slice(0, q.values[0]);
    }
    return { total: rows.length, documents: rows.map((r) => this.read(a.collectionId, r.$id, a.transactionId)) };
  });
  createDocument = jest.fn(async (...args: any[]) => {
    const a = this.args(args, ['databaseId', 'collectionId', 'documentId', 'data', 'permissions', 'transactionId']);
    try { this.read(a.collectionId, a.documentId, a.transactionId); throw errorWithCode(409); }
    catch (error: any) { if (error.code !== 404) throw error; }
    if (a.data.rateLimitKey && this.all(a.collectionId).some((doc) => doc.rateLimitKey === a.data.rateLimitKey)) throw errorWithCode(409);
    return this.save(a.collectionId, { $id: a.documentId, $permissions: a.permissions ?? [], ...a.data }, a.transactionId);
  });
  updateDocument = jest.fn(async (...args: any[]) => {
    const a = this.args(args, ['databaseId', 'collectionId', 'documentId', 'data', 'permissions', 'transactionId']);
    if (a.collectionId === this.failUpdateCollection) { this.failUpdateCollection = null; throw errorWithCode(503); }
    const doc = this.read(a.collectionId, a.documentId, a.transactionId);
    return this.save(a.collectionId, { ...doc, ...a.data,
      ...(a.permissions ? { $permissions: a.permissions } : {}) }, a.transactionId);
  });
  incrementDocumentAttribute = jest.fn(async (a: any) => {
    const doc = this.read(a.collectionId, a.documentId, a.transactionId);
    return this.save(a.collectionId, { ...doc, [a.attribute]: Number(doc[a.attribute]) + a.value }, a.transactionId);
  });
  createTransaction = jest.fn(async () => {
    const id = 'transaction-' + ++this.sequence;
    this.transactions.set(id, { reads: new Map(), writes: new Map() });
    return { $id: id };
  });
  updateTransaction = jest.fn(async ({ transactionId, commit }: any) => {
    const tx = this.transactions.get(transactionId);
    if (commit && tx) {
      for (const [key, revision] of tx.reads) {
        if ((this.versions.get(key) ?? 0) !== revision) { this.conflicts++; throw errorWithCode(409); }
      }
      for (const [key, doc] of tx.writes) this.seed(key.split('/')[0], doc);
    }
    this.transactions.delete(transactionId);
    if (commit && this.loseCommitResponse) { this.loseCommitResponse = false; throw errorWithCode(503); }
    return { $id: transactionId };
  });
}

let db: DatabaseDouble;
let send: jest.Mock;
const now = () => new Date().toISOString();
async function invoke(handler: typeof support, body: unknown, userId = 'user-a') {
  return await handler({ req: { body: body as any, headers: { 'x-appwrite-user-id': userId } },
    res: { json: (value, status = 200) => ({ body: value, status }) }, log: jest.fn(), error: jest.fn() }) as
    { body: any; status: number };
}
const callSupport = (action: string, payload?: unknown, userId?: string) => invoke(support, { action, payload }, userId);
function device(id = 'device-row-a', userId = 'user-a', deviceId = 'device-a') {
  db.seed('devices', { $id: id, userId, deviceId, fcmToken: 'token-' + id, platform: 'android',
    permissionStatus: 'granted', isActive: true, tokenStatus: 'valid', receiveStatus: 'untested' });
}
function recipient(id = 'recipient-a', tokenId = 'device-row-a', userId = 'user-a') {
  db.seed('recipients', { $id: id, jobId: 'job-a', recipientUserId: userId, deviceTokenId: tokenId,
    receiptStatus: 'not_confirmed', receiptNonce: hashReceiptNonce('actual-nonce', 'token-' + tokenId),
    receivedAt: null, openedAt: null });
}
function receipt(overrides: Record<string, unknown> = {}) {
  return { jobId: 'job-a', recipientRecordId: 'recipient-a', deviceId: 'device-a', eventType: 'received',
    clientTimestamp: now(), idempotencyKey: 'event-a', receiptNonce: 'actual-nonce', ...overrides };
}
beforeEach(() => {
  jest.clearAllMocks();
  db = new DatabaseDouble();
  send = jest.fn().mockResolvedValue('provider-message');
  (loadConfig as jest.Mock).mockReturnValue(config);
  (loadAppwriteConfig as jest.Mock).mockReturnValue(config);
  (createAdminClients as jest.Mock).mockReturnValue({ databases: db,
    users: { get: jest.fn().mockImplementation(async (id: string) => ({ $id: id, name: 'Trusted ' + id })) } });
  (getFirebaseMessaging as jest.Mock).mockReturnValue({ send });
  (verifyFirebaseCredentials as jest.Mock).mockResolvedValue(undefined);
  db.seed('jobs', { $id: 'job-a', createdAt: now(), confirmedCount: 0 });
});

describe('runtime input and readiness boundaries', () => {
  test.each(['{', 'null', '[]', '42'])('invalid JSON shape %s yields controlled 400', async (body) => {
    expect((await invoke(support, body)).status).toBe(400);
    expect(db.createTransaction).not.toHaveBeenCalled();
  });
  test('unauthenticated and unsupported actions fail before database access', async () => {
    expect((await invoke(support, {}, '')).status).toBe(401);
    expect((await callSupport('invented')).body.code).toBe('INVALID_SUPPORT_ACTION');
    expect(db.listDocuments).not.toHaveBeenCalled();
  });
  test.each([{ eventType: 'invented' }, { receiptNonce: '' }, { clientTimestamp: 'tomorrow' }, { deviceId: {} }])(
    'rejects malformed receipts %p', async (overrides) => {
      expect((await callSupport('receipt', receipt(overrides))).body.code).toBe('RECEIPT_MALFORMED');
      expect(db.createTransaction).not.toHaveBeenCalled();
    });
  test('send readiness requires both remote database schema and Firebase credentials', async () => {
    db.schemaReady = false;
    expect((await callSupport('sendValidation', {})).body.code).toBe('SERVER_MISCONFIGURED');
    db.schemaReady = true;
    (verifyFirebaseCredentials as jest.Mock).mockRejectedValueOnce(new Error('bad credentials'));
    expect((await callSupport('sendValidation', {})).status).toBe(500);
    expect((await callSupport('sendValidation', {})).body.code).toBe('SEND_READY');
  });
});

describe('authenticated atomic receipts', () => {
  beforeEach(() => { device(); recipient(); });
  test('readable digest and missing raw proof cannot forge delivery', async () => {
    const digest = db.all('recipients')[0].receiptNonce;
    expect((await callSupport('receipt', receipt({ receiptNonce: digest }))).status).toBe(403);
    expect((await callSupport('receipt', receipt())).status).toBe(200);
    expect(db.all('jobs')[0].confirmedCount).toBe(1);
    expect(db.all('devices')[0].receiveStatus).toBe('verified');
  });
  test('duplicate requests verify ownership and nonce before acknowledging', async () => {
    await callSupport('receipt', receipt());
    expect((await callSupport('receipt', receipt(), 'attacker')).status).toBe(403);
    expect((await callSupport('receipt', receipt({ receiptNonce: 'wrong' }))).status).toBe(403);
    expect((await callSupport('receipt', receipt())).body.duplicate).toBe(true);
  });
  test('database failure after staging the audit rolls back and later retry repairs everything', async () => {
    db.failUpdateCollection = 'devices';
    expect((await callSupport('receipt', receipt())).status).toBe(500);
    expect(db.all('receipts')).toHaveLength(0);
    expect(db.all('recipients')[0].receiptStatus).toBe('not_confirmed');
    expect((await callSupport('receipt', receipt())).status).toBe(200);
    expect(db.all('receipts')).toHaveLength(1);
    expect(db.all('jobs')[0].confirmedCount).toBe(1);
  });
  test('a committed transaction whose response is lost is safe to retry', async () => {
    db.loseCommitResponse = true;
    expect((await callSupport('receipt', receipt())).status).toBe(500);
    expect((await callSupport('receipt', receipt())).body.duplicate).toBe(true);
    expect(db.all('jobs')[0].confirmedCount).toBe(1);
  });
  test('concurrent distinct recipients both count after an optimistic conflict', async () => {
    device('device-row-b', 'user-b', 'device-b'); recipient('recipient-b', 'device-row-b', 'user-b');
    const results = await Promise.all([callSupport('receipt', receipt()), callSupport('receipt', receipt({
      recipientRecordId: 'recipient-b', deviceId: 'device-b', idempotencyKey: 'event-b',
    }), 'user-b')]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(db.conflicts).toBeGreaterThan(0);
    expect(db.all('jobs')[0].confirmedCount).toBe(2);
  });
  test('concurrent/reordered events never double-count or downgrade opened', async () => {
    await Promise.all([callSupport('receipt', receipt({ eventType: 'opened', idempotencyKey: 'opened' })),
      callSupport('receipt', receipt())]);
    await callSupport('receipt', receipt({ eventType: 'displayed', idempotencyKey: 'displayed' }));
    expect(db.all('jobs')[0].confirmedCount).toBe(1);
    expect(db.all('receipts')).toHaveLength(3);
    expect(db.all('recipients')[0].receiptStatus).toBe('opened');
  });
  test('token rotation rejects old delivery proof and old jobs cannot satisfy a newer validation', async () => {
    const token = db.all('devices')[0];
    db.seed('devices', { ...token, fcmToken: 'rotated-token' });
    expect((await callSupport('receipt', receipt())).status).toBe(403);
    db.seed('devices', { ...token, lastValidatedAt: new Date(Date.now() + 1000).toISOString() });
    expect((await callSupport('receipt', receipt())).status).toBe(200);
    expect(db.all('devices')[0].receiveStatus).toBe('untested');
  });
});

describe('dispatch jobs, replay, rate limits and provider failure recovery', () => {
  beforeEach(() => device());
  const request = { notificationType: 'system_test', idempotencyKey: 'same-key' };
  test('simultaneous same-key fanouts send once and persist proof before delivery', async () => {
    send.mockImplementation(async (message: any) => {
      const row = db.all('recipients').find((r) => r.$id === message.data.recipientRecordId)!;
      expect(row.dispatchStatus).toBe('pending');
      expect(row.receiptNonce).not.toBe(message.data.receiptNonce);
      expect((await callSupport('receipt', receipt({ jobId: message.data.jobId,
        recipientRecordId: row.$id, receiptNonce: message.data.receiptNonce }))).status).toBe(200);
      return 'accepted-message';
    });
    const results = await Promise.all([invoke(fanout, request), invoke(fanout, request)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(results[0].body.jobId).toBe(results[1].body.jobId);
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.all('recipients')[0].receiptStatus).toBe('received');
    expect(db.all('jobs').find((j) => j.$id === results[0].body.jobId)?.confirmedCount).toBe(1);
  });
  test('concurrent different keys in one fixed interval receive 429 without a second send', async () => {
    const time = jest.spyOn(Date, 'now').mockReturnValue(1_800_000_005_000);
    try {
      const results = await Promise.all([invoke(fanout, request), invoke(fanout, { ...request, idempotencyKey: 'other' })]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 429]);
      expect(send).toHaveBeenCalledTimes(1);
    } finally { time.mockRestore(); }
  });
  test('validation replay sends once and transient provider failure keeps the token active', async () => {
    send.mockRejectedValue(Object.assign(new Error('private token details'), { code: 'messaging/server-unavailable' }));
    const payload = { deviceId: 'device-a', idempotencyKey: 'validation' };
    expect((await callSupport('receiveValidation', payload)).status).toBe(503);
    expect((await callSupport('receiveValidation', payload)).body.code).toBe('VALIDATION_FAILED');
    expect(send).toHaveBeenCalledTimes(1);
    expect(db.all('devices')[0].isActive).toBe(true);
    expect(db.all('recipients')[0].failureMessage).not.toContain('private token');
  });
  test('permanent provider rejection invalidates a dead token during fanout', async () => {
    send.mockRejectedValue({ code: 'messaging/registration-token-not-registered' });
    await invoke(fanout, request);
    expect(db.all('devices')[0]).toMatchObject({ tokenStatus: 'invalid', isActive: false, receiveStatus: 'failed' });
  });
  test('post-send persistence failure does not label the accepted token invalid or resend', async () => {
    send.mockImplementation(async () => { db.failUpdateCollection = 'recipients'; return 'message'; });
    expect((await callSupport('receiveValidation', { deviceId: 'device-a', idempotencyKey: 'validation' })).status).toBe(500);
    expect(db.all('devices')[0].tokenStatus).toBe('valid');
    expect((await callSupport('receiveValidation', { deviceId: 'device-a', idempotencyKey: 'validation' })).body.code).toBe('RECEIPT_PENDING');
    expect(send).toHaveBeenCalledTimes(1);
  });
  test('permanent error for an old token never invalidates a freshly rotated token', async () => {
    send.mockImplementation(async () => {
      db.seed('devices', { ...db.all('devices')[0], fcmToken: 'new-token' });
      throw { code: 'messaging/registration-token-not-registered' };
    });
    await invoke(fanout, request);
    expect(db.all('devices')[0].tokenStatus).toBe('valid');
  });
});

describe('server-owned profile and device lifecycle', () => {
  const payload = { deviceId: 'device-a', platform: 'android', fcmToken: 'fresh-token', appVersion: '1.0', permissionStatus: 'granted' };
  test('ownership/readiness are derived and device/profile documents have no client write grant', async () => {
    const response = await callSupport('registerDevice', { ...payload, userId: 'victim', receiveStatus: 'verified', tokenStatus: 'valid' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ userId: 'user-a', receiveStatus: 'untested', tokenStatus: 'untested' });
    for (const row of [...db.all('devices'), ...db.all('users')]) {
      expect(row.$permissions).toEqual(['read("user:user-a")']);
    }
    expect(db.all('users')[0]).toMatchObject({ username: 'Trusted user-a', notificationEnabled: true });
    expect(loadConfig).not.toHaveBeenCalled();
  });
  test('same-token relogin resets revoked readiness and rotation resets verified status', async () => {
    await callSupport('registerDevice', payload);
    await callSupport('deactivateDevice', { deviceId: 'device-a' });
    const reactivated = await callSupport('registerDevice', payload);
    expect(reactivated.body).toMatchObject({ isActive: true, tokenStatus: 'untested', receiveStatus: 'untested' });
    db.seed('devices', { ...db.all('devices')[0], receiveStatus: 'verified', tokenStatus: 'valid' });
    const rotated = await callSupport('registerDevice', { ...payload, fcmToken: 'rotated' });
    expect(rotated.body).toMatchObject({ receiveStatus: 'untested', tokenStatus: 'untested' });
    expect(db.all('devices')).toHaveLength(1);
  });
  test('concurrent registrations converge to one device/profile and revoke old mutable permissions', async () => {
    const results = await Promise.all([callSupport('registerDevice', payload), callSupport('registerDevice', payload)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(db.all('devices')).toHaveLength(1);
    expect(db.all('users')).toHaveLength(1);
    db.seed('devices', { ...db.all('devices')[0], $permissions: ['read("user:user-a")', 'update("user:user-a")'],
      receiveStatus: 'verified', tokenStatus: 'valid' });
    expect((await callSupport('registerDevice', payload)).body.receiveStatus).toBe('untested');
  });
});
