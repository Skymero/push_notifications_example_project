# Action Item

- Repair the live Appwrite notification Functions that currently fail because `src/main.js` does not exist in the uploaded archives.
- Add safeguards that compare packaged entrypoints with live Appwrite settings.
- Make fanout tolerate orphaned device records, guarantee claimed jobs leave `processing`, size runtime limits deliberately, and make Function packages reproducible.
- Complete the tasks in order. Tasks 1-3 restore service; Tasks 4-8 harden the implementation and deployment process.

## Confirmed Starting Evidence

- The latest support and fanout executions fail with HTTP `503` and the executor error `Failed to load entrypoint, file src/main.js does not exist.`
- The live Functions are configured with entrypoint `src/main.js` and build command `npm install`.
- The verified archives declare and contain these entrypoints:

  ```text
  dist/notification-support/src/main.js
  dist/notification-fanout/src/main.js
  ```

- Local Function type checks pass.
- All 57 Jest tests pass.
- Both generated archives install and import successfully in isolated temporary directories.
- `authErrors.ts:120` is a frontend fallback message; it is not the source of the backend failure.

## Safety Boundaries

- [ ] Do not print Appwrite API keys, Firebase private keys, FCM tokens, session secrets, or complete third-party error responses.
- [ ] Treat Appwrite setting changes, deployment creation, deployment activation, test notification sends, and database writes as remote mutations.
- [ ] Record the active deployment ID for each Function before changing it.
- [ ] Change and verify one Function at a time.
- [ ] Keep the prior deployment available until all smoke tests pass.
- [ ] Use designated test accounts and Android devices for live notification checks.
- [ ] Do not revert unrelated working-tree changes.

# Checklist 1: Capture the Current Live State

## Task Title: Record a sanitized rollback baseline

- **Task Category**: debugging/documentation
- **Task description**: Capture the current Function configuration, active deployment IDs, latest failed execution IDs, and variable names before making remote changes.
- **Location**: Appwrite Console, a local untracked deployment note, and `reports/` if an automated inspection command is used
- **Expected outcome**: The team can identify exactly what changed and can reactivate the previous deployment if the repair introduces a regression.
- **Implementation pseudocode in natural language**: Inspect each Function without exposing secret values, record identifiers and configuration, confirm the target project, and prepare a rollback table.
- **Comprehensive task explanation**: Entrypoint changes require redeployment. If the new deployment fails for a second reason, the previous deployment ID is the fastest safe rollback target. The baseline must contain metadata, not secret values.
- **TL;DR**: Before touching Appwrite, write down the current Function and deployment settings so the change is auditable and reversible.

### Steps

- [x] Confirm the Appwrite endpoint is the NYC regional endpoint used by this project.
- [x] Confirm the project ID matches the mobile build under test.
- [x] For `Notification Support`, record:
  - Function ID
  - display name
  - runtime
  - timeout
  - execute permissions
  - configured entrypoint
  - configured build command
  - active deployment ID
  - latest execution ID and status
  - environment-variable names only
- [x] Record the same fields for notification fanout.
- [x] Confirm the latest errors for both Functions say that `src/main.js` does not exist.
- [x] Do not record environment-variable values.
- [x] Create a rollback table with one row per Function and its prior active deployment ID.
- [x] Confirm that both prior deployments still appear in Appwrite before continuing.

Execution record: `reports/Oct_1126_notification_function_rollback_baseline.md`

### Acceptance Criteria

- [x] The intended project and both Function IDs are confirmed.
- [x] Both previous active deployment IDs are recorded.
- [x] The baseline contains no secret values.
- [x] The exact pre-change executor error is preserved for comparison.

# Checklist 2: Correct the Support Function Entrypoint

## Task Title: Deploy and activate the verified notification-support archive

- **Task Category**: backend/debugging
- **Task description**: Configure notification support to execute the compiled file that actually exists in its archive, then create and activate a new deployment.
- **Location**: `dist/functions/notification-support.tar.gz`, `functions/notification-support/README.md`, and the live Appwrite support Function
- **Expected outcome**: The support Function loads successfully and returns controlled JSON instead of an executor-level `503`.
- **Implementation pseudocode in natural language**: Rebuild and smoke-test the archive, set the documented build command and compiled entrypoint, create a deployment, wait for readiness, activate it, and execute an unauthenticated probe.
- **Comprehensive task explanation**: Editing the Function setting alone does not alter the active deployment. Appwrite must build a new deployment with the corrected configuration and activate it. The package is precompiled, so Appwrite should install production dependencies and execute the compiled CommonJS entrypoint under `dist`.
- **TL;DR**: Point support at `dist/notification-support/src/main.js`, redeploy it, and prove the executor can reach the handler.

