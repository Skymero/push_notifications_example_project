# Notification Project Remaining Setup Code Review

**Review date:** 2026-09-09  
**Scope:** Deploy readiness for Appwrite option-2 notification functions and the mobile app integration.  
**Reviewed functions:** `notification-fanout`, `notification-support`  
**Agent instruction:** `.devin/AGENTS.md`  

## Findings

### 1. Critical: Android package ID does not match the Firebase package expected by `app.json`

**Evidence**

- `app.json` declares Android package `com.pushnotificationexample.app`.
- `app.json` points Firebase config at `./google-services.json`.
- `android/app/build.gradle` uses native `applicationId "com.pushnotificationexample"`.

**References**

- `app.json:10`
- `app.json:11`
- `android/app/build.gradle:92`

**Why this blocks deployment**

Firebase Android configuration is package-name sensitive. If Firebase Console downloads `google-services.json` for `com.pushnotificationexample.app` but the native Android app builds as `com.pushnotificationexample`, FCM initialization can fail or target the wrong Android app.

**Action items**

- Decide the real Android package ID.
- Recommended: keep `com.pushnotificationexample.app` because it is already in `app.json`.
- Regenerate/prebuild the native Android project or manually update native Gradle config so `applicationId` matches.
- Download `google-services.json` from Firebase Console for the exact same package ID.
- Place `google-services.json` at repo root.

---

### 2. Critical: `google-services.json` is still missing from the repo root

**Evidence**

- `app.json` expects `./google-services.json`.
- Search for `google-services.json` at the root returned no file.
- `.gitignore` correctly excludes `google-services.json`.

**References**

- `app.json:11`
- `.gitignore:10`

**Why this blocks deployment**

The Android Firebase native modules need the Firebase Android config file during native build. Without it, FCM cannot be configured for the app.

**Action items from Firebase Console**

- Open Firebase Console.
- Select the project used for this app.
- Add or select Android app package `com.pushnotificationexample.app` after resolving the package mismatch above.
- Download `google-services.json`.
- Put it at repo root: `C:\Users\ricky\REPOS\PushNotification_ExampleRepo\google-services.json`.
- Do not commit it unless you intentionally change the repo secret policy.

---

### 3. Critical: local Appwrite Project ID is still empty

**Evidence**

- `.env` contains `EXPO_PUBLIC_APPWRITE_PROJECT_ID=` with no value.
- `.env.example` also leaves the value empty as a placeholder.
- The app config requires endpoint, project ID, and database ID before `hasAppwriteConfig()` returns true.

**References**

- `.env:2`
- `.env.example:2`
- `lib/config.ts:3-7`
- `lib/config.ts:27-33`

**Why this blocks deployment**

The mobile Appwrite SDK cannot target the correct Appwrite project without a project ID. This is not a secret, but it is required.

**Action items from Appwrite Console**

- Open Appwrite Console.
- Copy the Project ID.
- Set this locally:

```env
EXPO_PUBLIC_APPWRITE_PROJECT_ID=<real_appwrite_project_id>
```

- Set the same public project ID in any EAS build environment used for Android builds.

---

### 4. High: EAS project ID is blank

**Evidence**

- `app.json` contains `extra.eas.projectId` with an empty string.

**Reference**

- `app.json:25`

**Why this matters**

This does not block local TypeScript or Jest tests, but it can block or confuse EAS Build project association. If you are building through EAS, the project should be linked.

**Action items**

- Run the Expo/EAS project linking flow from your terminal if this project is not linked yet.
- Confirm `extra.eas.projectId` is populated.
- Keep this separate from `EXPO_PUBLIC_APPWRITE_PROJECT_ID`; they are unrelated IDs.

---

### 5. High: Appwrite Function runtime environment variables still must be configured in Appwrite Console

**Evidence**

- Both functions load required runtime variables from `functions/_shared/env.ts`.
- The loader throws when any required variable is missing.
- These values are intentionally not stored in source control.

