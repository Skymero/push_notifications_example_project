# Junior Developer Checklist
## Notification Environment And Deploy-Readiness Findings

**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Workflow used:** `.devin/AGENTS.md`, `.devin/shared/analysis-framework.md`, `.devin/shared/handoff-format.md`  
**Target architecture:** Appwrite Free tier option 2  
**Target deployed functions:** `notification-fanout`, `notification-support`  
**Confidence:** 0.94  

## How To Use This Checklist

Work through the findings in order. Do not commit secrets. Firebase Admin credentials belong only in Appwrite Function environment variables.

Before starting:

- [ ] Read `Project_details/notification_env_deploy_readiness_review.md`.
- [ ] Read `Project_details/notification_option2_functions_prd.md`.
- [ ] Read `Project_details/appwrite_free_tier_function_setup_options.md`.
- [ ] Read `.devin/AGENTS.md`.
- [ ] Confirm the target remains Appwrite Free-tier option 2: exactly two notification functions.

## 1. Fix Empty `EXPO_PUBLIC_APPWRITE_PROJECT_ID`

Goal: make the mobile app point at a real Appwrite project.

Files:

- `.env`
- `.env.example`
- `lib/config.ts`

Checklist:

- [ ] Open Appwrite Console.
- [ ] Select the correct project.
- [ ] Copy the Appwrite Project ID.
- [ ] In local `.env`, set:

```text
EXPO_PUBLIC_APPWRITE_PROJECT_ID=<appwrite_project_id>
```

- [ ] Confirm the value is not empty.
- [ ] Confirm the value is the public project ID, not an API key.
- [ ] Confirm `.env.example` includes the same variable name with a placeholder.
- [ ] Run `npm run typecheck`.

Acceptance criteria:

- [ ] `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is present and non-empty in local `.env`.
- [ ] The app can initialize Appwrite config through `hasAppwriteConfig()`.
- [ ] No Appwrite API key is added to mobile `.env`.

## 2. Replace Four Client Function IDs With Option-2 Function IDs

Goal: make the app call only `notification-fanout` and `notification-support`.

Files:

- `.env`
- `.env.example`
- `lib/config.ts`
- `lib/appwrite/notifications.ts`

Checklist:

- [ ] Add this local `.env` value:

```text
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support
```

- [ ] Keep this local `.env` value:

```text
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
```

- [ ] Remove or stop using these old client variables:

```text
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID
```

- [ ] Update `.env.example` to document only the option-2 function IDs.
- [ ] Update `lib/config.ts` so `appConfig.appwrite.functions` exposes:

```ts
{
  fanout: string;
  support: string;
}
```

- [ ] Update `invokeSendValidation()` to call `functionIds.support`.
- [ ] Send this payload for send validation:

```ts
{ action: 'sendValidation', payload: {} }
```

- [ ] Update `invokeReceiveValidation(deviceId, idempotencyKey)` to call `functionIds.support`.
- [ ] Send this payload for receive validation:

```ts
{ action: 'receiveValidation', payload: { deviceId, idempotencyKey } }
```

- [ ] Update `submitNotificationReceipt(request)` to call `functionIds.support`.
- [ ] Send this payload for receipt:

```ts
{ action: 'receipt', payload: request }
```

- [ ] Leave `invokeNotificationFanout()` pointed at `functionIds.fanout`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npx jest --runInBand`.

Acceptance criteria:

- [ ] No client source references `functionIds.sendValidation`.
- [ ] No client source references `functionIds.receiveValidation`.
- [ ] No client source references `functionIds.receipt`.
- [ ] Support operations use the `{ action, payload }` request envelope.
- [ ] Fanout still uses `notification-fanout`.

## 3. Create Real `functions/notification-support`

Goal: make `notification-support` deployable from the repo.

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
- [ ] Create `functions/notification-support/src`.
- [ ] Create `functions/notification-support/src/handlers`.
- [ ] Port the support function implementation from `Project_details/notification_support_function_implementation.patch`.
- [ ] Confirm `package.json` has:

```json
{
  "name": "notification-support"
}
```

- [ ] Confirm `tsconfig.json` includes both support source files and shared function helpers.
- [ ] Confirm `src/main.ts` routes only:

```text
sendValidation
receiveValidation
receipt
```