### Steps

- [x] Re-run the support build checks locally:

  ```powershell
  npm run functions:check
  npm run functions:package
  npm run functions:smoke
  ```

- [x] Inspect the support archive inventory:

  ```powershell
  tar -tzf dist\functions\notification-support.tar.gz
  ```

- [x] Confirm the archive includes:

  ```text
  package.json
  package-lock.json
  dist/notification-support/src/main.js
  dist/_shared/*.js
  ```

- [x] Confirm the archived `package.json` has `main` set to `dist/notification-support/src/main.js`.
- [ ] In Appwrite, set the support entrypoint to:

  ```text
  dist/notification-support/src/main.js
  ```

- [ ] Set the build command to the documented precompiled-package command:

  ```text
  npm ci --omit=dev
  ```

- [ ] Do not use `src/main.js`; that path is absent from this archive.
- [ ] Upload `dist/functions/notification-support.tar.gz` as a new deployment.
- [ ] Wait for the deployment status to become `ready`.
- [ ] Inspect build logs for dependency or module errors.
- [ ] Activate the new deployment.
- [ ] Execute the Function without authentication using an empty JSON request.
- [ ] Confirm it returns JSON with HTTP `401` and code `AUTH_REQUIRED`.
- [ ] Confirm the execution log no longer contains `Failed to load entrypoint`.
- [ ] If any gate fails, reactivate the prior deployment and retain the failed execution ID.

### Acceptance Criteria

- [ ] The live support entrypoint is `dist/notification-support/src/main.js`.
- [ ] The active deployment was built after the entrypoint correction.
- [ ] An unauthenticated execution reaches the handler and returns controlled JSON.
- [ ] No empty executor-level `503` remains.

# Checklist 3: Correct the Fanout Function Entrypoint

## Task Title: Deploy and activate the verified notification-fanout archive

- **Task Category**: backend/debugging
- **Task description**: Apply the same archive-to-entrypoint correction to fanout and prove its handler loads before attempting a real send.
- **Location**: `dist/functions/notification-fanout.tar.gz`, `functions/notification-fanout/README.md`, and the live Appwrite fanout Function
- **Expected outcome**: Fanout reaches its authentication boundary and returns controlled JSON instead of failing in the executor.
- **Implementation pseudocode in natural language**: Verify the archive, configure the compiled entrypoint, redeploy, activate, and use a non-sending unauthenticated probe before any authenticated fanout test.
- **Comprehensive task explanation**: Fanout currently has the same missing-file error as support. An unauthenticated request is the safest startup probe because it proves the handler loaded without creating a job or sending an FCM message.
- **TL;DR**: Point fanout at `dist/notification-fanout/src/main.js`, redeploy it, and prove startup with a request that cannot send notifications.

### Steps

- [x] Inspect the fanout archive inventory:

  ```powershell
  tar -tzf dist\functions\notification-fanout.tar.gz
  ```

- [x] Confirm `dist/notification-fanout/src/main.js` exists.
- [x] Confirm the archived `package.json.main` points to that exact path.
- [ ] In Appwrite, set the fanout entrypoint to:

  ```text
  dist/notification-fanout/src/main.js
  ```

- [ ] Set the build command to:

  ```text
  npm ci --omit=dev
  ```

- [ ] Upload `dist/functions/notification-fanout.tar.gz` as a new deployment.
- [ ] Wait for `ready`, inspect build logs, and activate it.
- [ ] Execute fanout without authentication.
- [ ] Confirm it returns JSON with HTTP `401` and code `AUTH_REQUIRED`.
- [ ] Confirm no notification job or recipient row was created by this probe.
- [ ] Confirm the execution log no longer reports a missing entrypoint.
- [ ] Roll back to the prior deployment if startup verification fails.

### Acceptance Criteria

- [ ] The live fanout entrypoint is `dist/notification-fanout/src/main.js`.
- [ ] The corrected deployment is active.
- [ ] The unauthenticated probe reaches the handler without sending FCM.
- [ ] Both live Functions now pass the same startup contract as the isolated package smoke test.

# Checklist 4: Add Remote Deployment Drift Detection

## Task Title: Make deployment checks compare live Appwrite configuration