**Reference**

- `functions/_shared/env.ts:19-24`
- `functions/_shared/env.ts:41-58`

**Required for both `notification-fanout` and `notification-support`**

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

**Additional for `notification-fanout`**

```text
NOTIFICATION_INCLUDE_SENDER
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_JOB_STALE_SECONDS
```

**Action items from Firebase Console**

- Use service account JSON:
  - `project_id` -> `FIREBASE_PROJECT_ID`
  - `client_email` -> `FIREBASE_CLIENT_EMAIL`
  - `private_key` -> `FIREBASE_PRIVATE_KEY`
- Preserve escaped newline handling for `FIREBASE_PRIVATE_KEY`; the code converts `\n` sequences at runtime.

**Action items from Appwrite Console**

- Create an API key with database/document permissions needed by the functions.
- Add all variables above to each deployed function.
- Do not put `APPWRITE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` in the Expo `.env`.

---

### 6. Medium: Function `package.json` `main` fields point to files that are not emitted by the build

**Evidence**

- `notification-fanout/package.json` says `"main": "dist/main.js"`.
- `notification-support/package.json` says `"main": "dist/main.js"`.
- Actual `tsc` output emits:
  - `functions/notification-fanout/dist/notification-fanout/src/main.js`
  - `functions/notification-support/dist/notification-support/src/main.js`
- Function READMEs correctly document those emitted entrypoints.

**References**

- `functions/notification-fanout/package.json:6`
- `functions/notification-support/package.json:6`
- `functions/notification-fanout/README.md:10`
- `functions/notification-support/README.md:16`

**Why this matters**

If Appwrite Console is configured exactly as the README says, deployment can work. If a deploy process or developer relies on `package.json` `main`, it will point to a missing file and the function may fail to start.

**Action items**

- Either update both `package.json` `main` fields to match the emitted entrypoint, or simplify each function `tsconfig.json` so builds emit `dist/main.js`.
- Keep Appwrite Console entrypoints aligned with actual build output.

---

### 7. Medium: Old standalone notification function folders still exist and still run during workspace checks

**Evidence**

- `functions:check` still runs:
  - `notification-receipt`
  - `notification-receive-validation`
  - `notification-send-validation`
- Option 2 intends only:
  - `notification-fanout`
  - `notification-support`

**References**

- `package.json:13`
- `package.json:17-19`
- `functions/notification-receipt/package.json:2`
- `functions/notification-receive-validation/package.json:2`
- `functions/notification-send-validation/package.json:2`

**Why this matters**

The old folders do not break local checks, but they increase deployment confusion. On Appwrite Free tier, accidentally deploying all five notification functions defeats the option-2 plan.

**Action items**

- In Appwrite Console, deploy only `notification-fanout` and `notification-support`.
- Mark the old folders as legacy in docs or remove them in a separate cleanup pass after confirming they are no longer needed.
- If keeping them temporarily, ensure no deployment script targets every folder under `functions/*`.

---

### 8. Medium: Appwrite database schema, indexes, and collection permissions cannot be verified from source alone

**Evidence**

- Functions query by fields that require existing collections and indexes.
- There is no local `appwrite.json` or `.appwrite` project manifest visible in the repo.
- The database setup appears to be documented but not machine-verifiable from checked-in infrastructure config.

**References**

- `functions/notification-fanout/src/main.ts:64-68`
- `functions/notification-fanout/src/main.ts:114-124`
- `functions/notification-support/src/handlers/receiveValidation.ts:31-37`
- `functions/notification-support/src/handlers/receipt.ts:27-30`

**Why this matters**

TypeScript can pass while runtime Appwrite queries fail because a collection, attribute, index, or permission is missing in the real Appwrite project.

**Action items from Appwrite Console**

- Confirm these collections exist:
  - `users`
  - `device_tokens`
  - `notification_jobs`
  - `notification_recipients`
  - `notification_receipts`
