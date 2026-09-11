# Junior Developer Checklist
## Notification Function Deploy-Readiness Action Items

**Source review:** `Project_details/notification_functions_deploy_readiness_review.md`  
**Target architecture:** Appwrite Free tier option 2  
**Target deployed functions:** `notification-fanout`, `notification-support`  
**Confidence:** 0.91  

## How To Use This Checklist

Work through the sections in order. Each section maps to one action item from the deploy-readiness review.

Before starting:

- [ ] Read `Project_details/notification_functions_deploy_readiness_review.md`.
- [ ] Read `Project_details/notification_option2_functions_prd.md`.
- [ ] Read `.devin/AGENTS.md`.
- [ ] Do not commit Firebase private keys, Appwrite API keys, or `google-services.json` unless the repo owner explicitly changes the secret-handling policy.
- [ ] Preserve the rule that the mobile app never sends directly to recipient FCM tokens.

## 1. Create Real `functions/notification-support` Folder

Goal: turn the generated support-function patch into an actual deployable Appwrite Function workspace.

Files:

- `Project_details/notification_support_function_implementation.patch`
- `functions/notification-support/package.json`
- `functions/notification-support/tsconfig.json`
- `functions/notification-support/README.md`
- `functions/notification-support/src/main.ts`
- `functions/notification-support/src/types.ts`
- `functions/notification-support/src/handlers/sendValidation.ts`
- `functions/notification-support/src/handlers/receiveValidation.ts`
- `functions/notification-support/src/handlers/receipt.ts`

Checklist:

- [ ] Create `functions/notification-support`.
- [ ] Create `functions/notification-support/src/handlers`.
- [ ] Apply or manually port the contents from `Project_details/notification_support_function_implementation.patch`.
- [ ] Confirm `package.json` has `"name": "notification-support"`.
- [ ] Confirm `tsconfig.json` includes both `src/**/*.ts` and `../_shared/**/*.ts`.
- [ ] Confirm `src/main.ts` routes only these actions: `sendValidation`, `receiveValidation`, `receipt`.
- [ ] Confirm unknown actions return `400 INVALID_SUPPORT_ACTION`.
- [ ] Run `npm install` from the repo root.
- [ ] Run `npm run functions:check`.
- [ ] Confirm output includes `notification-support@1.0.0 check`.

Acceptance criteria:

- [ ] `functions/notification-support` exists as a real folder.
- [ ] Appwrite Console can use `functions/notification-support` as the root directory.
- [ ] The support function type-checks as part of `npm run functions:check`.

## 2. Update Client Config To Use `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID`

Goal: make the mobile app call two deployed functions instead of four.

Files:

- `.env.example`
- `lib/config.ts`
- `lib/appwrite/notifications.ts`

Checklist:

- [ ] Replace these old `.env.example` variables:

```text
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID
```

- [ ] Add this variable:

```text
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support
```

- [ ] Keep this variable:

```text
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
```

- [ ] Update `lib/config.ts` so `appConfig.appwrite.functions` exposes `support` and `fanout`.
- [ ] Remove or stop using `sendValidation`, `receiveValidation`, and `receipt` function IDs in client code.
- [ ] Update `invokeSendValidation()` to call `functionIds.support` with `{ action: 'sendValidation', payload: {} }`.
- [ ] Update `invokeReceiveValidation(deviceId, idempotencyKey)` to call `functionIds.support` with `{ action: 'receiveValidation', payload: { deviceId, idempotencyKey } }`.
- [ ] Update `submitNotificationReceipt(request)` to call `functionIds.support` with `{ action: 'receipt', payload: request }`.
- [ ] Leave `invokeNotificationFanout()` pointed at `functionIds.fanout`.
- [ ] Run `npm run typecheck`.

Acceptance criteria:

- [ ] No client code references the old support function IDs.
- [ ] Fanout still uses `notification-fanout`.
- [ ] All support operations use the `{ action, payload }` envelope.
- [ ] `npm run typecheck` passes.

## 3. Fix Receipt Nonce Omission Acceptance

Goal: require the receipt nonce whenever the recipient record has one.

Files:

- `functions/notification-support/src/handlers/receipt.ts`
- Temporary/migration reference if still present: `functions/notification-receipt/src/main.ts`

Checklist:

- [ ] Find the receipt nonce comparison.
- [ ] Replace optional-both-present logic with required equality when `recipient.receiptNonce` exists.
- [ ] Use this behavior:

```ts
if (recipient.receiptNonce && recipient.receiptNonce !== request.receiptNonce) {
  return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt validation nonce did not match.');
}
```

- [ ] Add or update tests for these cases:
  - [ ] Matching nonce is accepted.
  - [ ] Wrong nonce is rejected.
  - [ ] Missing nonce is rejected when recipient has a nonce.
  - [ ] Missing nonce is accepted only if legacy recipient has no nonce.
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] A recipient record with `receiptNonce` cannot be confirmed by a request that omits `receiptNonce`.
- [ ] Tests cover missing-nonce and wrong-nonce behavior.