- **Task Category**: testing/debugging
- **Task description**: Add an opt-in, read-only check that compares each live Function's ID, runtime, entrypoint, build command, active deployment status, and required variable names with repository expectations.
- **Location**: `scripts/check-deployment.cjs`, a new server-side inspection script if separation is clearer, `package.json`, `.env.example`, and deployment documentation
- **Expected outcome**: A developer receives a failing check before device testing whenever Appwrite is configured to execute a path absent from the package.
- **Implementation pseudocode in natural language**: Read expected settings from a structured local manifest, fetch live Function metadata using server credentials, compare non-secret fields, report sanitized differences, and exit nonzero on drift.
- **Comprehensive task explanation**: The existing package smoke test validates `package.json.main`, while the deployment check explicitly leaves Functions unverified. Neither test compares the package with Appwrite's configured entrypoint, which allowed all local checks to pass while production failed instantly.
- **TL;DR**: Add a read-only gate that fails when the live Appwrite entrypoint or deployment does not match the archive that was tested.

### Steps

- [ ] Define expected metadata for both Functions in one structured source, including:
  - Function ID
  - expected entrypoint
  - expected build command
  - supported runtime policy
  - required variable names
- [ ] Keep API keys and variable values out of that manifest.
- [ ] Add an opt-in script that authenticates with a server API key from process environment.
- [ ] Fetch live Function metadata without mutating Appwrite.
- [ ] Compare live entrypoints against:

  ```text
  dist/notification-support/src/main.js
  dist/notification-fanout/src/main.js
  ```

- [ ] Compare build commands after normalizing harmless whitespace.
- [ ] Confirm an active deployment exists and its status is `ready`.
- [ ] Confirm required environment-variable names exist without requesting or printing secret values.
- [ ] Report missing variables by name only.
- [ ] Redact API keys, authorization headers, private keys, tokens, and provider responses at the final logging boundary.
- [ ] Exit nonzero when the entrypoint, active deployment, or required variables are wrong.
- [ ] Add a package script such as `functions:remote-check`.
- [ ] Keep the existing public `deployment:check` usable without server credentials.
- [ ] Add unit tests with fake Appwrite responses for match, mismatch, missing deployment, and missing variable cases.

### Acceptance Criteria

- [ ] A simulated `src/main.js` live setting fails the remote check.
- [ ] Correct `dist/.../main.js` settings pass.
- [ ] No secret value is printed in success or failure output.
- [ ] The check is read-only and clearly marked as requiring server credentials.

# Checklist 5: Isolate Orphaned Fanout Recipients

## Task Title: Prevent one deleted account from aborting the entire fanout job

- **Task Category**: backend
- **Task description**: Handle device-token rows whose `userId` no longer resolves to an Appwrite account without rejecting a worker or stranding the job.
- **Location**: `functions/notification-fanout/src/main.ts`, shared dispatch helpers, and `tests/backend.test.ts`
- **Expected outcome**: Valid recipients continue receiving notifications when one token references a deleted account, and the orphan is recorded or deactivated safely.
- **Implementation pseudocode in natural language**: Resolve recipient accounts inside a per-token boundary, classify a missing account, deactivate or reject only that recipient, continue processing other tokens, and finalize aggregate counts.
- **Comprehensive task explanation**: The current worker awaits `users.get(token.userId)` before calling `dispatchNotification`. A `404` rejects the worker, line 53 rethrows it, and the final job update never runs. This converts one stale database row into a fanout-wide outage.
- **TL;DR**: Skip and quarantine orphaned device rows instead of letting one deleted user stop notifications for everyone else.

### Steps

- [ ] Add a helper that recognizes an Appwrite `404` without depending on error message text.
- [ ] Move account lookup into the per-token error boundary.
- [ ] When the account is missing:
  - do not call Firebase
  - mark or deactivate the orphaned token using a server-owned write
  - record a sanitized recipient rejection if the schema supports it
  - increment the rejected count once
  - continue to the next token
- [ ] Do not expose the deleted account ID or token in client-facing error messages.
- [ ] Re-throw unexpected account-service errors so transient infrastructure failures are not silently treated as deleted users.
- [ ] Ensure all workers continue after a handled orphan.
- [ ] Add a test with at least one orphan and one valid token.
- [ ] Assert the valid token is sent exactly once.
- [ ] Assert the orphan does not trigger an FCM send.
- [ ] Assert the job reaches `partially_completed` or the explicitly approved terminal status.
- [ ] Add a test where every selected token is orphaned and verify a terminal failed result.

### Acceptance Criteria

- [ ] One orphan cannot abort unrelated deliveries.
- [ ] Orphaned tokens are no longer repeatedly selected.
- [ ] Accepted and rejected counters remain accurate.
- [ ] The job reaches a terminal state.

# Checklist 6: Guarantee Claimed Jobs Are Finalized

## Task Title: Add failure finalization around fanout processing