- [ ] Confirm unknown actions return `400 INVALID_SUPPORT_ACTION`.
- [ ] Run `npm install` from the repo root.
- [ ] Run `npm run functions:check`.
- [ ] Confirm the output includes `notification-support@1.0.0 check`.

Acceptance criteria:

- [ ] `functions/notification-support` exists as a real folder.
- [ ] Appwrite Console can use `functions/notification-support` as the function root directory.
- [ ] `notification-support` type-checks as part of `npm run functions:check`.

## 4. Add Android `google-services.json`

Goal: make Android Firebase Messaging use the same Firebase project as the backend.

Files:

- `app.json`
- `google-services.json`
- `.gitignore`

Firebase Console checklist:

- [ ] Open Firebase Console.
- [ ] Select the Firebase project used by the Appwrite Functions.
- [ ] Go to Project settings.
- [ ] Open the General tab.
- [ ] In "Your apps", create or select the Android app.
- [ ] Confirm the Android package name is:

```text
com.pushnotificationexample.app
```

- [ ] Download `google-services.json`.

Repo checklist:

- [ ] Place the downloaded file at:

```text
google-services.json
```

- [ ] Confirm `app.json` points to:

```json
"googleServicesFile": "./google-services.json"
```

- [ ] Confirm `.gitignore` includes:

```text
google-services.json
```

- [ ] Build or run on a physical Android device.
- [ ] Confirm the app receives a non-empty FCM token.
- [ ] Confirm the token is saved to Appwrite `device_tokens`.

Acceptance criteria:

- [ ] `google-services.json` exists at the configured path.
- [ ] The file is not committed unless the repo owner explicitly changes the policy.
- [ ] Physical Android device token registration works.

## 5. Configure Server-Side Appwrite And Firebase Function Variables

Goal: make both deployed functions able to use Appwrite Admin APIs and Firebase Admin SDK.

Files:

- `functions/_shared/env.ts`
- `functions/notification-fanout/README.md`
- `functions/notification-support/README.md`

Appwrite Console checklist:

