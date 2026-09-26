import { createAdminClients, Query } from '../../_shared/appwrite';
import { loadConfig } from '../../_shared/env';
import { getFirebaseMessaging } from '../../_shared/firebase';
import { fail, getAuthenticatedUserId, isBoundedString, ok, parseJsonBody, withHandler } from '../../_shared/http';
import { assertJobSchema, claimJob } from '../../_shared/jobs';
import { dispatchNotification } from '../../_shared/dispatch';
import type { DispatchDevice } from '../../_shared/dispatch';
import type { AppwriteFunctionContext } from '../../_shared/http';

const TITLE = 'Push notification test';
const BODY = 'Your Android device received a database-defined notification.';

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
    await assertJobSchema(databases, config);
    const { job, claimed } = await claimJob(databases, config, {
      userId: requesterId, idempotencyKey: request.idempotencyKey, type: 'system_test', title: TITLE, body: BODY,
    });
    if (!claimed) return ok(context, { jobId: job.$id, status: job.status });

    const filters = [Query.equal('platform', 'android'), Query.equal('isActive', true),
      Query.equal('permissionStatus', 'granted'), Query.equal('tokenStatus', ['untested', 'valid', 'rotated']),
      Query.limit(config.fanoutLimit)];
    const result = await databases.listDocuments(config.databaseId, config.deviceTokensCollectionId,
      config.includeSender ? filters : [...filters, Query.notEqual('userId', requesterId)]);
    const tokens = result.documents as unknown as DispatchDevice[];
    await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id, { targetCount: tokens.length });
    let accepted = 0;
    let rejected = 0;
    const names = new Map<string, Promise<string>>();
    let next = 0;
    const workers = await Promise.allSettled(Array.from({ length: Math.min(5, tokens.length) }, async () => {
      while (next < tokens.length) {
        const token = tokens[next++];
        if (!names.has(token.userId)) names.set(token.userId, users.get(token.userId).then((account) => account.name || 'Android user'));
        const outcome = await dispatchNotification(databases, messaging, config, {
          jobId: job.$id, requesterId, token, title: TITLE, body: BODY, username: await names.get(token.userId)!,
        });
        if (outcome.accepted) accepted += 1;
        else rejected += 1;
      }
    }));
    const failedWorker = workers.find((worker) => worker.status === 'rejected');
    if (failedWorker?.status === 'rejected') throw failedWorker.reason;
    const status = rejected === 0 ? 'completed' : accepted > 0 ? 'partially_completed' : 'failed';
    await databases.updateDocument(config.databaseId, config.notificationJobsCollectionId, job.$id, {
      status, providerAcceptedCount: accepted, providerRejectedCount: rejected, completedAt: new Date().toISOString(),
    });
    return ok(context, { jobId: job.$id, status });
  });
}