- **Task Category**: backend/debugging
- **Task description**: Ensure a job that was successfully claimed cannot remain `processing` merely because a worker, account lookup, recipient write, or final update failed.
- **Location**: `functions/notification-fanout/src/main.ts`, `functions/_shared/jobs.ts`, and `tests/backend.test.ts`
- **Expected outcome**: Every claimed job either completes, partially completes, fails with sanitized state, or remains explicitly recoverable with enough persisted evidence for retry.
- **Implementation pseudocode in natural language**: Wrap post-claim processing in a finalization boundary, preserve successful recipient outcomes, calculate terminal status, attempt a guarded failure update, and keep the original error for server logs.
- **Comprehensive task explanation**: `withHandler()` returns controlled JSON but cannot repair domain state. Once `claimJob()` creates a `processing` row, the fanout handler owns finalization. Relying only on stale-job cleanup leaves users seeing a stuck job for the full stale interval.
- **TL;DR**: Once fanout claims a job, always close it out or explicitly mark it recoverable before returning an error.

### Steps

- [ ] Mark the exact point after which the handler owns a newly claimed job.
- [ ] Wrap token loading, account lookup, dispatch workers, and aggregate persistence in a `try/catch/finally` or equivalent explicit state machine.
- [ ] Preserve counts for recipients that completed before another worker failed.
- [ ] On an unexpected failure, attempt a sanitized update containing:
  - terminal or recoverable status
  - accepted count
  - rejected count
  - completed timestamp when terminal
- [ ] Do not overwrite a more advanced status written by another execution.
- [ ] Do not retry FCM sends blindly after provider acceptance.
- [ ] Keep stale-job retirement as a recovery backstop, not the normal failure path.
- [ ] Add tests for failures during:
  - token query
  - account lookup
  - pending-recipient creation
  - provider-result persistence
  - final job update
- [ ] Assert each test leaves an intentional job status.
- [ ] Assert client responses contain only approved error codes and messages.

### Acceptance Criteria

- [ ] No tested post-claim failure leaves an unexplained `processing` job.
- [ ] Successful sends are not repeated during recovery.
- [ ] Partial counts remain truthful.
- [ ] Provider tokens and raw provider errors remain absent from logs and responses.

# Checklist 7: Size Runtime Limits Against Fanout Work

## Task Title: Measure and configure timeout, fanout limit, and concurrency together

- **Task Category**: backend/testing
- **Task description**: Benchmark realistic fanout executions and set an Appwrite timeout that accommodates the approved recipient limit and worker concurrency.
- **Location**: `functions/notification-fanout/src/main.ts`, `functions/_shared/env.ts`, Function deployment settings, and performance-test documentation
- **Expected outcome**: The maximum supported fanout completes within a documented safety margin, or the recipient limit is reduced to fit the available Function runtime.
- **Implementation pseudocode in natural language**: Measure per-recipient latency, test representative batches, calculate worst-case duration, choose limits, update configuration, redeploy, and confirm behavior under slow dependencies.
- **Comprehensive task explanation**: The live timeout is 15 seconds, while fanout allows 100 recipients with five workers. Every recipient can require account access, database writes, FCM, and a transaction. A hard timeout can interrupt finalization and recreate stuck jobs even after source-level error handling improves.
- **TL;DR**: Do not guess: measure how long fanout takes, then make timeout, batch size, and concurrency agree.

### Steps

- [ ] Record the current live timeout, fanout limit, and worker count.
- [ ] Add timing instrumentation that records aggregate phase duration without logging user IDs or tokens.
- [ ] Create a controlled test dataset with representative recipient counts such as 1, 10, 25, 50, and 100.
- [ ] Test normal and intentionally delayed Appwrite/Firebase doubles locally.
- [ ] Run a controlled live test only with designated devices or a safe provider stub.
- [ ] Calculate p95 duration for each approved batch size.
- [ ] Require a safety margin below the configured timeout.
- [ ] Choose one remediation if 100 recipients do not fit:
  - increase the Function timeout within plan limits
  - reduce `NOTIFICATION_FANOUT_LIMIT`
  - reduce per-recipient work
  - implement queued/batched fanout in a separate approved design
- [ ] Document the selected timeout and why it is sufficient.
- [ ] Align the documented runtime with the actual live runtime or redeploy on the documented Node runtime.
- [ ] Add a test proving `NOTIFICATION_FANOUT_LIMIT` cannot exceed the reviewed maximum.

### Acceptance Criteria

- [ ] Maximum approved fanout finishes within the documented margin.
- [ ] Timeout and recipient limits are captured in deployment documentation.
- [ ] A timeout cannot leave a job without the recovery behavior from Checklist 6.
- [ ] Runtime-version drift is removed or explicitly accepted and documented.

