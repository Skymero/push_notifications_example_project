# Action Item: Configure Firebase Cloud Messaging and `google-services.json`

Create the Firebase project-side configuration needed by the Android Expo application and the two Appwrite Functions. The finished setup must register the exact Android package `com.pushnotificationexample.app`, give the mobile build its Firebase client configuration, and give only the Appwrite Functions the Firebase Admin credentials used to send FCM messages.

This recipe follows the current project contract in [the notification PRD](../../Project_details/database_defined_push_notification_prd.md), 

[the Option 2 Function PRD](../../Project_details/notification_option2_functions_prd.md), 

[the reviewed deployment guide](../Astra/Code-Reviews/Sep_1126_deployment_guide.md), 

and the repository configuration in [app.json](../../app.json), 

[app.config.js](../../app.config.js), and [functions/_shared/firebase.ts](../../functions/_shared/firebase.ts).

```mermaid
flowchart LR
    Console[Firebase Console] -->|Android app configuration| ClientFile[google-services.json]
    ClientFile -->|repo root or EAS file variable| Build[Clean Android native build]
    Console -->|service-account private key| Values[project_id + client_email + private_key]
    Values -->|secret environment variables| Fanout[notification-fanout]
    Values -->|secret environment variables| Support[notification-support]
    Fanout --> FCM[Firebase Cloud Messaging API v1]
    Support --> FCM
    FCM --> Devices[Physical Android devices]
```

The two downloaded JSON files have different purposes. `google-services.json` identifies the Android client and is consumed while building the app. A service-account key authorizes privileged server sends and must never be placed in the mobile project, committed, or uploaded as the Android configuration file.

## Task: Confirm the fixed Android identity before opening Firebase

- **Task Category:** frontend/testing/documentation
- **Task description:** Use one exact Android application ID everywhere. Do this before registering the Firebase Android app because Firebase treats the package name as case-sensitive and does not let you change it for that registered app later.
- **Location:** [app.json](../../app.json), [app.config.js](../../app.config.js), `android/app/build.gradle`
- **Expected outcome:** Expo, Firebase, Appwrite's Android platform, and the generated APK all identify the app as `com.pushnotificationexample.app`.
- **Implementation pseudocode in natural language:** Read the Expo package. Compare it with the native Gradle application ID. Keep the Expo value as the source of truth. Because the present ignored Android directory says `com.pushnotificationexample`, plan a clean native generation instead of building that stale directory.
- **Comprehensive task explanation:** Firebase selects the matching `client` entry in `google-services.json` by Android package name. A file registered for a different package can exist and still fail at native build or initialization time. This repository's intended package is already fixed by the PRD and Expo config.

- [ ] From the repository root, run `node -p "require('./app.json').expo.android.package"`.
- [ ] Confirm the output is exactly `com.pushnotificationexample.app`.
- [ ] Run `Select-String -Path android\app\build.gradle -Pattern 'applicationId'`.
- [ ] Record that the current ignored native directory is stale if it prints `com.pushnotificationexample`.
- [ ] Do not register `com.pushnotificationexample` in Firebase to accommodate that stale directory.
- [ ] Use the clean-build instructions below so the generated native application ID comes from Expo.

## Task: Create or select the Firebase project

