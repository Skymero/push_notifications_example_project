# Junior Developer Checklist: Phone Install And Notification Test Readiness

Source documents to read before starting:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 3.4, 8, 10, 11, 12, 17, 18, 19, 20, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially registration, receive validation, fanout, recipient processing, receipt confirmation, and token rotation.
- [ ] Read `Code Review Jr Checklists/backend-database-spec-sheet.md`.
- [ ] Read `Code Review Jr Checklists/11-firebase-fcm-console-setup.md`.
- [ ] Read `Code Review Jr Checklists/appwrite-functions-fanout-checklist.md`.
- [ ] Read `Code Review Jr Checklists/12-post-review-runtime-hardening.md`.
- [ ] Before handoff, verify every task still follows the plan in `Project_details/`.

Official setup references:

- Firebase Android setup: https://firebase.google.com/docs/android/setup
- Firebase config file download: https://support.google.com/firebase/answer/7015592
- Appwrite Functions deploy from Git: https://appwrite.io/docs/products/functions/deploy-from-git
- Appwrite Function environment variables: https://appwrite.io/docs/products/functions/environment-variables
- Appwrite database permissions and row security: https://appwrite.io/docs/products/databases/permissions

## Goal

Prepare the Android app, Firebase project, Appwrite backend, Appwrite Functions, and physical Android test workflow so the app can be installed on a phone and used to test real FCM notification sending.

## Current Readiness Answer

- [ ] Treat the app as not ready for real phone notification testing until all sections below are complete.
- [ ] Use the existing repo as a scaffold, not as a fully deployed backend.
- [ ] Do not test with Expo Go for push notification behavior.
- [ ] Use a physical Android device for final verification.

Task reasoning:

The app source exists and local TypeScript/tests can pass, but real push notifications require Firebase native config, Appwrite collections, deployed Appwrite Functions, server-side Firebase Admin credentials, and a native Android build. Expo Go and local-only validation cannot prove the FCM/Appwrite delivery path.

## 1. Repo Preflight

- [ ] Confirm the working directory is `C:\Users\ricky\REPOS\PushNotification_ExampleRepo`.
- [ ] Run `npm install`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test -- --runInBand`.
- [ ] Run `npm run functions:check`.
- [ ] Open `app.json`.
- [ ] Find the Android package field:

```json
{
  "expo": {
    "android": {
      "package": "com.pushnotificationexample.app"
    }
  }
}
```

- [ ] Confirm `app.json` Android package is exactly:

```text
com.pushnotificationexample.app
```

- [ ] If you change this package name, update the same package name in Firebase before downloading `google-services.json`.
- [ ] Do not use the old placeholder package name:

```text
com.example.pushnotification
```

- [ ] Open `.env.example`.
- [ ] Confirm `.env.example` contains the expected Appwrite public variables:

APPWRITE_PROJECT_NAME = "Push Notification Example"

```text
EXPO_PUBLIC_APPWRITE_PUBLIC_ENDPOINT = "https://nyc.cloud.appwrite.io/v1"
EXPO_PUBLIC_APPWRITE_PROJECT_ID = "6a921fef001e644048b0"
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

- [ ] Confirm the default database and collection IDs match `Code Review Jr Checklists/backend-database-spec-sheet.md`:

```text
EXPO_PUBLIC_APPWRITE_DATABASE_ID=push_notifications
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts
```

- [ ] Create a local `.env` file from `.env.example`.
- [ ] In PowerShell, use:

```powershell
Copy-Item .env.example .env
```

- [ ] Fill in your real Appwrite endpoint and project ID in `.env`.
- [ ] Keep the database, collection, and function IDs in `.env` identical to the IDs you created in Appwrite Console.
- [ ] Restart Expo after changing `.env` because Expo reads public env values at startup.
- [ ] Do not commit `.env`.
- [ ] Do not commit Firebase service account private keys.

Task reasoning:

This makes sure the local project is installable and internally consistent before spending time in Firebase or Appwrite. The Android package name must be stable before Firebase app registration because Firebase uses it to generate the correct `google-services.json`.

Acceptance criteria:

- [ ] Local dependencies are installed.
- [ ] TypeScript passes.
- [ ] Unit tests pass.
- [ ] Function TypeScript checks pass.
- [ ] Local `.env` exists but contains no server secrets.

## 2. Finish Required Runtime Hardening First