# Checklist 8: Make Packaging Reproducible and Complete Final Verification

## Task Title: Stabilize production dependency locks and run end-to-end acceptance

- **Task Category**: backend/testing/documentation
- **Task description**: Stop resolving a fresh transitive dependency graph during every package run, verify deterministic artifacts, then complete authenticated Function and Android notification tests.
- **Location**: `scripts/package-functions.cjs`, Function manifests and lockfiles, `scripts/verify-function-packages.cjs`, `package.json`, deployment documentation, and a designated Android device
- **Expected outcome**: Identical source and lock inputs produce equivalent Function dependencies, and the repaired deployment passes server and device acceptance tests.
- **Implementation pseudocode in natural language**: Commit or derive a stable production lock, install with `npm ci`, normalize archive metadata, compare repeated builds, audit dependencies, deploy, and execute the complete notification workflow.
- **Comprehensive task explanation**: The packager currently runs `npm install --package-lock-only` in a fresh directory, allowing transitive dependency resolution to change over time. Reproducible locks make deployments reviewable and reduce the chance that a future rebuild introduces an unrelated runtime change.
- **TL;DR**: Freeze the dependency graph, prove repeated packages are equivalent, then finish with authenticated Appwrite and real-device notification tests.

### Steps

- [ ] Decide whether each Function owns a committed production lock or both archives derive from one approved root lock.
- [ ] Ensure the selected lock records exact transitive versions.
- [ ] Replace fresh dependency resolution with a lock-preserving packaging step.
- [ ] Use `npm ci --omit=dev` to validate the staged package.
- [ ] Normalize archive timestamps, ownership, and file ordering where supported.
- [ ] Build each archive twice from an unchanged clean input.
- [ ] Compare archive inventories and extracted file hashes.
- [ ] Explain any remaining archive-byte difference caused solely by compression metadata.
- [ ] Run a production dependency audit and review deprecated transitive packages.
- [ ] Do not apply breaking automated audit fixes without reviewing Firebase Admin and Appwrite compatibility.
- [ ] Run the full local verification suite:

  ```powershell
  npm run typecheck
  npm test -- --runInBand
  npm run functions:check
  npm run functions:package
  npm run functions:smoke
  npm run deployment:check
  ```

- [ ] Run the new read-only remote Function check from Checklist 4.
- [ ] Execute authenticated support actions:
  - `ensureProfile`
  - `registerDevice`
  - `sendValidation`
  - `receiveValidation`
  - `receipt`
  - `deactivateDevice`
- [ ] Run fanout using a unique idempotency key and designated recipients.
- [ ] Verify job, recipient, token, and receipt state in Appwrite.
- [ ] Test foreground, background, terminated, and notification-open receipt paths on Android.
- [ ] Confirm the app no longer reaches the generic `authErrors.ts:120` message during normal profile setup.
- [ ] Retain sanitized execution IDs, deployment IDs, test timestamps, and the rollback table.

### Acceptance Criteria

- [ ] Repeated packaging uses the same dependency graph.
- [ ] All local checks pass.
- [ ] Remote configuration matches the verified archive entrypoints.
- [ ] All six authenticated support actions pass.
- [ ] Fanout handles valid and orphaned recipients without stranding the job.
- [ ] The designated Android device confirms notification receipts in required lifecycle states.
- [ ] No credentials, FCM tokens, or raw provider errors appear in artifacts or reports.

# Definition of Done

- [ ] Support and fanout execute their compiled `dist/.../main.js` entrypoints.
- [ ] Corrected deployments are active and prior deployment IDs are retained for rollback.
- [ ] Empty executor-level `503` responses are eliminated.
- [ ] Remote drift detection would fail if either entrypoint returned to `src/main.js`.
- [ ] Orphaned device rows cannot abort unrelated fanout deliveries.
- [ ] Every claimed job reaches an intentional terminal or recoverable state.
- [ ] Timeout, fanout limit, worker count, and runtime version are aligned and documented.
- [ ] Production dependencies are locked reproducibly.
- [ ] Local, remote, authenticated, and Android-device acceptance checks pass.

# Completion Report Requirements

When the checklist is complete, report:

- Function IDs and display names
- Previous and newly activated deployment IDs
- Final runtime, timeout, build command, and entrypoint for each Function
- Source files changed
- Tests and package checks run
- Remote drift-check result
- Orphan-recipient behavior verified
- Timeout benchmark results and selected limits
- Dependency audit and reproducibility results
- Authenticated support and fanout execution IDs
- Android foreground/background/terminated receipt results
- Rollback status
- Remaining risks or manual verification items
