import { createAdminClients, Query } from '../../_shared/appwrite';
import { loadConfig } from '../../_shared/env';
import { getFirebaseMessaging } from '../../_shared/firebase';
import { fail, getAuthenticatedUserId, isBoundedString, ok, parseJsonBody, withHandler } from '../../_shared/http';
import { assertJobSchema, claimJob, finalizeClaimedJob } from '../../_shared/jobs';
import { dispatchNotification, rejectOrphanedDevice } from '../../_shared/dispatch';
import type { DispatchDevice } from '../../_shared/dispatch';
import type { AppwriteFunctionContext } from '../../_shared/http';
import { hasStatus } from '../../_shared/transactions';

const TITLE = 'Push notification test';
const BODY = 'Your Android device received a database-defined notification.';
export const FANOUT_WORKER_COUNT = 5;

export default async function main(context: AppwriteFunctionContext) {
  return withHandler(context, async () => {
    const requesterId = getAuthenticatedUserId(context);
    if (!requesterId) return fail(context, 401, 'AUTH_REQUIRED', 'Sign in before sending notifications.');
    const request = parseJsonBody<Record<string, unknown>>(context.req.body);
    if (request.notificationType !== 'system_test' || !isBoundedString(request.idempotencyKey)) {
      return fail(context, 400, 'INVALID_FANOUT_REQUEST', 'Fanout requires system_test and a valid idempotency key.');
    }
    const config = loadConfig();
    const { databases, users } = createAdminClients(config);
    const messaging = getFirebaseMessaging(config);
    const startedAt = Date.now();
    const phases: Record<string, number> = {};
    let phaseStartedAt = startedAt;
    const markPhase = (name: string) => {
      const now = Date.now();
      phases[name] = now - phaseStartedAt;
      phaseStartedAt = now;
    };
    await assertJobSchema(databases, config);
    markPhase('schema');
    const { job, claimed } = await claimJob(databases, config, {
      userId: requesterId, idempotencyKey: request.idempotencyKey, type: 'system_test', title: TITLE, body: BODY,
    });
    markPhase('claim');
    if (!claimed) return ok(context, { jobId: job.$id, status: job.status });

    let accepted = 0;
    let rejected = 0;
    let targetCount = 0;
    try {
      const filters = [Query.equal('platform', 'android'), Query.equal('isActive', true),
        Query.equal('permissionStatus', 'granted'), Query.equal('tokenStatus', ['untested', 'valid', 'rotated']),
        Query.limit(config.fanoutLimit)];
      const result = await databases.listDocuments(config.databaseId, config.deviceTokensCollectionId,
        config.includeSender ? filters : [...filters, Query.notEqual('userId', requesterId)]);
      const tokens = result.documents as unknown as DispatchDevice[];
      targetCount = tokens.length;
      await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id,
        { targetCount });
      markPhase('loadTargets');
      const names = new Map<string, Promise<string>>();
      let next = 0;
      const workers = await Promise.allSettled(Array.from({ length: Math.min(FANOUT_WORKER_COUNT, tokens.length) }, async () => {
        while (next < tokens.length) {
          const token = tokens[next++];
          let username: string;
          try {
            if (!names.has(token.userId)) {
              names.set(token.userId, users.get(token.userId).then((account) => account.name || 'Android user'));
            }
            username = await names.get(token.userId)!;
          } catch (error) {
            names.delete(token.userId);
            if (!hasStatus(error, 404)) throw error;
            await rejectOrphanedDevice(databases, config, { jobId: job.$id, requesterId, token });
            rejected += 1;
            continue;
          }
          const outcome = await dispatchNotification(databases, messaging, config, {
            jobId: job.$id, requesterId, token, title: TITLE, body: BODY, username,
          });
          if (outcome.accepted) accepted += 1;
          else rejected += 1;
        }
      }));
      markPhase('dispatch');
      const failedWorker = workers.find((worker) => worker.status === 'rejected');
      if (failedWorker?.status === 'rejected') throw failedWorker.reason;
      const status = rejected === 0 ? 'completed' : accepted > 0 ? 'partially_completed' : 'failed';
      await finalizeClaimedJob(databases, config, job.$id, { status, accepted, rejected });
      markPhase('finalize');
      return ok(context, { jobId: job.$id, status });
    } catch (error) {
      try {
        await finalizeClaimedJob(databases, config, job.$id, { status: 'failed', accepted, rejected });
      } catch {
        context.error('Fanout job finalization failed.');
      }
      throw error;
    } finally {
      context.log(JSON.stringify({ event: 'fanout_timing', targetCount, accepted, rejected,
        workerCount: FANOUT_WORKER_COUNT, phasesMs: phases, totalMs: Date.now() - startedAt }));
    }
  });
}
