# Code Review: Notification Environment And Deploy Readiness

**Review date:** September 7, 2026  
**Workflow used:** `.devin/AGENTS.md`, `.devin/workflows/review.md`, `.devin/shared/analysis-framework.md`, `.devin/shared/handoff-format.md`  
**Goals:**  

- Evaluate Firebase and Appwrite environment variables.
- Determine whether the app is ready to deploy outside of missing environment variables.

## Verdict

Not ready to deploy.

The local checks pass for the code that currently exists, but the repository is still not in the recommended Appwrite Free-tier option-2 shape. The app is still wired for four Appwrite Functions, `notification-support` does not exist as a real deployable function folder, and Android Firebase configuration is missing from the configured path.

Confidence: **0.94**

## Findings

### Critical: `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is present but empty in local `.env`

Evidence:

- Local `.env` contains `EXPO_PUBLIC_APPWRITE_PROJECT_ID`, but its value is empty.
- `lib/config.ts:6` reads `EXPO_PUBLIC_APPWRITE_PROJECT_ID`.
- `lib/config.ts:33-39` treats the Appwrite config as incomplete when `projectId` is empty.

Impact:

The mobile app cannot reliably initialize Appwrite client behavior with an empty project ID. This is a deployment blocker for any environment using the current `.env` values.

Action item:

- Set `EXPO_PUBLIC_APPWRITE_PROJECT_ID` to the Appwrite Project ID from Appwrite Console.
- Keep this as a public client value. It is not the Appwrite API key.

### Critical: Option-2 support function env var is missing and the client still uses four function IDs

Evidence:

- Local `.env` and `.env.example` define:
  - `EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID`
  - `EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID`
- Local `.env` does not define `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID`.
- `lib/config.ts:20-29` exposes `sendValidation`, `receiveValidation`, `fanout`, and `receipt`.
- `lib/appwrite/notifications.ts:112-132` invokes three separate support functions instead of a consolidated `notification-support` action router.

Impact:

The app is not ready for the recommended Appwrite Free-tier option-2 deployment. It still depends on four notification functions, which conflicts with the two-function Free-tier design.

Action item:

- Add `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support`.
- Keep `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout`.
- Replace client support calls with the `{ action, payload }` contract.
- Remove or stop using the old public support function IDs.

### Critical: `functions/notification-support` is missing

Evidence:

Current `functions` folders are:

```text
_shared
notification-fanout
notification-receipt
notification-receive-validation
notification-send-validation
```

`functions/notification-support` does not exist. The implementation exists only as:

```text
Project_details/notification_support_function_implementation.patch
```

Impact:

Appwrite cannot deploy `notification-support` from the current source tree. `npm run functions:check` also cannot validate it because it is not part of the `functions/*` workspace.

Action item:

- Materialize `functions/notification-support`.
- Run `npm install`.
- Run `npm run functions:check`.
- Confirm the output includes `notification-support@1.0.0 check`.

### Critical: `google-services.json` is missing from the configured Android path

Evidence:

- `app.json:9-12` configures Android package `com.pushnotificationexample.app` and `googleServicesFile` as `./google-services.json`.
- `google-services.json` was not found at the repo root.
- `android/app/google-services.json` was also not found.

Impact:

Android Firebase Messaging will not be configured correctly for a native Android build. This blocks reliable FCM token generation and push notification testing on device.

Action item:

- In Firebase Console, download the Android `google-services.json` for package `com.pushnotificationexample.app`.
- Place it at the repo root as `google-services.json`, matching `app.json`.
- Keep it out of source control unless the repo owner explicitly changes the secret-handling policy.

### High: Server-side Appwrite/Firebase function env vars are required by source but not verifiable locally

Evidence:

`functions/_shared/env.ts:27-39` requires these Appwrite Function environment variables:

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

It also reads:

```text
NOTIFICATION_INCLUDE_SENDER
```

Impact:

These are Appwrite Function runtime variables, so they should be configured in Appwrite Console, not in the mobile app `.env`. I cannot confirm from this repository whether they exist in Appwrite Console.

Action item:

- Configure all required server variables on both deployed functions.
- Keep `APPWRITE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` out of client `.env` and source control.
- Verify `FIREBASE_PRIVATE_KEY` newline handling after copying it into Appwrite.

### High: `notification-fanout` still has stale-job and fanout-limit deployment risks

Evidence:

- `functions/notification-fanout/src/main.ts:56-58` returns any existing job immediately.
- `functions/notification-fanout/src/main.ts:62-82` creates a job with `status: 'processing'`.
- `functions/notification-fanout/src/main.ts:84-89` uses `Query.limit(100)`.
- `functions/_shared/env.ts:1-41` does not define `NOTIFICATION_FANOUT_LIMIT` or `NOTIFICATION_JOB_STALE_SECONDS`.

Impact:

A crashed or timed-out fanout can leave a permanently stuck `processing` job for the same idempotency key. Also, only the first 100 eligible devices are targeted, and that cap is not configurable or documented as an intentional Free-tier limit.

Action item:

- Add stale-job recovery or explicit failure behavior.
- Add `NOTIFICATION_FANOUT_LIMIT` if the Free-tier demo cap is intentional.
- Document the cap and stale-job behavior in `functions/notification-fanout/README.md`.

### High: Receipt validation still permits missing nonce and can double-count confirmations

Evidence:

- `functions/notification-receipt/src/main.ts:62-64` only rejects nonce mismatch when both stored nonce and request nonce exist.
- `functions/notification-receipt/src/main.ts:105-108` increments `confirmedCount` for every new receipt idempotency key.

Impact:

If this logic is copied into `notification-support`, receipt spoofing protection is weaker than intended, and a single recipient can inflate `confirmedCount` by submitting multiple receipt event types.

Action item:

- Require nonce equality when the recipient record has a nonce.
- Increment `confirmedCount` only when a recipient transitions from `not_confirmed` to confirmed.

### Medium: Function READMEs do not list the required Appwrite/Firebase environment variables

Evidence:

- `functions/notification-fanout/README.md` lists Appwrite Console runtime settings but not the required environment variables.
- `functions/notification-support` has no README because the function folder does not exist.

Impact:

Manual Appwrite deployment is easy to misconfigure, especially for Firebase Admin credentials and private-key newline handling.

Action item:

- Add required environment variable sections to both function READMEs.
- Include Appwrite variables, Firebase Admin variables, `NOTIFICATION_INCLUDE_SENDER`, and any fanout limit/stale-job variables.

## Environment Variable Inventory

### Local Mobile `.env`

Present and non-empty:

```text
EXPO_PUBLIC_APPWRITE_ENDPOINT
EXPO_PUBLIC_APPWRITE_DATABASE_ID
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID
```

Present but empty:

```text
EXPO_PUBLIC_APPWRITE_PROJECT_ID
```

Missing for option 2:

```text
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID
```

### Local Mobile `.env.example`

The example env file documents the old four-function model. It does not document the option-2 support function ID.

Required option-2 client variables:

```text
EXPO_PUBLIC_APPWRITE_ENDPOINT
EXPO_PUBLIC_APPWRITE_PROJECT_ID
EXPO_PUBLIC_APPWRITE_DATABASE_ID
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID
```

### Appwrite Function Runtime Variables

These must be configured in Appwrite Console, not in the mobile app `.env`:

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

`notification-fanout` also needs:

```text
NOTIFICATION_INCLUDE_SENDER
```

Recommended before deploy:

```text
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_JOB_STALE_SECONDS
```

## Console Action Items

### Appwrite Console

- Get the Appwrite Project ID and set local `EXPO_PUBLIC_APPWRITE_PROJECT_ID`.
- Configure the server-side function variables listed above on `notification-fanout`.
- Configure the same server-side function variables on `notification-support` after that function exists.
- Create/deploy only `notification-fanout` and `notification-support` for the Free-tier option-2 target.
- Stop relying on `notification-send-validation`, `notification-receive-validation`, and `notification-receipt` once option 2 is implemented.

### Firebase Console

- Confirm the Firebase project ID for `FIREBASE_PROJECT_ID`.
- Generate or reuse a Firebase Admin SDK service account.
- Copy `client_email` into `FIREBASE_CLIENT_EMAIL`.
- Copy `private_key` into `FIREBASE_PRIVATE_KEY`.
- Download `google-services.json` for Android package `com.pushnotificationexample.app`.
- Place `google-services.json` at the repo root to match `app.json`.

## Local Validation

Passed:

```text
npm run typecheck
npx jest --runInBand
npm run functions:check
```

Important note:

`npm run functions:check` passed only for the existing four function workspaces:

```text
notification-fanout
notification-receipt
notification-receive-validation
notification-send-validation
```

It did not validate `notification-support` because that folder does not exist.

## Direct Answer

Do we have the Firebase and Appwrite environment variables?

- **Mobile Appwrite env names:** mostly yes, but `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is empty.
- **Option-2 function env name:** no, `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID` is missing.
- **Server Appwrite/Firebase env vars:** required by source, but not verifiable from the repo because they belong in Appwrite Console.
- **Android Firebase config:** no, `google-services.json` is missing from the configured path.

Outside of missing variables, is the app ready to deploy?

**No.** Even ignoring the missing env values, the app is not ready for the intended Appwrite Free-tier option-2 deployment because the codebase still uses the old four-function architecture and the consolidated `notification-support` function is not present as deployable source.

## Confidence

Confidence: **0.94**

Key caveats:

- I did not inspect Appwrite Console or Firebase Console directly.
- I did not print or validate secret values.
- Passing local checks confirms TypeScript/test health for current code, not deploy readiness for the intended two-function architecture.
