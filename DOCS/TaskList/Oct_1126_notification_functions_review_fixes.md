# Action Item

Fix the problems found in the code review of `functions/notification-fanout` and `functions/notification-support`. Do them in order — Tasks 1 and 2 can break live notifications if skipped; the rest are hardening.

## Task 1: Raise the Function timeout before deploying

- **Task description**: The live Function timeout is 15 seconds. A fanout job can take longer than that. If the runtime kills the function mid-job, the job is stuck in `processing` because the cleanup code never gets a chance to run.
- **Location**: Appwrite Console → each Function → Settings → Timeout. Expected value lives in `functions/deployment-manifest.json` (`timeout: 60`).
- **Expected outcome**: Both live Functions have a timeout that is comfortably bigger than the worst-case run time. The deployment check (`scripts/check-remote-functions.cjs`) stops flagging a timeout mismatch.
- **Implementation pseudocode in natural language**: In the Appwrite Console, open each Function's settings, change the timeout from 15 to 60, and save. Do this at the same time as the entrypoint and build-command changes, so it ships in the same deployment.
- **Comprehensive task explanation**: `Oct_1126_notification_function_deployment_and_resilience.md` (Checklist 7) covers measuring this properly later — this task is the minimum safe value today.
- **TL;DR**: Set both Function timeouts to 60 seconds in the console before activating the new deployments.

## Task 2: Add failure cleanup to receiveValidation

