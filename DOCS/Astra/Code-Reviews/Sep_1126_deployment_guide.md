# Deploy the reviewed Android notification app

This guide is the current deployment path for the [reviewed fixes](Sep_1126_notification_deployment_review.md). It uses exactly two Appwrite Functions: `notification-fanout` and `notification-support`. Older standalone receipt/validation folders are retained as historical source and excluded from active workspaces and upload archives. The implementation targets multiple Android devices; iPhone support has not been implemented or validated.

## Prepare the Appwrite project

Use your real Appwrite endpoint, project ID, database ID, and collection IDs consistently in the mobile build and both server functions. The reviewed local `.env` still had an empty Project ID. Register the Android platform package `com.pushnotificationexample.app` in Appwrite Console; it must match Expo, Firebase, and the generated Android application ID. Enable the email/password auth method used by the application's username-to-email login flow.

Apply [the database and permission delta](../../db_struct_notification_deployment.md) to the existing field specification. In particular, create the nullable `notification_jobs.rateLimitKey` string and unique index, enable document security, remove client write grants from profiles and device-token rows, and reconcile any legacy rows. Verify transaction support on the actual server. These steps are required even if all five collections already exist.

## Build and upload the two server artifacts

From the repository root, run these commands in PowerShell:

```powershell
npm ci
npm run functions:check
npm run functions:package
npm run functions:smoke
```

`functions:package` compiles the current source into fresh folders and creates production dependency locks. It needs npm registry access unless its dependencies and metadata are already cached; set `FUNCTIONS_OFFLINE=1` only when deliberately testing a populated offline cache. `functions:smoke` extracts the actual archives outside the checkout, installs only their locked runtime dependencies, loads each entrypoint, and verifies an unauthenticated call returns a controlled 401. It does not connect to Appwrite or Firebase.

| Appwrite Function ID | Upload | Runtime | Root within upload | Build command | Entrypoint |
| --- | --- | --- | --- | --- | --- |
| `notification-fanout` | `dist/functions/notification-fanout.tar.gz` | Node.js 22 | archive root | `npm ci --omit=dev` | `dist/notification-fanout/src/main.js` |
| `notification-support` | `dist/functions/notification-support.tar.gz` | Node.js 22 | archive root | `npm ci --omit=dev` | `dist/notification-support/src/main.js` |

Set execute access to authenticated users (`Role.users()`), enable the deployments, and keep the configured IDs identical to the mobile public variables. The archives contain compiled shared helpers, so do not upload an individual source folder or substitute the historical README build instructions. Appwrite's build operates on the configured function root and needs the dependency manifest there. [Appwrite function development](https://appwrite.io/docs/products/functions/develop)

Set all of the following in **each function's server environment**, using values from your project. The server API key needs the runtime permissions described in the database guide.

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

Firebase project/client email/private key come from the service account for the same project as the Android app. The loader accepts escaped `\n` in the private key. Never add these server credentials to Expo public variables or the mobile `.env`. Registration/profile actions can operate with Appwrite configuration alone; readiness validation and actual sending require Firebase.

Optional server settings are `NOTIFICATION_INCLUDE_SENDER` (default true), `NOTIFICATION_FANOUT_LIMIT` (default 100; reviewed maximum 100), `NOTIFICATION_JOB_STALE_SECONDS` (default 300), `NOTIFICATION_FANOUT_COOLDOWN_SECONDS` (default 10), and `NOTIFICATION_VALIDATION_COOLDOWN_SECONDS` (default 30). Configure the Appwrite execution timeout below the stale-job threshold. This demo intentionally caps targets; it is not an unbounded broadcast service. Provider acceptance is distinct from device confirmation. Interrupted sends are not automatically resent because FCM submission and database writes cannot share one atomic transaction.

The mobile sends fanout requests directly as `{notificationType: 'system_test', idempotencyKey}`. It invokes support as `{action, payload}` for `ensureProfile`, `registerDevice`, `deactivateDevice`, `sendValidation`, `receiveValidation`, and `receipt`. The three additional support actions close the old client-write trust gap without creating another deployed function.

