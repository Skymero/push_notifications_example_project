# Code Review: `notification-support` and `notification-fanout` Deploy Readiness

**Review date:** September 7, 2026  
**Review scope:** `notification-fanout`, generated `notification-support` implementation patch, shared function helpers, client invocation contract, Firebase/Appwrite deploy requirements  
**Reference docs:** `.devin/AGENTS.md`, `Project_details/notification_option2_functions_prd.md`, `Project_details/appwrite_free_tier_function_setup_options.md`

## Verdict

Not ready to deploy yet.

`notification-fanout` exists and type-checks, but it has several correctness and production-readiness gaps. `notification-support` is not currently present as a real folder under `functions`; it exists only as `Project_details/notification_support_function_implementation.patch`, so Appwrite cannot deploy it from the current workspace state.

Confidence: **0.90**

## Findings

### Critical: `notification-support` is not an actual deployable Appwrite Function

Evidence:

- `functions/notification-support` does not exist.
- The implementation only exists in `Project_details/notification_support_function_implementation.patch`.
- The package is therefore not included in the root `functions/*` workspace during `npm run functions:check`.

Impact:

Appwrite cannot deploy `notification-support` because the expected function root directory is missing. The current Appwrite deployment would still require the old three support functions or would fail support calls entirely.

Action item:

- Materialize the patch into `functions/notification-support`.
- Run `npm install` from the repo root so the new workspace is reflected locally.
- Run `npm run functions:check` again and confirm `notification-support@1.0.0 check` appears in the output.

### Critical: The mobile client is still wired for four separate function IDs

Evidence:

- `.env.example:9-12` still defines:
  - `EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID`
- `lib/config.ts:21-28` still exposes `sendValidation`, `receiveValidation`, `fanout`, and `receipt`.
- `lib/appwrite/notifications.ts:113-132` still invokes three separate support functions and sends raw payloads instead of the `notification-support` `{ action, payload }` envelope.

Impact:

Even if `notification-support` is deployed, the app will not call it. This defeats the option-2 architecture and still expects four Appwrite Functions.

Action item:

- Replace the three support IDs with `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID`.
- Keep `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID`.
- Update support calls to:

```ts
executeJson(functionIds.support, { action: 'sendValidation', payload: {} });
executeJson(functionIds.support, { action: 'receiveValidation', payload: { deviceId, idempotencyKey } });
executeJson(functionIds.support, { action: 'receipt', payload: request });
```

### High: Receipt nonce validation allows missing nonce

Evidence:

- `Project_details/notification_support_function_implementation.patch:340`
- Existing standalone receipt function has the same pattern in `functions/notification-receipt/src/main.ts`.

Current logic only rejects when both `recipient.receiptNonce` and `request.receiptNonce` exist and differ. If the recipient record has a nonce but the request omits `receiptNonce`, the receipt is accepted.

Impact:

The receipt nonce is meant to bind a receipt to the notification payload. Allowing omission weakens spoofing protection and violates the PRD requirement that receipt ownership, nonce, and device-token state are verified before trusted writes.

Action item:

Change the check to require equality whenever the recipient has a nonce:

```ts
if (recipient.receiptNonce && recipient.receiptNonce !== request.receiptNonce) {
  return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt validation nonce did not match.');
}
```

### High: `confirmedCount` can double-count receipt events

Evidence:

- `Project_details/notification_support_function_implementation.patch:385`
- Existing standalone receipt function has the same behavior in `functions/notification-receipt/src/main.ts`.

Each new receipt idempotency key increments `confirmedCount`. A single recipient can legitimately submit multiple event types, such as `received` and later `opened`, with different idempotency keys.

Impact:

`notification_jobs.confirmedCount` can exceed the number of recipient records. Sender UI aggregates become misleading, and validation jobs can be over-confirmed.

Action item:

- Increment `confirmedCount` only when the recipient transitions from `not_confirmed` to a confirmed state.
- Do not increment when the existing recipient status is already `received` or `opened`.

