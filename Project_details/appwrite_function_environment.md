# Appwrite Function Environment Variables

This file documents the environment variables for the two active Appwrite Functions:

- `notification-fanout`
- `notification-support`

The values below are copied from the repository configuration where they are defined. Replace the remaining placeholders with values from the Appwrite and Firebase Consoles before deployment.

## `notification-fanout`

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=6a921fef001e644048b0
APPWRITE_API_KEY=standard_c82cf01e9d5a497918604ccf4352783be4af7ee045f0663202ec3c0b91dcb97b0c6dae79830291a5365e5ec5d8350d62194df24c6436e4591cd25d557b875e6c502780ccdb4a7662d70d80e5e302db6ecefddcc0aa5bd5310a104582ded1948b9e73079389a0b67f7c5edfb104a63f59dfab33ce81c810e600b57f01530f04a6

APPWRITE_DATABASE_ID=push_notifications
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts

FIREBASE_PROJECT_ID=PASTE_YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=PASTE_YOUR_FIREBASE_SERVICE_ACCOUNT_EMAIL
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nPASTE_YOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n
NOTIFICATION_INCLUDE_SENDER=true
NOTIFICATION_FANOUT_LIMIT=100
NOTIFICATION_JOB_STALE_SECONDS=300
NOTIFICATION_FANOUT_COOLDOWN_SECONDS=10
NOTIFICATION_VALIDATION_COOLDOWN_SECONDS=30
```

## `notification-support`

Use the same variables and values for the support Function:

```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=PASTE_YOUR_APPWRITE_PROJECT_ID
APPWRITE_API_KEY=PASTE_YOUR_SERVER_API_KEY

APPWRITE_DATABASE_ID=push_notifications
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts

FIREBASE_PROJECT_ID=PASTE_YOUR_FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL=PASTE_YOUR_FIREBASE_SERVICE_ACCOUNT_EMAIL
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nPASTE_YOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n
NOTIFICATION_INCLUDE_SENDER=true
NOTIFICATION_FANOUT_LIMIT=100
NOTIFICATION_JOB_STALE_SECONDS=300
NOTIFICATION_FANOUT_COOLDOWN_SECONDS=10
NOTIFICATION_VALIDATION_COOLDOWN_SECONDS=30
```

## Appwrite Function identifiers

```env
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support
```

These two `EXPO_PUBLIC_` variables belong in the mobile application's environment configuration, not in the server Function environment variables.

## Deployment notes

Create each variable in Appwrite Console under the corresponding Function's environment-variable settings. Mark these values as secrets:

```text
APPWRITE_API_KEY
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

The repository does not define the following values, so they must be supplied from the external project configuration:

- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

After adding or changing environment variables, create a new Function deployment so Appwrite applies the updated values.