## 4. Fix `confirmedCount` Double-Counting

Goal: count each recipient once, even if it later sends `displayed` or `opened`.

Files:

- `functions/notification-support/src/handlers/receipt.ts`
- Any tests added for receipt behavior.

Checklist:

- [ ] Read the current recipient before updating it.
- [ ] Store whether the existing status is already confirmed:

```text
receiptStatus is received or opened
```

- [ ] Create the receipt audit record for each unique event idempotency key.
- [ ] Update recipient status for the new event.
- [ ] Increment `notification_jobs.confirmedCount` only if the previous recipient status was `not_confirmed`.
- [ ] Do not increment when previous status was `received` or `opened`.
- [ ] Add tests for:
  - [ ] First `received` receipt increments once.
  - [ ] Later `opened` receipt does not increment again.
  - [ ] Duplicate idempotency key does not increment again.
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] `confirmedCount` never exceeds the number of recipient records because of multiple receipt event types.
- [ ] Duplicate receipts remain duplicate-as-success.

## 5. Add Stale `processing` Job Recovery For Fanout

Goal: avoid jobs getting permanently stuck after a timeout or crash.

Files:

- `functions/notification-fanout/src/main.ts`
- `functions/_shared/env.ts`
- `functions/notification-fanout/README.md`

Checklist:

- [ ] Decide the stale threshold, for example `NOTIFICATION_JOB_STALE_SECONDS=300`.
- [ ] Add the env var to shared config or fanout-local config.
- [ ] When an existing job is found:
  - [ ] If status is terminal, return it.
  - [ ] If status is `processing` and not stale, return it.
  - [ ] If status is `processing` and stale, mark it `failed` with a sanitized failure reason or resume deterministically.
- [ ] Prefer marking stale jobs failed unless the implementation stores enough progress to safely resume.
- [ ] Add a README note describing stale-job behavior.
- [ ] Add tests or manual verification notes for:
  - [ ] Existing completed job returns as-is.
  - [ ] Fresh processing job returns as-is.
  - [ ] Stale processing job is marked failed or recovered.
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] Retrying a stale fanout idempotency key no longer leaves the user with an unexplained permanent `processing` job.

## 6. Decide Fanout Cap Or Implement Pagination

Goal: make the `Query.limit(100)` behavior explicit or remove the silent cap.

Files:

- `functions/notification-fanout/src/main.ts`
- `functions/_shared/env.ts`
- `functions/notification-fanout/README.md`
- Optional docs: `Project_details/notification_option2_functions_prd.md`

Checklist for explicit Free-tier cap:

- [ ] Add `NOTIFICATION_FANOUT_LIMIT`.
- [ ] Read it in config with a default of `100`.
- [ ] Use it in `Query.limit(...)`.
- [ ] Update the function README to say fanout is capped.
- [ ] Return or store enough metadata so the cap is visible, for example `targetCount` and a documented `fanoutLimit`.

Checklist for pagination:

- [ ] Query eligible tokens in bounded pages.
- [ ] Track offset/cursor safely.
- [ ] Stop when no more documents are returned.
- [ ] Keep each page small enough for Appwrite Free tier runtime limits.
- [ ] Avoid loading all tokens into memory at once.
- [ ] Add timeout-aware safeguards so the function does not exceed the configured Appwrite timeout.

Acceptance criteria:

- [ ] Fanout no longer silently targets only the first 100 devices without documentation.
- [ ] The chosen behavior is documented and verified.

## 7. Classify Permanent Firebase Token Errors And Deactivate Invalid Tokens

Goal: keep invalid FCM tokens out of future fanouts.

Files:

- `functions/notification-fanout/src/main.ts`
- Optional shared helper: `functions/_shared/firebase.ts`
- Tests for FCM error classification if added.

Checklist:

- [ ] Inspect Firebase Admin send error shape used by the installed `firebase-admin` version.
- [ ] Create a helper such as `isPermanentFcmTokenError(error)`.
- [ ] Treat at least these as permanent token failures:
  - [ ] unregistered token
  - [ ] invalid registration token
  - [ ] mismatched credential/project sender errors if applicable
- [ ] In the catch block, set recipient failure fields with a specific code, not only `FCM_SEND_FAILED`.
- [ ] For permanent token errors, update the token record:

```ts
{
  isActive: false,
  tokenStatus: 'invalid',
  updatedAt: new Date().toISOString()
}
```

- [ ] Keep retryable provider errors distinct from permanent token failures.
- [ ] Do not log full FCM tokens.
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] Permanently invalid tokens are excluded from later fanouts.
- [ ] Retryable FCM failures do not incorrectly deactivate valid tokens.

## 8. Add Explicit Environment Variable Documentation To Function READMEs

Goal: make Appwrite Console setup unambiguous.

Files:

- `functions/notification-fanout/README.md`
- `functions/notification-support/README.md`

Checklist:

