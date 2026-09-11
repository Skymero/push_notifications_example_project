# Checklist: Firebase FCM Website Setup

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 3.3, 3.4, 8.2, 8.3, 8.8, 10, 12, 17, 19, 20.3, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially registration, fanout, recipient processing, receipt confirmation, and token rotation.
- [ ] Before handoff, verify the Firebase setup still supports the plan in `Project_details/`.

External source references:

- Firebase Android FCM setup: https://firebase.google.com/docs/cloud-messaging/android/get-started
- Firebase server environment and FCM: https://firebase.google.com/docs/cloud-messaging/server-environment
- Firebase HTTP v1 / service account authorization: https://firebase.google.com/docs/cloud-messaging/send/v1-api
- Firebase token management: https://firebase.google.com/docs/cloud-messaging/manage-tokens

Owner decisions:

- [ ] Configure Android only for this pass.
- [ ] Do not configure web push.
- [ ] Do not implement topic messaging.
- [ ] Use Appwrite Functions as the trusted server environment.
- [ ] Keep Firebase Admin credentials out of the mobile client.

## Firebase Project Setup

- [ ] Sign in to https://console.firebase.google.com/.
- [ ] Create a Firebase project or select the existing project for this app.
- [ ] Record the Firebase project ID for backend function environment variables.
- [ ] Confirm Google Analytics setting with the project owner; Firebase recommends Analytics for FCM delivery reporting.
- [ ] Open Project Settings.
- [ ] Confirm the project number / sender ID is visible in settings.

## Android App Registration

- [ ] In Firebase Console, open Project Settings.
- [ ] Add an Android app.
- [ ] Enter the final Android package name from `app.json`.
- [ ] Do not use placeholder `com.example.pushnotification` for production readiness.
- [ ] Add an Android app nickname that identifies this repo/environment.
- [ ] Add the debug SHA-1 if using Google auth or features that require it.
- [ ] Add release SHA-1/SHA-256 if the release signing key is available.
- [ ] Register the Android app.
- [ ] Download `google-services.json`.
- [ ] Place `google-services.json` where the Expo/React Native Firebase build expects it.
- [ ] Confirm `google-services.json` is ignored by Git when it contains environment-specific Firebase values.

## Cloud Messaging API

- [ ] In Firebase Console, open Project Settings.
- [ ] Open the Cloud Messaging tab.
- [ ] Confirm Firebase Cloud Messaging API (HTTP v1) is enabled.
- [ ] Record the sender ID / project number for troubleshooting.
- [ ] Do not create web push certificates, because web support is out of scope.
- [ ] Do not use Firebase topics for fanout, because the PRD requires database-defined recipient tokens.

## Service Account For Appwrite Functions

- [ ] In Firebase Console, open Project Settings.
- [ ] Open the Service Accounts tab.
- [ ] Select the Node.js Firebase Admin SDK option if shown.
- [ ] Generate a new private key only for the backend environment.
- [ ] Store the downloaded JSON securely.
- [ ] Extract `project_id` into `FIREBASE_PROJECT_ID`.
- [ ] Extract `client_email` into `FIREBASE_CLIENT_EMAIL`.
- [ ] Extract `private_key` into `FIREBASE_PRIVATE_KEY`.
- [ ] Preserve newline formatting in the private key or document escaped newline handling for Appwrite Functions.
- [ ] Add those values only to Appwrite Function environment variables.
- [ ] Do not add service account JSON or Admin credentials to `.env`, `app.json`, source files, or the mobile build.
- [ ] Rotate the key if it is accidentally committed, shared, or exposed.

## Appwrite Function Alignment

- [ ] Confirm `notification-send-validation` can initialize Firebase Admin using the service account values.
- [ ] Confirm `notification-receive-validation` can send only to the authenticated user's Android token.
- [ ] Confirm `notification-fanout` can send to database-defined Android FCM registration tokens.
- [ ] Confirm `notification-receipt` does not require Firebase Admin credentials.
- [ ] Confirm all function logs redact complete FCM tokens and private key values.

## Android Device Validation

- [ ] Build a native Android development or production build; do not rely on Expo Go for FCM validation.
- [ ] Install the app on an Android device running Android 6.0 or newer with Google Play services.
- [ ] Sign in or register through the app.
- [ ] Grant notification permission when prompted.
- [ ] Confirm the app obtains a non-empty FCM token.
- [ ] Confirm the token is stored in the Appwrite `deviceTokens` collection for the current user and device.
- [ ] Use receive validation to send a test notification to the current device.
- [ ] Confirm provider acceptance is recorded separately from device receipt.
- [ ] Confirm the Android device submits a receipt after processing the validation notification.
- [ ] Confirm receive readiness becomes green only after the receipt is accepted.
- [ ] Use fanout to send a system test notification to eligible database-defined Android tokens.
- [ ] Confirm recipient cards distinguish provider acceptance from device receipt.

## Handoff Evidence

- [ ] Firebase project ID recorded in backend deployment notes.
- [ ] Android package name matches Firebase Android app registration.
- [ ] `google-services.json` exists locally for Android build, but is not committed if environment-specific.
- [ ] Appwrite Functions contain Firebase Admin environment variables.
- [ ] Android physical-device foreground notification test passed.
- [ ] Android physical-device background notification test passed.
- [ ] Android physical-device terminated/open notification test passed.
- [ ] No client file contains Firebase Admin private key, service account JSON, or Appwrite server API key.

## Work Explanation

This work configures the Firebase Console pieces required for Android FCM. It covers project creation, Android app registration, `google-services.json`, Cloud Messaging API readiness, and service account values for Appwrite Functions.

## Logic Behind It

The Android client needs Firebase app metadata to receive an FCM token, while the backend needs Firebase Admin credentials to send notifications. Keeping those setup paths separate preserves the PRD security boundary: Android receives and confirms notifications, Appwrite Functions send them.