- **Task Category:** backend/documentation
- **Task description:** Create one Firebase project, or select the existing Firebase project that will own this notification application.
- **Location:** [Firebase Console](https://console.firebase.google.com/)

- **Expected outcome:** You are viewing the intended Firebase project and have recorded its Project ID without recording secrets in the repository.

- **Implementation pseudocode in natural language:** Sign in, create or select the project, verify its visible project name and immutable Project ID, decide whether to enable Analytics, and keep the Console on the correct project while completing all later tasks.

- **Comprehensive task explanation:** The display name can be changed and is not used by the code. The Project ID is the value used by Firebase Admin and must match the project represented by `google-services.json`. 

Google Analytics is optional for basic FCM transport, although Firebase recommends it for FCM delivery reporting.

- [ ] Open Firebase Console and sign in with the account that will own the application.

- [ ] Select **Add project**, or open the existing project intended for this app.

- [ ] If creating a project, choose a recognizable name such as `Push Notification Example`.

- [ ] Enable or decline Google Analytics according to the owner's reporting needs. This does not change the package name or server credential steps.

- [ ] Open **Project settings** using the gear next to **Project Overview**.

- [ ] On **General**, record the **Project ID** in a secure setup note. Do not confuse it with the Project name or numeric Project number.

Project Id: push-notif-example-9709c



## Task: Register the Android application

- **Task Category:** frontend/backend
- **Task description:** Add the Android client whose package matches the Expo configuration.
- **Location:** Firebase Console, **Project Overview → Add app → Android**, and [app.json](../../app.json)
- **Expected outcome:** Firebase lists an Android app for `com.pushnotificationexample.app`.

- **Implementation pseudocode in natural language:** Start the Android app registration flow, paste the exact package, optionally provide a nickname, leave SHA certificate fingerprints empty for this FCM-only setup, and register the app.

- **Comprehensive task explanation:** SHA-1 and SHA-256 fingerprints are needed by products such as Google Sign-In, Dynamic Links, or App Check with Play Integrity. This application currently uses Appwrite email/password authentication and FCM, so fingerprints are not required to obtain an FCM token or receive ordinary notifications. Add them later if a feature requires them.

- [ ] In **Project Overview**, select the Android icon or **Add app → Android**.

- [ ] Enter `com.pushnotificationexample.app` in **Android package name**. Check spelling and capitalization before continuing.

- [ ] Optionally enter `Push Notification Example Android` as the nickname.

- [ ] Leave **Debug signing certificate SHA-1** empty unless another enabled Firebase product specifically requires it.

- [ ] Select **Register app**.

- [ ] Confirm **Project settings → General → Your apps** now displays the exact package.

## Task: Download and place `google-services.json`

- **Task Category:** frontend/configuration
- **Task description:** Download the Firebase Android client configuration and put it where the existing Expo configuration expects it.
- **Location:** Firebase Console **Project settings → General → Your apps**, repository root `google-services.json`, [app.json](../../app.json), [.gitignore](../../.gitignore)
- **Expected outcome:** `C:\Users\ricky\REPOS\PushNotification_ExampleRepo\google-services.json` exists, parses as JSON, and contains an Android client for `com.pushnotificationexample.app`.
- **Implementation pseudocode in natural language:** Download the file, keep its exact filename, move it to the repository root, verify its package entry without printing the entire file, and rely on the existing Expo path. Keep the repository's ignore rule so the file is supplied deliberately to each build environment.
- **Comprehensive task explanation:** Firebase's bare-Android instructions normally place this file under the native `app/` module. In this Expo project, `app.json` points to the root file and the React Native Firebase config plugin copies/processes it during clean native generation. Do not create a hand-written substitute and do not use the service-account JSON here.

- [ ] In the Android app card, select **Download google-services.json**.

- [ ] Confirm the downloaded filename is exactly `google-services.json`, without `(1)`, `(2)`, `.txt`, or another suffix.

- [ ] Move it to `C:\Users\ricky\REPOS\PushNotification_ExampleRepo\google-services.json`.

- [ ] Do not put it inside `functions/notification-fanout` or `functions/notification-support`.

- [ ] Confirm [app.json](../../app.json) still contains `"googleServicesFile": "./google-services.json"`.

- [ ] Confirm [.gitignore](../../.gitignore) still contains `google-services.json`.

- [ ] Run the following safe validation. It prints only the matching package name:

```powershell
$firebase = Get-Content -Raw -LiteralPath .\google-services.json | ConvertFrom-Json
$firebase.client.client_info.android_client_info.package_name |
  Where-Object { $_ -eq 'com.pushnotificationexample.app' }
```

- [ ] Confirm the command prints `com.pushnotificationexample.app`.

- [ ] If it prints nothing, delete only this downloaded client file, return to the correct Firebase project/app, and download the configuration again.

- [ ] Run `npm run deployment:check` and confirm the Firebase file and package checks now say `PASS`. Other Appwrite/native checks may remain blocked until their separate setup is finished.

## Task: Enable the Firebase Cloud Messaging API v1

- **Task Category:** backend/configuration
- **Task description:** Ensure the server API used by Firebase Admin is enabled for this Firebase project.
- **Location:** Firebase Console **Project settings → Cloud Messaging → Firebase Cloud Messaging API (V1)**
- **Expected outcome:** The Cloud Messaging API v1 shows as enabled for the same project.
- **Implementation pseudocode in natural language:** Open Cloud Messaging settings, locate the API v1 status, enable it if Firebase presents an enable or manage link, and verify the page returns to an enabled state.
- **Comprehensive task explanation:** The Appwrite Functions use Firebase Admin, which obtains an OAuth access token and sends through the FCM v1 service. New Firebase projects commonly have the API enabled, but the deployment should verify rather than assume it.

- [ ] Open **Project settings → Cloud Messaging**.

- [ ] Find **Firebase Cloud Messaging API (V1)**.

- [ ] If it is disabled, select its enable/manage link, confirm the same Google Cloud project, and enable `Firebase Cloud Messaging API`.

- [ ] Return to Firebase Console and confirm API v1 is enabled.

- [ ] Record the numeric Sender ID only as troubleshooting information. The code does not need another public environment variable for it because it is contained in `google-services.json`.

## Task: Generate Firebase Admin credentials for Appwrite

- **Task Category:** backend/security/configuration
- **Task description:** Generate one service-account key and transfer only the required values into both Appwrite Function environment settings.
- **Location:** Firebase Console **Project settings → Service accounts**, Appwrite Functions `notification-fanout` and `notification-support`, [functions/_shared/env.ts](../../functions/_shared/env.ts)
- **Expected outcome:** Both active Functions have valid `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` values; no service-account key exists in source control or mobile configuration.
- **Implementation pseudocode in natural language:** Generate the private-key JSON, store it outside the repository, copy its three named properties into Appwrite's encrypted Function variables, convert the private key's real line breaks to literal backslash-n sequences only if the Appwrite field requires one line, save both Functions, then remove unnecessary local copies according to the owner's credential-storage policy.
- **Comprehensive task explanation:** `google-services.json` does not authorize server sends. The service-account private key does. The shared loader already changes literal `\n` sequences back into real newlines, and `firebase.ts` passes the three values into Firebase Admin. Never prefix these variables with `EXPO_PUBLIC_`; that would place secrets in the mobile bundle.

- [ ] Open **Project settings → Service accounts**.

- [ ] Select **Generate new private key**, then confirm **Generate key**.

- [ ] Save the downloaded service-account JSON outside this repository, outside synchronized public folders, and outside the mobile application.

- [ ] Open the JSON locally in a trusted editor. Identify `project_id`, `client_email`, and `private_key`.
"project_id": "push-notif-example-9709c",
"client_email": "firebase-adminsdk-fbsvc@push-notif-example-9709c.iam.gserviceaccount.com",
"private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC/KU467D2ftYvF\nqV+zsV7iz+TjAIbAPLqZIUQfao9KLze2PwyONsYI1hixnzoh/SNmEmjtrD2GkqIA\nsBgenjdscbBluMSSFZ/s6JpzlNSK0AUl2mWP+PlH9CmPlDC7AHrG4dO9Bo4pJZSx\nrcbp0uGgbYdnbgDGtXD0rIPDIWRQ9RKmHmHMNCsSy7cO+TH6BgvqtkCqYQkYCkua\nZ1de+4fF3fhJr2afJeYWAsd61j1Pl1+qn7SOqGwObL0CaXsWVMPeGpbOw80lrJuA\nFwh3Xtmvu+YC93HkkdBIhkt+c68GX+Y6BbXmd/JuRjeDlqMaTC4sihOrthRzJPXp\nvwb+FfJzAgMBAAECggEAK9X4gwmOfhO/GBYlhIrdg+yBg86ol+e1MI1Q1lV0w2G9\niFS/99K2qesSoZSuW4H1fqAlIK95MmVosfivp0HH2t3dQg5TQV6lHEogtPWBoc1f\nCNWiqZfB7k6ewzaL0C4leXrqt7OLoQLlrLL5ZMA/ji7fuIegtPCBlRIEaxg6rVeH\ns+kFWsd/zRALiE18CRkZYjkmsKMbwqlW6LQQZW2jfSr9WkQ/q9o2UzxkomnQR5vI\njdvRqqVncd1jWAxEDHoeL8h6I/FqzfHHim7kaCpoFdLyD3G2pK7nYQpm/VtMZ0YX\nDiULs8xcOOJAeTNrvRYZO09nfDsuyNf/xmjs5HkRqQKBgQD0u2HTYFgYi4mxvu//\nu2zrBeMC5yWXmlHW8XKf5Mwg6xla/EMqjz8wjp7ukvwoxMD17pyzrLJcg0qlx6N9\nw8T4+GpbjkxcQgnLdBWAiElnBJ8XXc4nf8eSFTrJ1DJtxYzNzvBw2s01dXX/ZRCC\nHqg2Tw3OOeJpxw5p418FVtaymwKBgQDH9n6zRRnAkRbc29g74nC3BSoIUjRb2lny\nvRdHEWxyEy+ddbuU2gg/IgG01I+44/53ZutGNE/y/UqYQconHK3qOZi5tRLq1xJe\n3gxviAMsou9/eLst7DHjGhRSyEGDthjsAYC1KNQfZoXxjjGw2sRe3VjK1FVU3re7\nZhq5Ca4xCQKBgQCB/U2WsqPYVbWLfbmIggr2QqgzkIb9IXC61IBnwWVTTsym8TrT\nzkZoCjkMy3G4TdmYR2dgYChUzz/FEmcak/N5sqj7fHe+wSzmrgAFx14FpATEqoSn\nok1koHYbYeRvPfDuGC7KIs3AyWUlhI7iLlp2jkLs+P3z5VEYmTaNZXSgZQKBgDP9\nC13ylkpxrn8HjYWsTt/WsOHu9Xv4HjC1JussRYS3JkcLCBUgRsqbPdRU+3T3mf5T\nPNJI4YxsfEtvt25Jz5G5HdMSl/OErVsK4jLRKvoc9qWurwO2iBXifuwy8o2a94nM\nrjjrf5MWZbay4Ip5plp/tAkwAWuKaDyJxGLdeHN5AoGBAOrjTkD+EOQGtLmOz7W4\nqIk3tK4bOHRM27cb95/dNa8OdYL0PY+pVrtbvjCHVs5omrpb0kQGqBveftvgfFTY\niCyJtSsgbLiInRx+YnObTUADh8hg7Ou4Pk5B8OZSvxkD2M0L3Wu/O8a40gP4NS+B\nJ274H5Ow16+H7kmBUo5+gr0G\n-----END PRIVATE KEY-----\n",

- [ ] In Appwrite Console, open **Functions → notification-fanout → Settings → Environment variables**.

- [ ] Set `FIREBASE_PROJECT_ID` to the service-account file's `project_id`.

- [ ] Set `FIREBASE_CLIENT_EMAIL` to its `client_email`.

- [ ] Set `FIREBASE_PRIVATE_KEY` to its entire `private_key`, including the BEGIN/END lines. If Appwrite requires a single line, use literal `\n` between lines; the repository loader normalizes them.

- [ ] Repeat those same three variables for **notification-support**.

- [ ] Confirm neither Function contains a variable named `GOOGLE_SERVICES_JSON`; that file variable belongs to the Android build, not the server runtime.

- [ ] Confirm `.env`, `.env.example`, `app.json`, and source files contain none of the service-account values.

- [ ] Confirm [.gitignore](../../.gitignore) contains `*-firebase-adminsdk-*.json` and `firebase-admin-service-account*.json` as a last-resort guard. Still store the key outside the repository.

- [ ] Save the variables on both Functions. If either Function has no active deployment yet, upload and activate the corresponding archive from `dist/functions`; then run a new execution so readiness checks the saved environment.

- [ ] If the private key is ever committed or shared, delete that key in Google Cloud IAM immediately, generate a replacement, and update both Functions.

## Task: Supply the file to local builds or EAS builds

- **Task Category:** frontend/configuration/deployment
- **Task description:** Choose the local-file route or the EAS secret-file route for each build environment.
- **Location:** repository root, [app.config.js](../../app.config.js), EAS project environment variables
- **Expected outcome:** Expo resolves `android.googleServicesFile` to an existing file during native generation without committing the file.
- **Implementation pseudocode in natural language:** For a local build, keep the file at the repository root. For EAS, create a secret file environment variable named `GOOGLE_SERVICES_JSON` containing the downloaded file. The dynamic Expo config already prefers that EAS path and falls back to the local root path.
- **Comprehensive task explanation:** EAS cannot upload a git-ignored local file unless the build environment supplies it. Expo's file environment variable becomes a temporary server path; `app.config.js` passes that path to `android.googleServicesFile`.

- [ ] For local builds, keep the real file at `./google-services.json` and do not set `GOOGLE_SERVICES_JSON`.
- [ ] For EAS builds, first link the repository with `eas init` if `extra.eas.projectId` is still empty.
- [ ] In the Expo project dashboard, open the environment-variable settings for the intended `preview` or `production` environment.
- [ ] Create a **file** environment variable named exactly `GOOGLE_SERVICES_JSON` and upload the real `google-services.json` as its value.
- [ ] Use secret visibility for the repository's current handling policy, even though Firebase documents the Android client identifiers as non-secret.
- [ ] Add the file variable to every EAS environment that will build this Android application.
- [ ] Do not paste the service-account JSON into `GOOGLE_SERVICES_JSON`.

## Task: Generate a clean native Android project and build

- **Task Category:** frontend/testing/deployment
- **Task description:** Generate native files from the reviewed Expo configuration so the package and Firebase plugin agree.
- **Location:** a fresh checkout/copy of the current reviewed source or EAS Build
- **Expected outcome:** The built APK/AAB uses `com.pushnotificationexample.app`, processes the matching client file, initializes React Native Firebase, and can request an FCM token.
- **Implementation pseudocode in natural language:** Avoid the stale ignored native tree. Create a fresh working copy that contains the current source and lockfile but no `android`, `ios`, `node_modules`, or generated output. Install dependencies, provide Firebase configuration, generate Android native files, and build. Alternatively, use EAS with the file variable.
- **Comprehensive task explanation:** Dropping `google-services.json` into the current repository does not repair the existing ignored Gradle `applicationId`. Clean Expo generation applies the configured React Native Firebase plugins and copies the client file to the correct native module. Keep the existing ignored directory untouched so no unrecoverable local native work is silently deleted.

- [ ] Use the fresh-copy procedure in [the deployment guide](../Astra/Code-Reviews/Sep_1126_deployment_guide.md), or use EAS Build.
- [ ] In the fresh copy, run `npm ci`.
- [ ] Put `google-services.json` at that copy's root, or confirm EAS has the file variable.
- [ ] Run `npx expo config --type public` and confirm the Android package is `com.pushnotificationexample.app` and a Google Services file path is present. Do not publish the command output if it contains environment-specific identifiers.
- [ ] For local generation, run `npx expo prebuild --platform android --no-install` in the fresh copy.
- [ ] Confirm the generated `android/app/build.gradle` application ID is `com.pushnotificationexample.app`.
- [ ] Run `npm run android` for a connected physical Android device, or `eas build --profile preview --platform android` for an installable APK.
- [ ] Treat a successful JavaScript export as insufficient; require a native Gradle/EAS build to prove the Firebase file and plugin were processed.

## Task: Verify real two-device messaging

- **Task Category:** testing/debugging
- **Task description:** Prove that the client file, Function credentials, FCM API, Appwrite deployment, receipts, and device lifecycle work together.
- **Location:** two physical Android devices, Appwrite Console execution logs and database rows, application UI
- **Expected outcome:** Two separate installations register their own tokens, pass receive validation, send fanout notifications to one another, and record trusted receipts without exposing tokens or secrets.
- **Implementation pseudocode in natural language:** Install the same reviewed build on two devices with Google Play services. Sign in with separate accounts, enable notification permission, wait for each device to pass its real validation round trip, send in both directions, then repeat foreground, background, terminated, offline-retry, and token-rotation scenarios.
- **Comprehensive task explanation:** A successful Firebase Console setup still does not prove Android notification behavior. FCM delivery varies with app state, OS permission, network, battery policy, and token rotation. The authoritative readiness indicator in this application becomes green only after `notification-support` receives the authenticated receipt.

- [ ] Use physical devices running Android 6.0 or newer with Google Play services; Android 13 and newer must grant notification permission.
- [ ] Install the clean APK on both devices.
- [ ] Sign in as different users and enable notifications on each device.
- [ ] Confirm Appwrite contains separate active device-token rows and the UI reaches the real receive-ready state only after receipt confirmation.
- [ ] Send a system-test notification from device A and confirm device B receives it in the foreground.
- [ ] Reverse the direction.
- [ ] Repeat with the receiving app backgrounded and normally terminated.
- [ ] Open a notification and confirm the recipient advances to `opened` without decrementing or double-counting `confirmedCount`.
- [ ] Temporarily disconnect one receiver, deliver/reopen the app, reconnect, and confirm the durable receipt queue clears only after support accepts it.
- [ ] Review Appwrite Function logs for both Functions. Confirm there is no `FIREBASE_NOT_INITIALIZED`, credential parsing error, sender/project mismatch, or `messaging/unknown-error`.
- [ ] Complete the full matrix in [the deployment guide](../Astra/Code-Reviews/Sep_1126_deployment_guide.md).

## Completion evidence

The Firebase portion is complete only when every Console/configuration checkbox above is complete, `npm run deployment:check` reports both Firebase checks as `PASS`, both Function readiness paths can obtain Firebase credentials, a clean native build succeeds, and two physical devices complete bidirectional delivery and trusted receipts. Never mark the task complete from `npx expo export`, TypeScript, or mocked tests alone.

Official references: [add Firebase to Android](https://firebase.google.com/docs/android/setup), [Google Services plugin and JSON processing](https://firebase.google.com/docs/android/google-services-plugin-and-file), [Firebase Admin setup](https://firebase.google.com/docs/admin/setup), [FCM server environment and API v1](https://firebase.google.com/docs/cloud-messaging/server-environment), [Android FCM client requirements](https://firebase.google.com/docs/cloud-messaging/android/get-started), and [EAS secret file variables](https://docs.expo.dev/eas/environment-variables/manage/).
