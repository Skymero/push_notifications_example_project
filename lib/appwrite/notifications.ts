import { ID, Permission, Query, Role, client, databases, functions } from '@/lib/appwrite/client';
import { appConfig } from '@/lib/config';
import { updateActiveDeviceReference } from '@/lib/appwrite/users';
import type {
  DeviceTokenRecord,
  InvokeNotificationFanoutRequest,
  InvokeNotificationFanoutResponse,
  JobStatus,
  NotificationJob,
  NotificationRecipient,
  PermissionStatus,
  SubmitNotificationReceiptRequest,
} from '@/types/notifications';

const { databaseId, collections, functions: functionIds } = appConfig.appwrite;

type NotificationSupportAction = 'sendValidation' | 'receiveValidation' | 'receipt';

function supportEnvelope(action: NotificationSupportAction, payload: Record<string, unknown>) {
  return { action, payload };
}

async function executeJson<T>(functionId: string, payload?: unknown): Promise<T> {
  const result = await functions.createExecution(
    functionId,
    payload === undefined ? undefined : JSON.stringify(payload),
  );

  const raw = result.responseBody || '{}';
  return JSON.parse(raw) as T;
}

export type UpsertDeviceTokenInput = {
  userId: string;
  deviceId: string;
  fcmToken: string | null;
  platform: 'ios' | 'android' | 'web';
  appVersion: string;
  buildNumber?: string;
  permissionStatus: PermissionStatus;
  tokenChanged?: boolean;
};

export async function upsertDeviceToken(input: UpsertDeviceTokenInput) {
  const existing = await getCurrentDeviceTokenRecord(input.userId, input.deviceId);
  const now = new Date().toISOString();
  const tokenChanged = Boolean(existing && existing.fcmToken !== (input.fcmToken ?? ''));
  const data = {
    userId: input.userId,
    deviceId: input.deviceId,
    fcmToken: input.fcmToken ?? '',
    platform: input.platform,
    appVersion: input.appVersion,
    buildNumber: input.buildNumber ?? '',
    permissionStatus: input.permissionStatus,
    tokenStatus: input.fcmToken ? (tokenChanged ? 'rotated' : existing?.tokenStatus ?? 'untested') : 'invalid',
    receiveStatus: tokenChanged ? 'untested' : existing?.receiveStatus ?? 'untested',
    lastTokenRefreshAt: tokenChanged || input.tokenChanged ? now : existing?.lastTokenRefreshAt ?? null,
    isActive: Boolean(input.fcmToken && input.permissionStatus !== 'denied'),
    updatedAt: now,
  };

  if (existing) {
    const updated = (await databases.updateDocument(
      databaseId,
      collections.deviceTokens,
      existing.$id,
      data,
    )) as unknown as DeviceTokenRecord;
    await updateActiveDeviceReference(input.userId, input.deviceId, updated.$id);
    return updated;
  }

  const created = (await databases.createDocument(
    databaseId,
    collections.deviceTokens,
    ID.unique(),
    {
      ...data,
      deviceTokenId: ID.unique(),
      tokenStatus: input.fcmToken ? 'untested' : 'invalid',
      receiveStatus: 'untested',
      lastTokenRefreshAt: input.fcmToken ? now : null,
      createdAt: now,
    },
    [
      Permission.read(Role.user(input.userId)),
      Permission.update(Role.user(input.userId)),
    ],
  )) as unknown as DeviceTokenRecord;
  await updateActiveDeviceReference(input.userId, input.deviceId, created.$id);
  return created;
}

export async function getCurrentDeviceTokenRecord(userId: string, deviceId: string) {
  const result = await databases.listDocuments(databaseId, collections.deviceTokens, [
    Query.equal('userId', userId),
    Query.equal('deviceId', deviceId),
    Query.limit(1),
  ]);

  return (result.documents[0] as unknown as DeviceTokenRecord | undefined) ?? null;
}

export async function deactivateDeviceToken(userId: string, deviceId: string) {
  const existing = await getCurrentDeviceTokenRecord(userId, deviceId);
  if (!existing) {
    return null;
  }

  return (await databases.updateDocument(databaseId, collections.deviceTokens, existing.$id, {
    isActive: false,
    tokenStatus: 'revoked',
    updatedAt: new Date().toISOString(),
  })) as unknown as DeviceTokenRecord;
}

export async function invokeSendValidation() {
  return executeJson<{ color: 'green' | 'yellow' | 'red'; code: string; message: string }>(
    functionIds.support,
    supportEnvelope('sendValidation', {}),
  );
}

export async function invokeReceiveValidation(deviceId: string, idempotencyKey: string) {
  return executeJson<{ color: 'green' | 'yellow' | 'red'; code: string; message: string }>(
    functionIds.support,
    supportEnvelope('receiveValidation', { deviceId, idempotencyKey }),
  );
}

export async function invokeNotificationFanout(
  request: InvokeNotificationFanoutRequest,
): Promise<InvokeNotificationFanoutResponse> {
  return executeJson<InvokeNotificationFanoutResponse>(functionIds.fanout, request);
}

export async function submitNotificationReceipt(request: SubmitNotificationReceiptRequest) {
  return executeJson<{ ok: boolean; duplicate?: boolean }>(
    functionIds.support,
    supportEnvelope('receipt', request as unknown as Record<string, unknown>),
  );
}

export async function getNotificationJob(jobId: string) {
  const result = await databases.listDocuments(databaseId, collections.notificationJobs, [
    Query.equal('jobId', jobId),
    Query.limit(1),
  ]);

  return (result.documents[0] as unknown as NotificationJob | undefined) ?? null;
}

export async function listNotificationRecipients(jobId: string) {
  const result = await databases.listDocuments(databaseId, collections.notificationRecipients, [
    Query.equal('jobId', jobId),
    Query.limit(100),
  ]);

  return result.documents as unknown as NotificationRecipient[];
}

type RealtimeResponse<T> = {
  events: string[];
  payload: T;
};

export function subscribeToNotificationJob(
  jobId: string,
  onChange: (job: NotificationJob) => void,
) {
  const channel = `databases.${databaseId}.collections.${collections.notificationJobs}.documents.${jobId}`;
  return client.subscribe(channel, (response: RealtimeResponse<NotificationJob>) => {
    onChange(response.payload);
  });
}

export function subscribeToNotificationRecipients(
  jobId: string,
  onChange: (recipient: NotificationRecipient) => void,
) {
  const channel = `databases.${databaseId}.collections.${collections.notificationRecipients}.documents`;
  return client.subscribe(channel, (response: RealtimeResponse<NotificationRecipient>) => {
    if (response.payload.jobId === jobId) {
      onChange(response.payload);
    }
  });
}

export function createOptimisticJob(jobId: string): NotificationJob {
  return {
    $id: jobId,
    jobId,
    requestedByUserId: '',
    notificationType: 'system_test',
    title: 'System test',
    body: 'Notification fanout requested.',
    status: 'queued' satisfies JobStatus,
    targetCount: 0,
    providerAcceptedCount: 0,
    providerRejectedCount: 0,
    confirmedCount: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
}
