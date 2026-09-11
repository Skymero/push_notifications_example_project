# Junior Developer Checklist: Post-Review Runtime Hardening

Source documents to read before starting:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 3.4, 7, 8.12 through 8.15, 10, 11, 15, 18, 19, 20, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially receive validation, fanout, recipient processing, receipt confirmation, and token rotation.
- [ ] Read `Code Review Jr Checklists/01-backend-functions-missing.md`.
- [ ] Read `Code Review Jr Checklists/03-user-document-registration.md`.
- [ ] Read `Code Review Jr Checklists/04-receive-readiness-confirmed-receipts.md`.
- [ ] Read `Code Review Jr Checklists/05-realtime-job-monitoring.md`.
- [ ] Read `Code Review Jr Checklists/06-token-lifecycle.md`.
- [ ] Read `Code Review Jr Checklists/07-receipt-retry-classification.md`.
- [ ] Read `Code Review Jr Checklists/10-test-coverage.md`.
- [ ] Read `Code Review Jr Checklists/backend-database-spec-sheet.md`.
- [ ] Before handoff, verify every fix still follows the plan in `Project_details/`.

## 1. Fix Appwrite Function Error Handling In The Client

- [ ] Inspect `lib/appwrite/notifications.ts`.
- [ ] Update `executeJson` so it checks Appwrite execution status and function response status before returning parsed data.
- [ ] If the function returns `{ ok: false, code, message }`, throw or return a typed failure that callers handle explicitly.
- [ ] Update `invokeSendValidation`, `invokeReceiveValidation`, `invokeNotificationFanout`, and `submitNotificationReceipt` to use the normalized failure path.
- [ ] Update `useNotificationReadiness` so confirmed provider failures turn the receive LED red, not yellow.
- [ ] Add unit tests for success, function error body, malformed JSON, and empty response body.

Task reasoning:

The PRD requires normalized errors and accurate readiness colors. Appwrite executions can complete technically while the function body reports an application failure, so the client must distinguish transport success from notification-domain success. Without this, a rejected FCM token or unauthorized receipt can be treated like a valid response, which makes the LEDs unreliable.

Acceptance criteria:

- [ ] FCM token rejection from `notification-receive-validation` becomes a red receive status.
- [ ] A function unavailable state still shows the existing function-unavailable message.
- [ ] Duplicate receipt responses remain success for retry removal.
- [ ] No raw stack traces are shown in the UI.

## 2. Move Backend-Controlled Token Fields Out Of Direct Client Writes

- [ ] Inspect `lib/appwrite/notifications.ts`, `lib/push-notifications/deviceRegistration.ts`, and `functions/notification-receipt/src/main.ts`.
- [ ] Split device-token fields into client-controlled and backend-controlled groups.
- [ ] Keep direct client upsert limited to `userId`, `deviceId`, `fcmToken`, `platform`, `appVersion`, `buildNumber`, `permissionStatus`, and client timestamps that are allowed by the spec.
- [ ] Move `tokenStatus`, `receiveStatus`, `lastValidatedAt`, `lastReceivedAt`, and authoritative validity changes to Appwrite Functions.
- [ ] Update `Code Review Jr Checklists/backend-database-spec-sheet.md` if any permission or attribute notes need clarification.
- [ ] Add tests or fixtures proving the client cannot mark itself `valid` or `verified`.

Task reasoning:

The project allows direct client database upsert only for the current user's token registration data. It does not allow the client to decide whether a token is valid or whether the device has received a validation notification. Those are backend facts produced by Appwrite Functions and FCM/receipt outcomes, so keeping them out of client writes protects the readiness model from accidental or malicious self-certification.

Acceptance criteria:

- [ ] The mobile client cannot directly set `receiveStatus = verified`.
- [ ] The mobile client cannot directly set `tokenStatus = valid`.
- [ ] Receipt and validation functions remain the only authority for confirmed receive readiness.
- [ ] The design still respects direct client database upsert for the user's own Android token.

## 3. Make Appwrite Function Builds Deployable

- [ ] Inspect every `functions/*/README.md`, `functions/*/tsconfig.json`, and `functions/*/src/main.ts`.
- [ ] Decide one deployable structure and document it:
  - either each function owns a local copy of shared helpers, or
  - all functions use a bundler that includes `functions/_shared` in the emitted output.
