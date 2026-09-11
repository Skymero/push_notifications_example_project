# Junior Developer Checklist: Add Android `google-services.json`

**Source finding:** Critical: `google-services.json` is missing from the configured Android path  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Mobile/Firebase setup  
**Confidence:** 0.97  

## Goal

Add the Firebase Android config file required for Firebase Cloud Messaging.

# Why These Changes Are Needed

Firebase Cloud Messaging has two sides in this app. The Appwrite Functions use Firebase Admin credentials to send notifications. The Android app uses `google-services.json` to initialize Firebase locally and receive an FCM token. Both sides must point to the same Firebase project.

`app.json` already tells Expo to use `./google-services.json`, but that file is missing. That means the native Android build does not have the Firebase app configuration it needs for messaging setup. The package name inside Firebase must also match the Android package configured in `app.json`.

This change is needed because backend send capability is not enough. The device must be able to register with Firebase and produce an FCM token before Appwrite can store that token and fanout can send to it.

## Files

- `app.json`
- `google-services.json`
- `.gitignore`

## Checklist

- [ ] Open Firebase Console.
- [ ] Select the Firebase project used by the Appwrite Functions.
- [ ] Go to Project settings.
- [ ] Open the General tab.
- [ ] In "Your apps", create or select the Android app.
- [ ] Confirm Android package name is:

```text
com.pushnotificationexample.app
```

- [ ] Download `google-services.json`.
- [ ] Place it at the repo root:

```text
google-services.json
```

- [ ] Confirm `app.json` contains:

```json
"googleServicesFile": "./google-services.json"
```

- [ ] Confirm `.gitignore` includes:

```text
google-services.json
```

- [ ] Run the app on a physical Android device.
- [ ] Confirm Firebase Messaging returns a non-empty FCM token.
- [ ] Confirm the app writes the token to the Appwrite `device_tokens` collection.

## Acceptance Criteria

- [ ] `google-services.json` exists at the path configured by `app.json`.
- [ ] The Android package name in Firebase matches `com.pushnotificationexample.app`.
- [ ] The file is not committed unless the repo owner explicitly changes the policy.
- [ ] Physical Android token registration works.

## Key Caveat

Emulators and simulators are not enough for final push-notification confidence; validate on a physical Android device.