- [ ] Open Appwrite Console.
- [ ] Open `notification-fanout`.
- [ ] Add these variables:

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
NOTIFICATION_INCLUDE_SENDER
```

- [ ] Open `notification-support`.
- [ ] Add these variables:

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

Firebase Console checklist:

- [ ] Open Firebase Console.
- [ ] Go to Project settings.
- [ ] Copy the Project ID to `FIREBASE_PROJECT_ID`.
- [ ] Open Service accounts.
- [ ] Select Firebase Admin SDK.
- [ ] Generate or reuse a service-account private key.
- [ ] Copy `client_email` to `FIREBASE_CLIENT_EMAIL`.
- [ ] Copy `private_key` to `FIREBASE_PRIVATE_KEY`.
- [ ] Preserve newline formatting. Escaped `\n` is acceptable because the code converts `\\n` to real newlines.

Security checklist:

- [ ] Do not add `APPWRITE_API_KEY` to mobile `.env`.
- [ ] Do not add `FIREBASE_CLIENT_EMAIL` to mobile `.env`.
- [ ] Do not add `FIREBASE_PRIVATE_KEY` to mobile `.env`.
- [ ] Do not commit Firebase service-account JSON.

Acceptance criteria:

- [ ] Both deployed functions can load `functions/_shared/env.ts` without missing-variable errors.
- [ ] Firebase Admin initializes in both functions that send FCM.
- [ ] No backend secret appears in source control.

## 6. Fix Fanout Stale-Job And Fanout-Limit Risks

Goal: prevent stuck fanout jobs and make the Free-tier fanout limit explicit.

Files:

- `functions/_shared/env.ts`
- `functions/notification-fanout/src/main.ts`
- `functions/notification-fanout/README.md`

Checklist:

- [ ] Add `NOTIFICATION_FANOUT_LIMIT` to function config with a default such as `100`.
- [ ] Replace hardcoded `Query.limit(100)` with the configured fanout limit.
- [ ] Add `NOTIFICATION_JOB_STALE_SECONDS` to function config with a default such as `300`.
- [ ] When an existing job is found, check its `status`.
- [ ] If the job is terminal, return it.
- [ ] If the job is `processing` and not stale, return it.
- [ ] If the job is `processing` and stale, mark it `failed` with a sanitized failure reason or implement deterministic resume.
- [ ] Prefer marking stale jobs failed unless progress tracking is implemented.
- [ ] Update README with the fanout cap and stale-job behavior.
- [ ] Add tests or manual verification notes for:
  - [ ] completed existing job
  - [ ] fresh processing existing job
  - [ ] stale processing existing job
  - [ ] fanout limit setting
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] Retrying a stale idempotency key does not leave the user stuck forever.
- [ ] The fanout cap is configurable or explicitly documented.
- [ ] The function remains appropriate for Appwrite Free-tier execution limits.

## 7. Fix Receipt Nonce And `confirmedCount` Behavior

Goal: preserve receipt security and avoid inflated job confirmation counts.

Files:

- `functions/notification-support/src/handlers/receipt.ts`
- Temporary reference if still deployed: `functions/notification-receipt/src/main.ts`

Checklist:

- [ ] Locate the receipt nonce check.
- [ ] Replace the optional-both-present check with required equality when a stored nonce exists:

```ts
if (recipient.receiptNonce && recipient.receiptNonce !== request.receiptNonce) {
  return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt validation nonce did not match.');
}
```

- [ ] Before updating the recipient, record whether its existing `receiptStatus` is already confirmed.
- [ ] Treat these statuses as already confirmed:

```text
received
opened
```

- [ ] Create one receipt audit row per unique receipt idempotency key.
- [ ] Update the recipient state for `received`, `displayed`, or `opened`.
- [ ] Increment `notification_jobs.confirmedCount` only when the previous recipient status was `not_confirmed`.
- [ ] Do not increment when the recipient was already `received` or `opened`.
- [ ] Add or update tests for:
  - [ ] matching nonce accepted
  - [ ] wrong nonce rejected
  - [ ] missing nonce rejected when recipient has a nonce
  - [ ] duplicate idempotency key returns success without increment
  - [ ] `received` then `opened` increments only once
- [ ] Run `npm run functions:check`.

Acceptance criteria:

- [ ] Missing nonce cannot confirm a recipient that has a stored nonce.
- [ ] `confirmedCount` counts recipient records, not receipt events.
- [ ] Duplicate receipts remain duplicate-as-success.

## 8. Document Required Function Environment Variables In READMEs

Goal: make Appwrite Console setup repeatable without reading source code.

Files:

- `functions/notification-fanout/README.md`
- `functions/notification-support/README.md`

Checklist:

- [ ] Add a "Required environment variables" section to `notification-fanout`.
- [ ] Add a "Required environment variables" section to `notification-support`.
- [ ] List shared Appwrite variables:

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

- [ ] List Firebase Admin variables:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

- [ ] Add `NOTIFICATION_INCLUDE_SENDER` to the `notification-fanout` README.
- [ ] Add `NOTIFICATION_FANOUT_LIMIT` if implemented.
- [ ] Add `NOTIFICATION_JOB_STALE_SECONDS` if implemented.
- [ ] Document that `FIREBASE_PRIVATE_KEY` may use escaped newlines.
- [ ] State that backend secrets must be configured in Appwrite Function environment variables only.
- [ ] Do not include real secret values in the README.

Acceptance criteria:

- [ ] A junior developer can configure both functions from the READMEs.
- [ ] Secret-handling expectations are clear.
- [ ] Firebase private-key newline handling is documented.

## Final Verification Checklist

Run after all sections are complete:

```text
npm run typecheck
npx jest --runInBand
npm run functions:check
```

Expected:

- [ ] App TypeScript check passes.
- [ ] Jest tests pass.
- [ ] Function checks pass.
- [ ] `notification-support@1.0.0 check` appears in function check output.

Manual device verification:

- [ ] Run the app on a physical Android device.
- [ ] Confirm FCM token registration.
- [ ] Run send validation.
- [ ] Run receive validation.
- [ ] Confirm receipt submission changes receive readiness.
- [ ] Run fanout.
- [ ] Confirm recipient records are created.
- [ ] Confirm device receipts update recipient status.

## Key Caveats

- Appwrite Console and Firebase Console values cannot be verified from source alone.
- `APPWRITE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` must never be committed.
- Local checks passing does not mean the option-2 deployment is ready until `notification-support` exists and is checked.
- Physical Android testing is required for real Firebase Messaging confidence.