- **Task description**: After `receiveValidation` claims a job, if anything fails afterward, the job stays in `processing` until the stale-job cleanup retires it (up to 5 minutes). Fanout already wraps this section in try/catch; receiveValidation does not.
- **Location**: `functions/notification-support/src/handlers/receiveValidation.ts` (lines 53–61, everything after `claimJob`).
- **Expected outcome**: A claimed validation job always ends in a real status (`completed` or `failed`), even when a database write or account lookup fails.
- **Implementation pseudocode in natural language**: Wrap the work that happens after `claimJob` — the job updates, the `users.get` call, and `dispatchNotification` — in a `try/catch`. In the `catch`, call `finalizeClaimedJob` with `{ status: 'failed', accepted: 0, rejected: 0 }` (wrapped in its own try/catch so a failed cleanup doesn't hide the real error), then re-throw the original error.
- **Comprehensive task explanation**: Look at how `functions/notification-fanout/src/main.ts` lines 45–94 does it — copy that same pattern. `finalizeClaimedJob` already exists in `functions/_shared/jobs.ts` and already refuses to overwrite a finished job, so it is safe to reuse. `dispatchNotification` can leave the recipient record in `pending` — that is Task 4's problem, not this one.
- **TL;DR**: Wrap the post-`claimJob` work in try/catch and finalize the job as `failed` inside the catch, just like fanout does.

## Task 3: Stop hardcoding `notificationType: 'system_test'` in the FCM payload

- **Task description**: `createNotificationData` always writes `notificationType: 'system_test'` into the push data — even when the job is a `receive_validation`. Today nothing breaks because the app only accepts `system_test`, but the data is wrong and will bite later.
- **Location**: `functions/_shared/notificationPayload.ts` (`createNotificationData`), `functions/_shared/dispatch.ts` (the call site), and `lib/push-notifications/payload.ts` (`parseNotificationData`).
- **Expected outcome**: The push data carries the real notification type, and the app accepts every type the backend can send.
- **Implementation pseudocode in natural language**: Add a `notificationType` parameter to `createNotificationData`. Pass it through `dispatchNotification` (add it to that function's `input` object). In `receiveValidation.ts` pass `'receive_validation'`; in fanout's `main.ts` pass `'system_test'`. On the client, update `parseNotificationData` to accept both values instead of only `system_test`.
- **Comprehensive task explanation**: This touches a client contract, so change both sides in the same commit. Check `types/notifications.ts` for the `NotificationData` type — it will need the union widened too. Run `tests/payload.test.ts` after; it asserts on this exact field.
- **TL;DR**: Pass the real job type into the push payload and teach the app to accept both values.

## Task 4: Give `pending` recipient records a way out

- **Task description**: `dispatchNotification` creates a recipient record as `pending`, sends the push, then updates the record. If the update fails — or the function dies right after FCM accepted — the record is stuck in `pending` forever, even though the notification may have been delivered.
- **Location**: `functions/_shared/dispatch.ts` (the create → send → update sequence in `dispatchNotification`).
- **Expected outcome**: Recipient records cannot be stranded in `pending` indefinitely. Either they get reconciled, or `pending` is understood and handled as "send result unknown" wherever it is read.
- **Implementation pseudocode in natural language**: Two reasonable options — pick the simpler one that fits. Option A: when a job finalizes, also mark any of its `pending` recipients as `accepted` only if `providerMessageId` is set, else `rejected` with a `RECONCILED` failure code. Option B: treat old `pending` records as unknown in the places that read them and document that. Do not blindly mark `pending` as delivered — the send may not have happened.
- **Comprehensive task explanation**: FCM is at-least-once delivery — the code comment at `dispatch.ts:59` already acknowledges this. The goal is not perfect accuracy; it is making sure the data does not lie silently. Keep raw provider errors out of any client-visible message.
- **TL;DR**: Add a cleanup so `pending` recipients cannot sit there forever pretending nothing happened.

## Task 5: Rate-limit registerDevice and deactivateDevice

- **Task description**: Only the job-claiming paths are rate-limited. A signed-in user could call `registerDevice` or `deactivateDevice` in a loop and hammer the database with transactions.
- **Location**: `functions/notification-support/src/handlers/device.ts` (the public handlers).
- **Expected outcome**: Repeated rapid calls to device registration are rejected or cheaply deduplicated.
- **Implementation pseudocode in natural language**: Reuse the existing rate-limit pattern in `functions/_shared/jobs.ts` (`rateLimitKey` + unique index + cooldown seconds) rather than inventing a new one. Pick a sensible cooldown (e.g., a few seconds) per user per device. Registration is already idempotent by design, so rejecting duplicates inside the window is safe.
- **Comprehensive task explanation**: The collections may need a `rateLimitKey` attribute or a different dedupe mechanism — check what schema exists first (`assertJobSchema` shows how the jobs collection is verified). If adding a schema attribute is too heavy for this pass, document the gap and defer it — but note it in the changelog.
- **TL;DR**: Use the same rate-limit trick as `claimJob` so device writes can't be spammed.

## Task 6: Remove the dead `'rotated'` token status

- **Task description**: The fanout token filter selects `tokenStatus` in `['untested', 'valid', 'rotated']`, but no code anywhere writes `'rotated'`. It is a dead value that makes readers think a rotation feature exists.
- **Location**: `functions/notification-fanout/src/main.ts` (the `Query.equal('tokenStatus', ...)` filter around line 47).
- **Expected outcome**: The filter only lists statuses the code can actually produce — or token rotation is implemented and writes `'rotated'` (that is a bigger feature; do not do it inside this task).
- **Implementation pseudocode in natural language**: Search the repo for `'rotated'` to confirm nothing writes it. Remove it from the filter list, or add a code comment saying it is reserved for a future token-rotation feature. One line either way.
- **Comprehensive task explanation**: Dead values in filters are not bugs today — they just confuse the next person and make the schema contract look bigger than it is.
- **TL;DR**: Delete `'rotated'` from the filter (or comment why it's there).

## Task 7: Keep safe error detail in `withHandler` logs

- **Task description**: When something unexpected fails, `withHandler` logs only a fixed sentence and throws the real error away. That makes live debugging blind — but raw provider errors must never reach logs or responses.
- **Location**: `functions/_shared/http.ts` (`withHandler`).
- **Expected outcome**: Logs include the error's name and numeric code (e.g., `AppwriteException`, `404`) while still never including messages, tokens, or provider payloads.
- **Implementation pseudocode in natural language**: In the catch block, build a small sanitized string from `error.name` and, only if it is a number, `error.code`. Log that instead of the fixed sentence. Keep the client response exactly as it is.
- **Comprehensive task explanation**: `error.message` can contain anything — do not log it. Name + numeric code are enough to tell a database outage from a permissions problem in the Appwrite console logs.
- **TL;DR**: Log error name and numeric code — never the message.

## Task 8 (optional, cheap wins — batch together if convenient)

- **Task description**: Three small items from the review that are each a few lines.
- **Location**: `functions/_shared/jobs.ts`, `functions/_shared/dispatch.ts`, `functions/_shared/env.ts`.
- **Expected outcome**: Less noise and fewer surprises.
- **Implementation pseudocode in natural language**:
  1. `assertJobSchema` calls `getCollection` on every invocation. Consider caching the result in module scope so warm invocations skip the round-trip (safe because schema changes are rare — but note that a bad cache lasts one container lifetime, so keep it simple or skip).
  2. In `rejectOrphanedDevice`, the stored `receiptNonce` hash proves a send that never happened. Write `null`/a sentinel instead, or comment why it is there.
  3. `includeSender` defaults to `true` — confirm that is the intended production behavior and document it, or flip the default.
- **Comprehensive task explanation**: None of these block deployment. Do them only if they take minutes, not if they grow.
- **TL;DR**: Small cleanups — do the easy ones, skip what grows.

## Verification

After the code changes (Tasks 2–8), run the standard gates before any deployment:

```powershell
npm run functions:check
npm test
npm run functions:package
npm run functions:smoke
```

Task 1 is a console change — it happens alongside the remote deployment steps, not in code.
