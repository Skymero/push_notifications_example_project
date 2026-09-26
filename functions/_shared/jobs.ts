import { createHash } from 'crypto';
import type { Databases } from 'node-appwrite';
import { Permission, Query, Role } from './appwrite';
import type { FunctionConfig } from './env';
import { RequestError } from './http';
import { deterministicId } from './notificationPayload';
import { hasStatus } from './transactions';

export async function assertJobSchema(databases: Databases, config: FunctionConfig) {
  const collection = await databases.getCollection(config.databaseId, config.notificationJobsCollectionId);
  const attribute = collection.attributes.find((value: any) => value.key === 'rateLimitKey') as
    { status?: string; size?: number } | undefined;
  const index = collection.indexes.find((value) =>
    value.type === 'unique' && value.status === 'available' &&
    value.attributes.length === 1 && value.attributes[0] === 'rateLimitKey');
  if (attribute?.status !== 'available' || Number(attribute.size) < 64 || !index) {
    throw new RequestError(500, 'SERVER_MISCONFIGURED', 'The notification job rate-limit schema is not ready.');
  }
}

export async function claimJob(
  databases: Databases,
  config: FunctionConfig,
  request: { userId: string; idempotencyKey: string; type: 'system_test' | 'receive_validation';
    title: string; body: string; deviceId?: string },
) {
  const jobId = deterministicId('job', request.userId, request.type, request.deviceId ?? '', request.idempotencyKey);
  const existing = await databases.getDocument(config.databaseId, config.notificationJobsCollectionId, jobId)
    .catch((error: unknown) => { if (hasStatus(error, 404)) return null; throw error; });
  if (existing) return { job: await retireStaleJob(databases, config, existing), claimed: false };

  const now = new Date().toISOString();
  const cooldown = request.type === 'system_test' ? config.fanoutCooldownSeconds : config.validationCooldownSeconds;
  const rateLimitKey = createHash('sha256').update(JSON.stringify([
    request.userId, request.type, request.deviceId ?? '', Math.floor(Date.now() / (cooldown * 1000)),
  ])).digest('hex');
  const storedIdempotencyKey = request.type === 'system_test' ? request.idempotencyKey :
    deterministicId(request.type, request.deviceId ?? '', request.idempotencyKey);
  try {
    const job = await databases.createDocument(config.databaseId, config.notificationJobsCollectionId, jobId, {
      jobId, idempotencyKey: storedIdempotencyKey,
      rateLimitKey, requestedByUserId: request.userId,
      notificationType: request.type, title: request.title, body: request.body, status: 'processing',
      targetCount: 0, providerAcceptedCount: 0, providerRejectedCount: 0, confirmedCount: 0,
      createdAt: now, completedAt: null,
    }, [Permission.read(Role.user(request.userId))]);
    return { job, claimed: true };
  } catch (error) {
    if (!hasStatus(error, 409)) throw error;
    const winner = await databases.getDocument(config.databaseId, config.notificationJobsCollectionId, jobId)
      .catch((readError: unknown) => { if (hasStatus(readError, 404)) return null; throw readError; });
    if (winner) return { job: winner, claimed: false };
    const prior = await databases.listDocuments(config.databaseId, config.notificationJobsCollectionId, [
      Query.equal('requestedByUserId', request.userId), Query.equal('idempotencyKey', storedIdempotencyKey), Query.limit(1),
    ]);
    if (prior.documents[0]) {
      if (prior.documents[0].notificationType === request.type) {
        return { job: await retireStaleJob(databases, config, prior.documents[0]), claimed: false };
      }
      throw new RequestError(409, 'IDEMPOTENCY_CONFLICT', 'The request key is already used by a different operation.');
    }
    throw new RequestError(429, 'RATE_LIMITED', 'Wait briefly before sending another notification.');
  }
}

async function retireStaleJob(databases: Databases, config: FunctionConfig, job: any) {
  const createdAt = Date.parse(String(job.createdAt));
  if (job.status === 'processing' && (!Number.isFinite(createdAt) || Date.now() - createdAt > config.jobStaleSeconds * 1000)) {
    return databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id, {
      status: 'failed', completedAt: new Date().toISOString(),
    });
  }
  return job;
}
