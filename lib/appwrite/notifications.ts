import { Query, client, databases, functions } from '@/lib/appwrite/client';
import { appConfig } from '@/lib/config';
import type {
  DeviceTokenRecord,
  InvokeNotificationFanoutRequest,
  InvokeNotificationFanoutResponse,
  JobStatus,
  NotificationJob,
  NotificationRecipient,
  PermissionStatus,
  ReadinessState,
  SubmitNotificationReceiptRequest,
} from '@/types/notifications';

const { databaseId, collections, functions: functionIds } = appConfig.appwrite;

type NotificationSupportAction = 'sendValidation' | 'receiveValidation' | 'receipt' | 'registerDevice' | 'deactivateDevice' | 'ensureProfile';

function supportEnvelope(action: NotificationSupportAction, payload: Record<string, unknown>) {
  return { action, payload };
}

export class NotificationFunctionError extends Error {
  constructor(public readonly code: string, public readonly status: number) {
    super(`Notification service request failed (${code}).`);
    this.name = 'NotificationFunctionError';
  }
}

async function executeJson<T>(functionId: string, payload?: unknown): Promise<T> {
  const result = await functions.createExecution(
    functionId,
    payload === undefined ? undefined : JSON.stringify(payload),
    false,
  );

  let body: unknown;
  try {
    body = JSON.parse(result.responseBody);
  } catch {
    throw new NotificationFunctionError('FUNCTION_INVALID_RESPONSE', result.responseStatusCode);
  }
  if (result.status !== 'completed' || result.responseStatusCode < 200 || result.responseStatusCode >= 300) {
    const code = body && typeof body === 'object' && 'code' in body &&
      typeof body.code === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(body.code)
      ? body.code : 'FUNCTION_UNAVAILABLE';
    throw new NotificationFunctionError(code, result.responseStatusCode);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new NotificationFunctionError('FUNCTION_INVALID_RESPONSE', result.responseStatusCode);
  }
  return body as T;
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
  const { userId, ...registration } = input;
  const record = await executeJson<DeviceTokenRecord>(functionIds.support,
    supportEnvelope('registerDevice', registration));
  if (typeof record.$id !== 'string') throw new NotificationFunctionError('FUNCTION_INVALID_RESPONSE', 200);
  return record;
}

export function ensureNotificationProfile() {
  console.log('[AUTH] Calling ensureProfile function');
  return executeJson<import('@/lib/appwrite/users').AppUserDocument>(functionIds.support,
    supportEnvelope('ensureProfile', {}));
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
  return executeJson<{ ok: boolean }>(functionIds.support,
    supportEnvelope('deactivateDevice', { deviceId }));
}

export async function invokeSendValidation() {
  return validateReadiness(await executeJson<ReadinessState>(
    functionIds.support,
    supportEnvelope('sendValidation', {}),
  ));
}

export async function invokeReceiveValidation(deviceId: string, idempotencyKey: string) {
  return validateReadiness(await executeJson<ReadinessState>(
    functionIds.support,
    supportEnvelope('receiveValidation', { deviceId, idempotencyKey }),
  ));
}

function validateReadiness(result: ReadinessState) {
  if (!['green', 'yellow', 'red'].includes(result.color) || typeof result.code !== 'string' || typeof result.message !== 'string') {
    throw new NotificationFunctionError('FUNCTION_INVALID_RESPONSE', 200);
  }
  return result;
}

export async function invokeNotificationFanout(
  request: InvokeNotificationFanoutRequest,
  userId: string,
  isCancelled: () => boolean = () => false,
): Promise<InvokeNotificationFanoutResponse> {
  const findJob = async () => {
    const result = await databases.listDocuments(databaseId, collections.notificationJobs, [
      Query.equal('idempotencyKey', request.idempotencyKey),
      Query.equal('requestedByUserId', userId),
      Query.equal('notificationType', 'system_test'), Query.limit(1),
    ]);
    return result.documents[0] as unknown as NotificationJob | undefined;
  };
  // Resolve an uncertain previous invocation before scheduling another execution.
  const existing = await findJob();
  if (existing) return { jobId: existing.jobId, status: existing.status };
  if (isCancelled()) throw new NotificationFunctionError('REQUEST_CANCELLED', 0);
  const execution = await functions.createExecution(functionIds.fanout, JSON.stringify(request), true);
  const startedAt = Date.now();
  while (!isCancelled() && Date.now() - startedAt < 180000) {
    const job = await findJob();
    if (job) return { jobId: job.jobId, status: job.status };
    const progress = await functions.getExecution(functionIds.fanout, execution.$id);
    if (progress.status === 'failed' || progress.responseStatusCode >= 400) {
      throw new NotificationFunctionError('FANOUT_EXECUTION_FAILED', progress.responseStatusCode);
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new NotificationFunctionError(isCancelled() ? 'REQUEST_CANCELLED' : 'FUNCTION_TIMEOUT', 0);
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
  const recipients: NotificationRecipient[] = [];
  let cursor: string | undefined;
  do {
    const result = await databases.listDocuments(databaseId, collections.notificationRecipients, [
      Query.equal('jobId', jobId), Query.orderAsc('$id'), Query.limit(100),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ]);
    recipients.push(...result.documents as unknown as NotificationRecipient[]);
    if (result.documents.length < 100) return recipients;
    cursor = result.documents[result.documents.length - 1].$id;
  } while (cursor);
  return recipients;
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