- [ ] Add a "Required environment variables" section to both READMEs.
- [ ] List shared Appwrite env vars:

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
```

- [ ] List Firebase Admin env vars:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

- [ ] Add `NOTIFICATION_INCLUDE_SENDER` to `notification-fanout`.
- [ ] Add `NOTIFICATION_FANOUT_LIMIT` or stale-job vars if implemented.
- [ ] Document that `FIREBASE_PRIVATE_KEY` may contain escaped newlines and the code converts `\\n` to newlines.
- [ ] State that secrets must be configured in Appwrite Function environment variables only.

Acceptance criteria:

- [ ] A developer can configure both Appwrite Functions from the README without reading the source.
- [ ] Firebase private key handling is clear.

## 9. Configure Firebase Service Account Values In Appwrite Function Env Vars

Goal: provide the backend with Firebase Admin credentials without exposing secrets to the app.

Firebase Console steps:

- [ ] Open Firebase Console.
- [ ] Select the correct Firebase project for this app.
- [ ] Go to Project settings.
- [ ] Open Service accounts.
- [ ] Select Firebase Admin SDK.
- [ ] Generate a new private key if one does not already exist for this backend.
- [ ] Download the service account JSON.
- [ ] Copy `project_id` to `FIREBASE_PROJECT_ID`.
- [ ] Copy `client_email` to `FIREBASE_CLIENT_EMAIL`.
- [ ] Copy `private_key` to `FIREBASE_PRIVATE_KEY`.

Appwrite Console steps:

- [ ] Open the Appwrite project.
- [ ] Open `notification-fanout`.
- [ ] Add `FIREBASE_PROJECT_ID`.
- [ ] Add `FIREBASE_CLIENT_EMAIL`.
- [ ] Add `FIREBASE_PRIVATE_KEY`.
- [ ] Repeat the same values for `notification-support`.
- [ ] Do not add these values to client `.env` files.
- [ ] Do not commit the service account JSON.

Acceptance criteria:

- [ ] Both deployed functions can initialize Firebase Admin.
- [ ] No Firebase Admin secret appears in source control.

## 10. Add Android `google-services.json` For The Same Firebase Project

Goal: make the native Android app receive FCM tokens from the same Firebase project used by Appwrite Functions.

Firebase Console steps:

- [ ] Open Firebase Console.
- [ ] Select the same project used for `FIREBASE_PROJECT_ID`.
- [ ] Go to Project settings.
- [ ] In "Your apps", create or select the Android app.
- [ ] Confirm Android package name matches the Expo/EAS Android application ID.
- [ ] Download `google-services.json`.

Repo/local setup steps:

- [ ] Place `google-services.json` where the Android build expects it.
- [ ] Confirm `.gitignore` excludes `google-services.json`.
- [ ] Build/run on a physical Android device.
- [ ] Confirm the app can obtain a non-empty FCM token.
- [ ] Confirm that token registers into Appwrite for the signed-in user/device.

Acceptance criteria:

- [ ] The mobile app and Appwrite Functions use the same Firebase project.
- [ ] Physical Android device receives validation push notifications.

## 11. Deploy Only `notification-fanout` And `notification-support`

Goal: satisfy Appwrite Free tier option 2 with exactly two deployed notification functions.

Appwrite Console checklist:

- [ ] Create or update `notification-fanout`.
- [ ] Set root directory to `functions/notification-fanout`.
- [ ] Set build command to `npm install && npm run build`.
- [ ] Set entry point to `dist/notification-fanout/src/main.js`.
- [ ] Set execute access to authenticated users.
- [ ] Create or update `notification-support`.
- [ ] Set root directory to `functions/notification-support`.
- [ ] Set build command to `npm install && npm run build`.
- [ ] Set entry point to `dist/notification-support/src/main.js`.
- [ ] Set execute access to authenticated users.
- [ ] Pause, delete, or stop using old standalone support functions:
  - [ ] `notification-send-validation`
  - [ ] `notification-receive-validation`
  - [ ] `notification-receipt`

Final verification:

- [ ] Run send validation from the app.
- [ ] Run receive validation from the app.
- [ ] Confirm validation notification is accepted by FCM.
- [ ] Confirm receipt submission updates receive readiness.
- [ ] Run fanout from the app.
- [ ] Confirm recipient records are created.
- [ ] Confirm recipient device receipts update recipient status.

Acceptance criteria:

- [ ] The Appwrite project uses only `notification-fanout` and `notification-support` for notification functions.
- [ ] The app no longer depends on four deployed notification functions.

## Final Validation Commands

Run these before deployment handoff:

```bash
npm run typecheck
npx jest --runInBand
npm run functions:check
```

Expected result:

- [ ] TypeScript app check passes.
- [ ] Jest unit tests pass.
- [ ] Function workspace checks pass.
- [ ] `notification-support` appears in workspace check output.

## Key Caveats

- The previous session could not write under `functions`, so a developer may need to materialize `notification-support` manually from the generated patch.
- Appwrite Free tier function count is the reason for this two-function design.
- Firebase Admin credentials are backend-only. The mobile app should only receive public Firebase client configuration and `google-services.json`.
- Physical Android device testing is required; simulator-only testing is not enough for reliable FCM validation.

