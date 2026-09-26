import { createAdminClients, Permission, Query, Role } from '../../../_shared/appwrite';
import { loadAppwriteConfig } from '../../../_shared/env';
import { fail, isBoundedString, isDocumentId, isRecord, ok } from '../../../_shared/http';
import { deterministicId } from '../../../_shared/notificationPayload';
import { inTransaction } from '../../../_shared/transactions';
import type { AppwriteFunctionContext } from '../../../_shared/http';
import type { AppwriteConfig } from '../../../_shared/env';
import type { Databases } from 'node-appwrite';

async function writeProfile(databases: Databases, config: AppwriteConfig, userId: string, name: string,
  transactionId: string, active?: { deviceId: string; tokenId: string; enabled: boolean }) {
  const records = await databases.listDocuments({ databaseId: config.databaseId,
    collectionId: config.usersCollectionId, transactionId, queries: [Query.equal('userId', userId), Query.limit(1)] });
  const existing = records.documents[0];
  const now = new Date().toISOString();
  const permissions = [Permission.read(Role.user(userId))];
  const data = { userId, username: name || 'Android user', updatedAt: now,
    ...(active && (active.enabled || existing?.activeDeviceId === active.deviceId) ? {
      notificationEnabled: active.enabled, activeDeviceId: active.enabled ? active.deviceId : null,
      activeDeviceTokenId: active.enabled ? active.tokenId : null,
    } : {}),
  };
  if (existing) return databases.updateDocument({ databaseId: config.databaseId,
    collectionId: config.usersCollectionId, documentId: existing.$id, transactionId, permissions, data });
  return databases.createDocument({ databaseId: config.databaseId, collectionId: config.usersCollectionId,
    documentId: deterministicId('profile', userId), transactionId, permissions, data: {
      notificationEnabled: false, activeDeviceId: null, activeDeviceTokenId: null, createdAt: now, ...data,
    } });
}

export async function handleEnsureProfile(context: AppwriteFunctionContext, userId: string) {
  const config = loadAppwriteConfig();
  const { databases, users } = createAdminClients(config);
  const account = await users.get(userId);
  const profile = await inTransaction(databases, (transactionId) =>
    writeProfile(databases, config, userId, account.name, transactionId));
  return ok(context, profile);
}

export async function handleRegisterDevice(context: AppwriteFunctionContext, userId: string, payload: unknown) {
  if (!isRecord(payload) || !isDocumentId(payload.deviceId) || payload.platform !== 'android' ||
    !isBoundedString(payload.appVersion, 32) ||
    (payload.buildNumber !== undefined && payload.buildNumber !== '' && !isBoundedString(payload.buildNumber, 64)) ||
    !['granted', 'denied', 'not_requested', 'unknown'].includes(String(payload.permissionStatus)) ||
    (payload.fcmToken !== null && payload.fcmToken !== '' && !isBoundedString(payload.fcmToken, 4096))) {
    return fail(context, 400, 'INVALID_DEVICE_REGISTRATION', 'A valid Android device registration is required.');
  }
  const request = payload;
  const config = loadAppwriteConfig();
  const { databases, users } = createAdminClients(config);
  const account = await users.get(userId);
  const device = await inTransaction(databases, async (transactionId) => {
    const result = await databases.listDocuments({ databaseId: config.databaseId,
      collectionId: config.deviceTokensCollectionId, transactionId,
      queries: [Query.equal('userId', userId), Query.equal('deviceId', request.deviceId as string), Query.limit(1)] });
    const existing = result.documents[0];
    const now = new Date().toISOString();
    const fcmToken = String(request.fcmToken ?? '');
    const tokenChanged = Boolean(existing && existing.fcmToken !== fcmToken);
    const wasClientWritable = existing?.$permissions.some((permission: string) => /^(update|write|delete)\(/.test(permission));
    const reset = !existing || tokenChanged || !existing.isActive || existing.tokenStatus === 'revoked' ||
      request.permissionStatus !== 'granted' || wasClientWritable;
    const tokenStatus = !fcmToken || (!tokenChanged && existing?.tokenStatus === 'invalid') ? 'invalid' :
      reset ? 'untested' : existing.tokenStatus;
    const isActive = Boolean(fcmToken && request.permissionStatus === 'granted' && tokenStatus !== 'invalid');
    const documentId = existing?.$id ?? deterministicId('device', userId, request.deviceId as string);
    const data = { userId, deviceId: request.deviceId, deviceTokenId: documentId, fcmToken,
      platform: 'android', appVersion: request.appVersion, buildNumber: request.buildNumber ?? '',
      permissionStatus: request.permissionStatus, tokenStatus, isActive,
      receiveStatus: reset ? 'untested' : existing.receiveStatus,
      lastTokenRefreshAt: tokenChanged || !existing ? now : existing.lastTokenRefreshAt ?? null,
      ...(reset ? { lastValidatedAt: null, lastReceivedAt: null } : {}), updatedAt: now,
    };
    const args = { databaseId: config.databaseId, collectionId: config.deviceTokensCollectionId,
      documentId, transactionId, permissions: [Permission.read(Role.user(userId))] };
    const saved = existing ? await databases.updateDocument({ ...args, data }) :
      await databases.createDocument({ ...args, data: { ...data, createdAt: now } });
    await writeProfile(databases, config, userId, account.name, transactionId,
      { deviceId: request.deviceId as string, tokenId: documentId, enabled: isActive });
    return saved;
  });
  return ok(context, device);
}

export async function handleDeactivateDevice(context: AppwriteFunctionContext, userId: string, payload: unknown) {
  if (!isRecord(payload) || !isDocumentId(payload.deviceId)) {
    return fail(context, 400, 'INVALID_DEVICE_REGISTRATION', 'A valid device ID is required.');
  }
  const config = loadAppwriteConfig();
  const { databases, users } = createAdminClients(config);
  const account = await users.get(userId);
  await inTransaction(databases, async (transactionId) => {
    const result = await databases.listDocuments({ databaseId: config.databaseId,
      collectionId: config.deviceTokensCollectionId, transactionId,
      queries: [Query.equal('userId', userId), Query.equal('deviceId', payload.deviceId as string), Query.limit(1)] });
    const token = result.documents[0];
    if (token) await databases.updateDocument({ databaseId: config.databaseId,
      collectionId: config.deviceTokensCollectionId, documentId: token.$id, transactionId,
      permissions: [Permission.read(Role.user(userId))], data: { isActive: false, tokenStatus: 'revoked',
        receiveStatus: 'untested', updatedAt: new Date().toISOString() } });
    await writeProfile(databases, config, userId, account.name, transactionId,
      { deviceId: payload.deviceId as string, tokenId: token?.$id ?? '', enabled: false });
  });
  return ok(context, { ok: true });
}