- Confirm attributes match the PRD/spec sheet.
- Confirm indexes support the query fields:
  - `device_tokens`: `userId`, `deviceId`, `platform`, `isActive`, `tokenStatus`
  - `notification_jobs`: `idempotencyKey`, `requestedByUserId`, `jobId`
  - `notification_recipients`: `recipientRecordId`, `jobId`, `recipientUserId`
  - `notification_receipts`: `receiptId`
- Confirm clients cannot directly write trusted receipt/job aggregate fields.

---

### 9. Low: Firebase Google Services Gradle plugin was not found in the checked-in Android Gradle files

**Evidence**

- Search found only `app.json` `googleServicesFile`.
- No checked-in `android/build.gradle` or `android/app/build.gradle` reference to `com.google.gms.google-services`.

**References**

- `app.json:11`
- `android/build.gradle`
- `android/app/build.gradle`

**Why this matters**

Expo config plugins can generate native config, but this repo has a checked-in Android folder. If you build directly from that native folder and the Google Services plugin is not applied, Firebase config processing may be incomplete.

**Action items**

- After adding `google-services.json`, run the actual Android build.
- If Firebase config is not processed, regenerate the native Android project with Expo prebuild or add the Google Services plugin according to the React Native Firebase setup path this repo is using.

---

## What Appears Ready

- The mobile client uses the two option-2 function IDs:
  - `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout`
  - `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support`
- Support calls use the `{ action, payload }` envelope.
- `notification-support` exists and routes:
  - `sendValidation`
  - `receiveValidation`
  - `receipt`
- `notification-fanout` has configurable fanout limit and stale processing-job handling.
- Receipt handling checks ownership, device, idempotency, and nonce.
- Secrets are not committed in `.env.example`.
- `google-services.json` is correctly ignored by git.

## Verification Run

These local checks passed on 2026-09-09:

```text
npm run typecheck
```

Result:

```text
tsc --noEmit
exit 0
```

```text
npm run functions:check
```

Result included:

```text
notification-fanout@1.0.0 check
notification-support@1.0.0 check
```

and exited successfully.

```text
npx jest --runInBand
```

Result:

```text
Test Suites: 3 passed, 3 total
Tests:       10 passed, 10 total
Snapshots:   0 total
```

Both function builds also passed:

```text
npm run build --workspace notification-fanout
npm run build --workspace notification-support
```

## Remaining Setup Summary

Before real deployment, finish these items:

1. Fix the Android package mismatch between `app.json` and `android/app/build.gradle`.
2. Add the correct root `google-services.json` from Firebase Console.
3. Fill `EXPO_PUBLIC_APPWRITE_PROJECT_ID` locally and in build environments.
4. Link/populate the EAS project ID if using EAS Build.
5. Configure all Appwrite Function runtime env vars for both deployed functions.
6. Configure fanout runtime controls for `notification-fanout`.
7. Confirm Appwrite collections, attributes, indexes, and permissions in Console.
8. Deploy only `notification-fanout` and `notification-support` on Appwrite Free tier.
9. Decide whether to clean up or clearly mark the old standalone function folders as legacy.
10. Run a physical Android validation:
    - app obtains FCM token,
    - send validation returns green,
    - receive validation sends FCM,
    - device submits receipt,
    - fanout creates job/recipient records,
    - recipient status updates from provider accepted to received/opened.

## Overall Assessment

Outside the missing external setup and native Android package mismatch, the TypeScript app code and the two option-2 Appwrite functions are close to deploy-ready. The main deploy risk is not TypeScript correctness; it is console/runtime configuration drift between Firebase, Appwrite, Expo, and the checked-in Android project.

**Confidence:** 0.90

**Key caveats**

- I did not access Appwrite Console or Firebase Console, so account-owned values and real collection/index state remain unverified.
- Appwrite/Firebase plan and console behavior can change; recheck account limits before production deployment.
- The checked-in Android folder may be stale relative to Expo config. Treat the package mismatch as real until an Android build proves otherwise.