- [ ] Complete `Code Review Jr Checklists/12-post-review-runtime-hardening.md`.
- [ ] Fix client Appwrite Function response/error handling.
- [ ] Move backend-controlled token state out of direct client writes.
- [ ] Make Appwrite Function builds deployable from their configured roots.
- [ ] Correct receipt `confirmedCount` so each recipient counts once.
- [ ] Filter normal fanout to receive-verified Android tokens.
- [ ] Add fanout pagination/batching beyond the first 100 tokens.
- [ ] Add receive-validation idempotency.
- [ ] Register the background messaging handler early enough for Android background/terminated messages.
- [ ] Align `deviceTokenId` with the Appwrite document `$id`.

Task reasoning:

These are not cosmetic issues. They affect whether the deployed backend can run, whether readiness LEDs tell the truth, whether users can manipulate backend-controlled status, whether recipients are skipped, and whether receipt counts are correct. Phone testing before these fixes can produce misleading results.

Acceptance criteria:

- [ ] The checklist `12-post-review-runtime-hardening.md` is completed or any exceptions are documented.
- [ ] `npm run typecheck` passes after the fixes.
- [ ] `npm test -- --runInBand` passes after the fixes.
- [ ] `npm run functions:check` passes after the fixes.
- [ ] `npm run build` passes inside each function folder or the final bundling command is documented and working.

## 3. Firebase Console Setup

- [ ] Sign in to Firebase Console.
- [ ] Create a Firebase project or select the project for this app.
- [ ] Record the Firebase project ID.
- [ ] Open Project Settings.
- [ ] Add an Android app.
- [ ] Enter this Android package name exactly:

```text
com.pushnotificationexample.app
```

- [ ] Do not register `com.example.pushnotification`.
- [ ] Download `google-services.json`.
- [ ] Keep only the latest downloaded `google-services.json` for this Android app.
- [ ] Do not configure Web Push.
- [ ] Do not configure iOS for this pass.
- [ ] Do not configure FCM topics for this pass.

Task reasoning:

Firebase must know the exact Android package name before it can issue the correct app configuration file. The PRD scope for this pass is Android-only, so web, iOS, and topics add complexity without supporting the current acceptance criteria.

Acceptance criteria:

- [ ] Firebase project exists.
- [ ] Firebase Android app exists with package `com.pushnotificationexample.app`.
- [ ] `google-services.json` has been downloaded.
- [ ] Firebase project ID is available for Appwrite Function variables.

## 4. Firebase Service Account For Backend Sending

- [ ] In Firebase Console, open Project Settings.
- [ ] Open the Service Accounts tab.
- [ ] Generate a new private key for Firebase Admin SDK use.
- [ ] Store the downloaded service account JSON somewhere outside the repo.
- [ ] Extract these values for Appwrite Function variables:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

- [ ] Preserve newline formatting in `FIREBASE_PRIVATE_KEY`; if the console requires one-line input, replace newlines with `\n`.
- [ ] Do not put Firebase Admin values in `.env`.
- [ ] Do not put Firebase Admin values in `app.json`.
- [ ] Do not commit the service account JSON.

Task reasoning:

The mobile app gets an FCM registration token, but only the backend should send notifications to other users. Firebase Admin credentials give server-side send authority and must live only in Appwrite Function environment variables.

Acceptance criteria:

- [ ] Firebase service account JSON exists outside the repo.
- [ ] Required Firebase Admin values are ready for Appwrite Functions.
- [ ] No Firebase Admin secret is committed or exposed to the mobile app.

## 5. Appwrite Project And Auth Setup

- [ ] Sign in to Appwrite Console.
- [ ] Create a new Appwrite project or select the intended project.
- [ ] Record:

```text
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
```

- [ ] Enable Appwrite Account authentication needed by this app.
- [ ] Confirm email/password auth supports the username-alias approach used by the repo.
- [ ] Confirm unauthenticated users cannot call notification functions.

Task reasoning:

The app uses Appwrite Account sessions to prove who owns a device token, who can request fanout, and who may submit receipts. If auth is not configured first, database permissions and function execution checks cannot be validated.

Acceptance criteria:

- [ ] Appwrite project exists.
- [ ] Appwrite endpoint and project ID are known.
- [ ] Account auth can create and sign in users from the app.
- [ ] Functions are planned for authenticated execution only.

## 6. Appwrite Database Setup

- [ ] Open `Code Review Jr Checklists/backend-database-spec-sheet.md`.
- [ ] Create database:

```text
push_notifications
```

- [ ] Create table `users`.
- [ ] Create table `device_tokens`.
- [ ] Create table `notification_jobs`.
- [ ] Create table `notification_recipients`.
- [ ] Create table `notification_receipts`.
- [ ] Add every column from the backend sheet using the exact attribute IDs.
- [ ] Use camelCase attribute IDs exactly, such as:

```text
userId
deviceId
fcmToken
receiveStatus
recipientRecordId
```

- [ ] Wait for Appwrite attributes to finish processing before creating indexes.
- [ ] Create every index from the backend sheet.
- [ ] Enable row/document security for tables that store user-scoped or secret-bearing rows.
- [ ] Keep broad table-level read/update/delete permissions disabled unless the backend sheet explicitly says otherwise.
- [ ] Ensure `device_tokens.fcmToken` cannot be read by other users.
- [ ] Ensure `notification_jobs`, `notification_recipients`, and `notification_receipts` are written by functions only.

Task reasoning:

The app and functions query fields by exact ID. A mismatch between `device_tokens` vs `deviceTokens`, or `userId` vs `user_id`, will break runtime behavior even if the code compiles. Row/document security is also required so one user cannot read another user's FCM token.

Acceptance criteria:

- [ ] All five tables exist.
- [ ] All required attributes exist with exact IDs.
- [ ] All required indexes exist.
- [ ] Row/document security is enabled where required.
- [ ] Users cannot list all other users' device token rows.

## 7. Appwrite Server API Key

- [ ] Create an Appwrite server API key for the functions.
- [ ] Give the key only the scopes needed for:

```text
databases.read
databases.write
users.read
```

- [ ] Add any additional scope only if a function fails and the Appwrite logs prove it is required.
- [ ] Store the API key only in Appwrite Function environment variables.
- [ ] Do not add the server API key to `.env`.
- [ ] Do not add the server API key to `.env.example`.
- [ ] Do not add the server API key to the mobile app.

Task reasoning:

Appwrite Functions need server-side authority to read eligible recipients, create job/recipient/receipt records, and update token lifecycle state. That authority must not be available to the React Native client.

Acceptance criteria:

- [ ] API key exists.
- [ ] API key has the minimum necessary scopes.
- [ ] API key is not present in source control or client env files.

## 8. GitHub Repository Readiness For Functions

- [ ] Confirm this project is in a GitHub repository.
- [ ] If it is not already a Git repository, initialize it intentionally with the project owner.
- [ ] Commit the app source, function source, backend sheet, and checklists.
- [ ] Push the branch that Appwrite should deploy from.
- [ ] Confirm `.env`, service account JSON, and generated native secrets are not committed.
- [ ] Confirm function source exists under:

```text
functions/notification-send-validation
functions/notification-receive-validation
functions/notification-fanout
functions/notification-receipt
```

Task reasoning:

Appwrite can deploy Functions from Git, but only if the function code is committed and pushed. Secrets belong in Appwrite variables, not GitHub. The previous local check showed this folder may not currently be a Git repository, so this needs explicit verification.

Acceptance criteria:

- [ ] GitHub repository exists.
- [ ] Function source is pushed.
- [ ] Secret files are ignored and absent from commits.
- [ ] Appwrite can access the repository/branch.

## 9. Appwrite Function Creation And Deployment