### High: Fanout idempotency can leave jobs stuck in `processing`

Evidence:

- `functions/notification-fanout/src/main.ts:62-82` creates the job before sending.
- `functions/notification-fanout/src/main.ts:48-53` returns an existing job immediately.

If the function crashes or times out after job creation but before final aggregate update, a retry with the same idempotency key returns the stale `processing` job and does not resume or repair it.

Impact:

Users can get a permanently stuck job and no fanout retry path. This is especially relevant on Appwrite Free tier because runtime resources and logs are constrained.

Action item:

- Add a stale-job recovery policy.
- Either resume jobs that are `processing` and older than a timeout, or mark them failed and allow a new idempotency key.
- Store enough phase/progress metadata to make retry behavior deterministic.

### Medium: `notification-fanout` only sends the first 100 eligible device tokens

Evidence:

- `functions/notification-fanout/src/main.ts:88`

The function uses `Query.limit(100)` and does not paginate.

Impact:

Only the first 100 eligible device tokens are targeted. That may be acceptable for a small demo, but it does not satisfy the broader PRD expectation that fanout handles bounded pages without silently skipping recipients.

Action item:

- Add explicit `NOTIFICATION_FANOUT_LIMIT` behavior for demo mode, or paginate through all eligible tokens in bounded pages.
- If the product intentionally limits fanout to 100 on Free tier, return that limit in the job metadata or README so the behavior is explicit.

### Medium: Permanent FCM token failures are not classified or deactivated

Evidence:

- `functions/notification-fanout/src/main.ts:139-160`

All send failures become `FCM_SEND_FAILED`; the device token record is not updated when Firebase reports permanent token errors such as unregistered or invalid registration token.

Impact:

Bad tokens remain eligible for future fanouts, wasting executions and producing repeated failures.

Action item:

- Detect Firebase Admin messaging error codes that indicate permanent token invalidity.
- Set the corresponding `device_tokens` record to `isActive: false`, `tokenStatus: 'invalid'`, and update `updatedAt`.
- Keep retryable provider errors distinct from permanent token failures.

### Medium: `sendValidation` returns generic function failure for server misconfiguration

Evidence:

- `Project_details/notification_support_function_implementation.patch:140-144`
- Shared `withHandler` returns `FUNCTION_UNAVAILABLE` for thrown errors in `functions/_shared/http.ts`.

`sendValidation` calls `loadConfig()` and `getFirebaseMessaging(config)`. Missing Firebase/Appwrite env vars or invalid private key format will be caught by `withHandler` as a generic `FUNCTION_UNAVAILABLE`, not the PRD's `SERVER_MISCONFIGURED`.

Impact:

Deployment debugging is harder. On Appwrite Free tier, limited execution logs make precise readiness errors more valuable.

Action item:

- Catch configuration/bootstrap errors inside `handleSendValidation`.
- Return `SERVER_MISCONFIGURED` with a sanitized message.
- Log only the missing variable name or a non-secret diagnostic.

### Medium: Function deployment docs do not list required environment variables

Evidence:

- `functions/notification-fanout/README.md` lists runtime, root, build command, entry point, and execute access only.
- `Project_details/notification_support_function_implementation.patch:42-70` creates a `notification-support` README with the same missing environment detail.

Impact:

The functions are easy to misconfigure in Appwrite Console, especially Firebase Admin variables that must preserve newline formatting.

Action item:

- Add required Appwrite and Firebase env vars to each function README.
- Explicitly document `FIREBASE_PRIVATE_KEY` newline handling.

## Firebase Console Action Items

Create or verify these values from Firebase Console before Appwrite deployment.

### Firebase Project Settings

Required parameters:

```text
FIREBASE_PROJECT_ID
```

Where to find it:

- Firebase Console
- Project settings
- General
- Project ID

Use this exact value as `FIREBASE_PROJECT_ID` in both Appwrite Functions.

### Firebase Service Account For Admin SDK

Required parameters:

```text
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Where to create/download:

- Firebase Console
- Project settings
- Service accounts
- Firebase Admin SDK
- Generate new private key

Use values from the downloaded service account JSON:

```json
{
  "client_email": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

Appwrite environment mapping:

```text
FIREBASE_CLIENT_EMAIL=<client_email from service account JSON>
FIREBASE_PRIVATE_KEY=<private_key from service account JSON>
```

Important:

- Keep the private key only in Appwrite Function environment variables.
- Do not place it in `.env`, `.env.example`, app config, or source control.
- If Appwrite stores the key with escaped newlines, the current `loadConfig()` already converts `\\n` into real newlines.

### Android App Registration

Required file:

```text
google-services.json
```

Where to get it:

- Firebase Console
- Project settings
- General
- Your apps
- Android app
- Download `google-services.json`

Required Firebase Android app parameters:

```text
Android package name
App nickname optional
Debug SHA-1 optional for push, useful for other Firebase services
Release SHA-1 optional for push, useful for other Firebase services
```

The Android package name must match the package/application ID in the Expo/EAS Android build.

### Cloud Messaging / FCM

Verify:

- Firebase Cloud Messaging is available for the Firebase project.
- The Android app is registered in the same Firebase project used by the service account.
- The native app build includes the matching `google-services.json`.
- Appwrite Functions use the same Firebase project ID as the Android app.

No FCM server key should be added to the mobile app. The backend uses Firebase Admin SDK service-account credentials instead.

## Appwrite Function Parameters Needed

Set these on both `notification-fanout` and `notification-support` unless noted otherwise:

```text
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_USERS_COLLECTION_ID
APPWRITE_DEVICE_TOKENS_COLLECTION_ID
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Set this on `notification-fanout`:

```text
NOTIFICATION_INCLUDE_SENDER
```

Recommended additional fanout variable before deploy:

```text
NOTIFICATION_FANOUT_LIMIT
```

The current shared config does not yet read `NOTIFICATION_FANOUT_LIMIT`, so implementing that variable is an action item if you want the PRD behavior.

## Appwrite Console Deployment Settings

### `notification-fanout`

```text
Runtime: Node.js TypeScript
Root directory: functions/notification-fanout
Build command: npm install && npm run build
Entry point: dist/notification-fanout/src/main.js
Execute access: authenticated users
```

### `notification-support`

Target settings after the function folder exists:

```text
Runtime: Node.js TypeScript
Root directory: functions/notification-support
Build command: npm install && npm run build
Entry point: dist/notification-support/src/main.js
Execute access: authenticated users
```

## Validation Performed

Passed:

```bash
npm run typecheck
npx jest --runInBand
npm run functions:check
git apply --check Project_details/notification_support_function_implementation.patch
```

Notes:

- `npx jest --runInBand` passed: 3 test suites, 10 tests.
- `npm run functions:check` passed for the existing four function workspaces.
- `notification-support` did not type-check as a workspace because `functions/notification-support` does not exist yet.
- `npm test -- --runInBand` failed with `spawn EPERM` because Jest still attempted worker startup through that command path. The direct `npx jest --runInBand` command avoided workers and passed.
- The workspace is not currently detected as a Git repository by `git status`, but `git apply --check` accepted the generated patch.

## Deployment Readiness Checklist

- [ ] Create real `functions/notification-support` folder from the generated patch.
- [ ] Update client config and invocation code to use `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID`.
- [ ] Fix receipt nonce omission acceptance.
- [ ] Fix receipt `confirmedCount` double-counting.
- [ ] Add stale `processing` job recovery for fanout.
- [ ] Decide whether fanout is intentionally capped at 100 or implement pagination.
- [ ] Classify permanent Firebase token errors and deactivate invalid tokens.
- [ ] Add explicit environment variable documentation to both function READMEs.
- [ ] Configure Firebase service account values in Appwrite Function env vars.
- [ ] Add Android `google-services.json` for the same Firebase project used by the functions.
- [ ] Deploy only `notification-fanout` and `notification-support` for the Free-tier option-2 architecture.