- [ ] Ensure Appwrite Console root directory, build command, and entry point match the actual emitted files.
- [ ] Run a clean build from each function directory, not only from the root workspace.
- [ ] Confirm the emitted JavaScript can run under the selected Appwrite Node runtime.
- [ ] Update `appwrite-functions-fanout-checklist.md` with the final root directory, build command, and entry point pattern.

Task reasoning:

Passing TypeScript locally is not enough for Appwrite installation readiness. Appwrite deploys a function from the configured root directory, so shared helper imports, build output paths, and ESM/CommonJS behavior must match the actual deployed package. This task prevents a function that looks correct in the repo from failing immediately in the Appwrite console runtime.

Acceptance criteria:

- [ ] `npm run functions:check` passes.
- [ ] `npm run build` passes inside each function directory.
- [ ] The deployed artifact includes shared helpers.
- [ ] No function import reaches outside the deployed function bundle at runtime.

## 4. Correct Receipt Aggregation

- [ ] Inspect `functions/notification-receipt/src/main.ts`.
- [ ] Count a recipient as confirmed only once per `recipientRecordId`.
- [ ] Do not increment `confirmedCount` when a recipient already has `receiptStatus = received` or `opened`.
- [ ] Preserve `openedAt` when an opened event follows a received event.
- [ ] Keep `notification_receipts` append-only for audit events.
- [ ] Add backend tests or fixtures for received-then-opened, duplicate received, duplicate opened, and two different recipients.

Task reasoning:

`confirmedCount` represents how many target devices confirmed receipt, not how many receipt events were recorded. A single recipient can send `received`, `displayed`, and `opened` events, but it should count as one confirmed recipient. Keeping the audit table append-only preserves event history while the job aggregate remains meaningful.

Acceptance criteria:

- [ ] `confirmedCount` equals the number of unique recipient records with confirmed receipt.
- [ ] `opened` events do not double-count a recipient already marked `received`.
- [ ] Duplicate receipt submissions remain idempotent.

## 5. Filter Fanout To Receive-Verified Android Tokens

- [ ] Inspect `functions/notification-fanout/src/main.ts`.
- [ ] Add `Query.equal('receiveStatus', 'verified')` to normal fanout eligibility.
- [ ] Keep `notification-receive-validation` allowed to send to an unverified token owned by the current user.
- [ ] Normalize permanent FCM token failures into `FCM_TOKEN_INVALID` or `FCM_TOKEN_UNREGISTERED`.
- [ ] Mark permanently rejected token records inactive or invalid in the function.
- [ ] Add fanout eligibility tests for untested, failed, expired, invalid, rotated, revoked, inactive, and verified tokens.

Task reasoning:

The PRD separates provider acceptance from confirmed device receipt. Regular fanout should target devices that have already proven they can receive notifications, while receive validation is the special path used to prove an unverified current device. This keeps production fanout from repeatedly targeting stale, untested, or failed tokens.

Acceptance criteria:

- [ ] Regular fanout excludes unverified devices.
- [ ] Receive validation can still validate the current user's unverified device.
- [ ] Permanently invalid tokens are excluded from future fanout.

## 6. Add Fanout Pagination And Batching

- [ ] Inspect `functions/notification-fanout/src/main.ts`.
- [ ] Replace the single `Query.limit(100)` token query with cursor or offset pagination.
- [ ] Process at least 1,000 eligible Android device-token records without loading an unbounded collection.
- [ ] Use Firebase Admin batch or multicast APIs where supported by the selected SDK/runtime.
- [ ] Update recipient creation and aggregate updates so partial batches still leave a consistent job record.
- [ ] Add tests or fixtures for zero, one, 100, 101, and 1,000 recipients.

Task reasoning:

The first implementation only reads one page of tokens, which can silently skip valid recipients once the collection grows. The PRD requires at least 1,000 recipient records and bounded memory usage. Pagination and batching make the function scale predictably while keeping job counts accurate.

Acceptance criteria:

- [ ] The function does not silently skip recipients after the first 100.
- [ ] Job aggregates match all processed eligible recipients.
- [ ] Function memory usage remains bounded by page or batch size.

## 7. Add Receive-Validation Idempotency