## Supply Firebase and build an Android APK

Create a Firebase Android app for `com.pushnotificationexample.app` and obtain its real `google-services.json`. For a local build, put the file at the repo root. For EAS, configure a file environment variable named `GOOGLE_SERVICES_JSON`; [app.config.js](../../../app.config.js) reads its build-time file path. Firebase Admin credentials belong only in Appwrite. [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)

Set `EXPO_PUBLIC_APPWRITE_ENDPOINT`, `EXPO_PUBLIC_APPWRITE_PROJECT_ID`, `EXPO_PUBLIC_APPWRITE_DATABASE_ID`, the collection-ID variables in `.env.example`, and the two function IDs in your chosen build environment. Expo embeds these public variables when it bundles the application, so rebuild after changing them. The `.env` file is ignored by Git and is not automatically supplied to EAS; configure the corresponding EAS environment values as well. [Expo public variables](https://docs.expo.dev/guides/environment-variables/)

Run `npm run deployment:check`. It identifies missing local public configuration, Firebase file/package mismatches, and the current native package mismatch without printing values. At review time it intentionally failed for the empty Project ID, missing Firebase file, and stale ignored native Android tree; EAS linkage was also pending.

For a shareable cloud-built APK, link the project through EAS, select the intended build environment, and run `eas build --platform android --profile preview`. The existing preview profile produces an internally distributed APK. EAS should generate native Android from the reviewed Expo configuration; verify the build upload omits the stale ignored `android/` directory. Install the resulting APK on both phones. A production AAB is intended for Play distribution and cannot be installed like an APK.

For local native development, preserve the existing ignored Android directory. Its Gradle application ID currently differs from Expo config, and Git cannot restore ignored edits. Work in a fresh copy of the **current reviewed files**, excluding `.git`, `node_modules`, `android`, `ios`, and generated output. Include the current lockfile and both active function workspaces. Provide the real public `.env` and Firebase JSON, then run `npm ci`, `npx expo prebuild --platform android --no-install`, and `npm run android` in that copy. Verify Java/Android SDK/USB debugging prerequisites on the build machine. Existing native directories prevent automatic regeneration, so repeatedly running `npm run android` in the stale tree is not a configuration fix. [Expo native generation](https://docs.expo.dev/workflow/continuous-native-generation/)

## Two-device acceptance record

Use two physical Android phones with separate accounts first, then test the same account on two installations. Record device models, Android versions, APK/build identity, and job IDs in your test notes. The following scenarios remain unverified until run with real deployments.

| Scenario | Expected evidence | Result |
| --- | --- | --- |
| Both phones sign in and enable notifications | Owner-read device rows; real validation pushes; receive indicator green only after receipt | Pending |
| A sends while B is foreground; then reverse | Visible notification, one target record per device, provider result, trusted receipt | Pending |
| B backgrounded, then app normally terminated | OS notification appears; open reaches app; receipt updates without double counting | Pending |
| Android force-stop | No delivery guarantee while force-stopped; reopen app and retry a fresh test | Platform limitation |
| Permission denied, then re-enabled in settings | Receive indicator stays non-green until permission/token/round-trip recover | Pending |
| Offline receipt, reconnect, resume/sign in | Durable queue submits for matching account and removes only accepted/terminal entries | Pending |
| Sign out and switch account on one phone | Old account device deactivated; no old job UI or cross-account receipt replay | Pending |
| Reinstall/token rotation | New token/device registration; old invalid token excluded; new receive validation required | Pending |
| Concurrent devices and repeated receipt/open events | Distinct recipients counted once each; opened status never downgraded | Pending |
| Repeated button/request keys and rapid distinct sends | Same job reused; no duplicate dispatch for same key; rate limit controlled | Pending |
| Direct client writes and cross-account reads | Profile/device mutations denied; another account's raw tokens inaccessible | Pending |

Run local checks again after any final configuration/source changes. A green test suite and loadable archives establish local readiness; successful native installation, Appwrite permissions/transactions, and these FCM round trips establish deployment readiness.