- [ ] In Appwrite Console, create `notification-send-validation`.
- [ ] In Appwrite Console, create `notification-receive-validation`.
- [ ] In Appwrite Console, create `notification-fanout`.
- [ ] In Appwrite Console, create `notification-receipt`.
- [ ] Set each function execute access to authenticated users only.
- [ ] Connect each function to the GitHub repo/branch.
- [ ] Set each function root directory according to the final deployable structure.
- [ ] Set each function build command according to the final deployable structure.
- [ ] Set each function entry point according to the final deployable structure.
- [ ] Add shared environment variables to each function:

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
NOTIFICATION_VALIDATION_TIMEOUT_SECONDS
NOTIFICATION_RECEIPT_TIMEOUT_SECONDS
NOTIFICATION_MAX_RETRIES
NOTIFICATION_INCLUDE_SENDER
```

- [ ] Mark secret variables as secret in Appwrite where available.
- [ ] Redeploy functions after adding or changing variables.
- [ ] Open each function's deployment logs and confirm build success.
- [ ] Execute `notification-send-validation` from an authenticated session or Appwrite test path.
- [ ] Execute `notification-receive-validation` only after a real Android device token exists.

Task reasoning:

The app cannot send notifications until Appwrite Functions are live. Function variables are read at runtime, and Appwrite requires redeploy after variable changes. Authenticated execution is part of the security model from the PRD.

Acceptance criteria:

- [ ] All four functions exist.
- [ ] All four functions deploy successfully.
- [ ] All required variables exist in each function.
- [ ] No unauthenticated user can execute the functions.
- [ ] Function logs show no missing environment variables.

## 10. Local Expo Environment Setup

- [ ] Open the local `.env`.
- [ ] Fill in:

```text
EXPO_PUBLIC_APPWRITE_ENDPOINT
EXPO_PUBLIC_APPWRITE_PROJECT_ID
EXPO_PUBLIC_APPWRITE_DATABASE_ID=push_notifications
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID=notification-send-validation
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID=notification-receive-validation
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID=notification-receipt
```

- [ ] Do not add Appwrite server API key to this file.
- [ ] Do not add Firebase service account values to this file.
- [ ] Restart the Expo dev server after changing `.env`.

Task reasoning:

Expo public variables are bundled into the app and are visible to the client. They should contain only public IDs needed to locate Appwrite resources, never backend credentials.

Acceptance criteria:

- [ ] `.env` points to the real Appwrite project/database/functions.
- [ ] `.env` contains no server secrets.
- [ ] App starts without the missing-Appwrite-config warning.

## 11. Android Native Build Setup

- [ ] Confirm Android Studio and Android SDK are installed.
- [ ] Enable USB debugging on the physical Android phone.
- [ ] Connect the phone by USB.
- [ ] Run:

```bash
npx expo prebuild --platform android
```

- [ ] Place `google-services.json` in the generated Android app-level directory expected by the Firebase Gradle plugin.
- [ ] Confirm the generated Android package/application ID matches `com.pushnotificationexample.app`.
- [ ] Run:

```bash
npm run android
```

- [ ] Do not use Expo Go for this test.

Task reasoning:

React Native Firebase requires a native Android build with the Firebase configuration file included. Prebuild creates the native Android project, and `npm run android` installs/runs a development build on the connected device.

Acceptance criteria:

- [ ] Android native project exists.
- [ ] `google-services.json` is in the correct native Android location.
- [ ] The app installs on the physical Android phone.
- [ ] The app launches without native Firebase initialization errors.

## 12. First Device Registration Test

- [ ] Open the installed app on the Android phone.
- [ ] Register a new user.
- [ ] Tap the explicit Android notification setup action.
- [ ] Grant notification permission when Android prompts.
- [ ] Confirm Appwrite creates one `users` row for the account.
- [ ] Confirm Appwrite creates one `device_tokens` row for the account/device.
- [ ] Confirm `device_tokens.platform = android`.
- [ ] Confirm `device_tokens.permissionStatus = granted`.
- [ ] Confirm `device_tokens.fcmToken` is not empty.
- [ ] Confirm reopening the app does not create duplicate active token rows for the same `userId + deviceId`.

Task reasoning:

Before testing fanout, the backend must have at least one valid Android token tied to an authenticated user and stable device ID. Duplicate token rows make later delivery and receipt status ambiguous.

Acceptance criteria:

- [ ] Registration works.
- [ ] Notification permission prompt appears only after the setup action.
- [ ] FCM token is stored.
- [ ] Duplicate active device-token rows are not created.

## 13. Receive Validation Test

- [ ] In the app, trigger receive readiness validation.
- [ ] Confirm `notification-receive-validation` runs in Appwrite logs.
- [ ] Confirm FCM accepts or rejects the validation notification.
- [ ] If FCM rejects it, confirm receive LED becomes red.
- [ ] If FCM accepts it, confirm receive LED stays yellow until receipt.
- [ ] Confirm the phone receives/processes the validation notification.
- [ ] Confirm `notification-receipt` receives a `received` receipt.
- [ ] Confirm `device_tokens.receiveStatus = verified`.
- [ ] Confirm receive LED becomes green only after the receipt is accepted.

Task reasoning:

The PRD requires provider acceptance and device receipt to be separate. FCM accepting a message is not enough to prove the Android app processed it. The receipt function is the proof that receive readiness should turn green.

Acceptance criteria:

- [ ] Provider accepted does not immediately turn receive readiness green.
- [ ] Accepted receipt turns receive readiness green.
- [ ] Rejected token turns receive readiness red.
- [ ] Validation receipt is idempotent.

## 14. Fanout Send Test

- [ ] Register at least two Android test users/devices if possible.
- [ ] Confirm each target device has:

```text
platform = android
isActive = true
tokenStatus = valid
receiveStatus = verified
```

- [ ] Sign in as one user.
- [ ] Confirm send readiness is green.
- [ ] Press Send Notification.
- [ ] Confirm `notification-fanout` runs in Appwrite logs.
- [ ] Confirm a `notification_jobs` row is created or reused by idempotency key.
- [ ] Confirm one `notification_recipients` row is created per eligible Android token.
- [ ] Confirm recipient rows do not contain raw FCM tokens.
- [ ] Confirm provider accepted/rejected counts update.
- [ ] Confirm recipient cards distinguish provider acceptance from device receipt.
- [ ] Confirm target devices submit receipts through `notification-receipt`.

Task reasoning:

This validates the central architecture: the client requests a job, but Appwrite Functions independently query database-defined recipients and call Firebase Admin. The client must never send notifications directly to other users' FCM tokens.

Acceptance criteria:

- [ ] Send button invokes Appwrite Function, not client-side FCM.
- [ ] Function creates job and recipient records.
- [ ] Each eligible device gets a recipient record.
- [ ] Recipient cards update as provider and receipt states change.
- [ ] No FCM token is exposed in recipient records or UI.

## 15. Android App State Tests

- [ ] Test foreground delivery.
- [ ] Test background delivery.
- [ ] Test terminated-app notification open.
- [ ] Test permission denied.
- [ ] Test permission later enabled in Android settings.
- [ ] Test token rotation by reinstalling or clearing app data.
- [ ] Test offline receipt queue by disabling network before receipt submission.
- [ ] Test account switching on the same phone.
- [ ] Test duplicate send button press or repeated fanout idempotency key.
- [ ] Test duplicate receipt submission.

Task reasoning:

Push notification bugs often appear only in specific Android app states. The PRD global acceptance criteria require foreground, background, terminated, permission-denied, token-rotation, offline retry, and account-switch handling.

Acceptance criteria:

- [ ] Foreground notification processing submits or queues a receipt.
- [ ] Background notification processing submits or queues a receipt.
- [ ] Terminated notification open is processed.
- [ ] Permission denial shows red receive readiness.
- [ ] Settings re-enable is detected after foreground refresh.
- [ ] Token rotation returns receive readiness to yellow until revalidated.
- [ ] Offline receipts retry later.
- [ ] Account switching does not leak token association.

## 16. Troubleshooting Checklist

- [ ] If the app cannot register, check Appwrite endpoint/project/database IDs in `.env`.
- [ ] If FCM token is missing, check `google-services.json` location and native Android build.
- [ ] If functions fail, check Appwrite Function logs first.
- [ ] If functions report missing variables, add variables in Appwrite Console and redeploy.
- [ ] If database writes fail, check table IDs, attribute IDs, indexes, and row/document security.
- [ ] If users can see other users' tokens, stop testing and fix Appwrite row/document permissions.
- [ ] If receive LED never turns green, check `notification-receipt` logs and `device_tokens.receiveStatus`.
- [ ] If fanout skips recipients, check token eligibility filters and pagination.
- [ ] If `confirmedCount` is too high, check duplicate receipt aggregation logic.

Task reasoning:

This gives the junior developer a fast way to isolate whether a failure is local config, Firebase native config, Appwrite permissions, function environment variables, or notification lifecycle logic.

## 17. Final Ready-To-Test Gate

- [ ] Firebase Android app exists.
- [ ] `google-services.json` is in the Android native app.
- [ ] Firebase service account values are in Appwrite Function variables.
- [ ] Appwrite database/tables/attributes/indexes match `backend-database-spec-sheet.md`.
- [ ] Appwrite row/document permissions prevent cross-user token reads.
- [ ] All four Appwrite Functions deploy successfully.
- [ ] Local `.env` points to the real Appwrite resources.
- [ ] Runtime hardening checklist is complete or exceptions are documented.
- [ ] Android development build installs on a physical phone.
- [ ] First user can register and create a device token.
- [ ] Receive validation can turn green after receipt.
- [ ] Send fanout creates job and recipient records.
- [ ] At least one physical Android device receives a notification and submits a receipt.

Task reasoning:

This is the go/no-go list. When all items are checked, the app is ready for real notification testing on a phone. If any item is unchecked, testing may still be useful for debugging, but the result should not be treated as proof that the full notification system works.

## Work Explanation

This checklist converts the remaining Firebase, Appwrite, repo, and Android-device setup into an ordered execution path. It is designed for a first-time setup where the developer needs to know what to do locally, what to configure in each console, what secrets must stay server-side, and what must be verified on a physical Android phone.

## Logic Behind It

The project plan in `Project_details/` requires backend-authoritative FCM fanout, authenticated receipts, verified receive readiness, secure Appwrite permissions, and Android foreground/background/terminated support. Real notification testing is only meaningful after Firebase can identify the Android app, Appwrite can store and protect the notification data, functions can send through Firebase Admin, and the installed native app can register a real FCM token.