- [ ] Inspect `functions/notification-receive-validation/src/main.ts`.
- [ ] Before creating a validation job, query `notification_jobs` by `idempotencyKey` and `requestedByUserId`.
- [ ] If a matching job exists, return its `jobId`, current status, and current receive readiness state.
- [ ] If a duplicate create race occurs, recover by fetching the existing job instead of returning a 500.
- [ ] Add tests or fixtures for repeated validation calls with the same key.

Task reasoning:

Receive validation can be retried because of app foreground refreshes, network retries, or user retaps. Idempotency prevents duplicate validation jobs and duplicate test notifications for the same attempt. It also turns database unique-index races into a recoverable path instead of a generic function failure.

Acceptance criteria:

- [ ] Retrying receive validation with the same idempotency key does not create duplicate jobs.
- [ ] Retrying receive validation does not send duplicate validation notifications unless intentionally configured.
- [ ] Unique index errors do not surface as generic function failures.

## 8. Register Background Messaging From The JS Entry Path

- [ ] Inspect `app/_layout.tsx`, `package.json`, and the Expo Router entry setup.
- [ ] Confirm whether `registerBackgroundMessagingHandler()` runs early enough for Android terminated-state messages.
- [ ] If not, create a custom entry file that imports/registers the Firebase background handler before `expo-router/entry`.
- [ ] Update `package.json` `main` if a custom entry is required.
- [ ] Verify this still works with Expo Router and Android development builds.
- [ ] Add Android physical-device test steps to `README.md` if the startup behavior changes.

Task reasoning:

Android background and terminated-state notification handling depends on registering the Firebase background handler early enough in the JavaScript startup path. Registering it inside a layout component may be too late for messages that arrive before React mounts. This task protects the PRD requirement that foreground, background, and terminated flows all submit or queue receipts.

Acceptance criteria:

- [ ] Foreground messages still submit receipts.
- [ ] Background messages submit or queue receipts.
- [ ] Terminated-state notification open is processed.
- [ ] Listener cleanup still happens for foreground/open handlers.

## 9. Align `deviceTokenId` With The Appwrite Document ID

- [ ] Inspect `lib/appwrite/notifications.ts`.
- [ ] Change new device-token creation so `deviceTokenId` mirrors the created document `$id`.
- [ ] If using a generated document ID, generate it once and pass it both as the document ID and `deviceTokenId`.
- [ ] Update tests or fixtures that depend on device-token identity.
- [ ] Confirm `users.activeDeviceTokenId`, recipient `deviceTokenId`, and receipt validation all refer to the same document identity.

Task reasoning:

The backend spec describes `deviceTokenId` as the Appwrite token document identity. If the stored `deviceTokenId` differs from `$id`, later functions and developers can fetch the wrong value or write confusing references. A single identity model makes user active-device references, recipient records, and receipt authorization line up.

Acceptance criteria:

- [ ] `deviceTokenId` and `$id` refer to the same token record.
- [ ] Receipt authorization can reliably fetch the target device-token document.
- [ ] The backend spec and code describe the same identity model.

## 10. Final Verification

- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run functions:check`.
- [ ] Run `npm run build` inside each function directory after the deployable build structure is fixed.
- [ ] Re-read `Project_details/database_defined_push_notification_prd.md` section 21 and mark each global acceptance criterion as automated, manually tested, or still blocked.
- [ ] Update `Code Review Jr Checklists/EXECUTION_REPORT.md` with completed fixes and remaining account/device blockers.

Task reasoning:

These fixes touch client behavior, backend function deployment, database permissions, and Android device behavior. The final verification step proves that the repo still compiles, tests still cover the critical pure logic, function packages still typecheck, and remaining risks are explicitly tracked against the PRD acceptance criteria.

## Work Explanation

This checklist turns the latest code-review findings into implementation tasks. The main work is hardening the runtime contract between the React Native Android client, Appwrite Functions, Appwrite Database, and Firebase FCM so that the app is closer to install-ready behavior rather than only TypeScript-ready behavior.

## Logic Behind It

The project plan in `Project_details/` requires backend-authoritative fanout, secure token lifecycle state, confirmed device receipts, idempotent retries, deployable Appwrite Functions, and Android foreground/background/terminated handling. These findings mostly affect runtime correctness and security boundaries, so the checklist prioritizes fixes that prevent false readiness states, duplicate records, skipped recipients, undeployable functions, and client-side manipulation of backend-controlled notification status.
