# Appwrite Notification Function Rollback Baseline

Captured on 2026-10-11 before any remote Function changes. This report contains identifiers, configuration metadata, and environment-variable names only. It intentionally contains no environment-variable values or credentials.

## Target Project

| Field | Captured value |
| --- | --- |
| Appwrite endpoint | `https://nyc.cloud.appwrite.io/v1` |
| Appwrite project ID | `6a921fef001e644048b0` |
| Functions found | 2 |

## Notification Support

| Field | Captured value |
| --- | --- |
| Function ID | `6acbed74003d5dcd9af9` |
| Display name | `Notification Support` |
| Runtime | `node-26` |
| Timeout | 15 seconds |
| Execute permissions | `any` |
| Entrypoint | `src/main.js` |
| Build command | `npm install` |
| Active deployment ID | `6acc0bbf28ddd47db84f` |
| Active deployment status | `ready` |
| Latest execution ID | `6acc0e50561a3728f60f` |
| Latest execution status | `failed` |
| Latest response status | `503` |

Exact pre-change executor error:

```text
Failed to load entrypoint, file src/main.js does not exist.
```

Environment-variable names:

```text
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_DEVICE_TOKENS_COLLECTION_ID
APPWRITE_ENDPOINT
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
APPWRITE_PROJECT_ID
APPWRITE_USERS_COLLECTION_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_PROJECT_ID
NOTIFICATION_FANOUT_COOLDOWN_SECONDS
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_JOB_STALE_SECONDS
NOTIFICATION_VALIDATION_COOLDOWN_SECONDS
```

## Notification Fanout

| Field | Captured value |
| --- | --- |
| Function ID | `6acbecda0007de28bf66` |
| Display name | `notifications fanout` |
| Runtime | `node-26` |
| Timeout | 15 seconds |
| Execute permissions | `any` |
| Entrypoint | `src/main.js` |
| Build command | `npm install` |
| Active deployment ID | `6acc0bc5c219e97da54c` |
| Active deployment status | `ready` |
| Latest execution ID | `6acc09ecf255b778aed3` |
| Latest execution status | `failed` |
| Latest response status | `503` |

Exact pre-change executor error:

```text
Failed to load entrypoint, file src/main.js does not exist.
```

Environment-variable names:

```text
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_DEVICE_TOKENS_COLLECTION_ID
APPWRITE_ENDPOINT
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
APPWRITE_PROJECT_ID
APPWRITE_USERS_COLLECTION_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
FIREBASE_PROJECT_ID
NOTIFICATION_FANOUT_COOLDOWN_SECONDS
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_INCLUDE_SENDER
NOTIFICATION_JOB_STALE_SECONDS
NOTIFICATION_VALIDATION_COOLDOWN_SECONDS
```

## Rollback Table

| Function | Function ID | Prior active deployment ID | Deployment present | Deployment status |
| --- | --- | --- | --- | --- |
| Notification Support | `6acbed74003d5dcd9af9` | `6acc0bbf28ddd47db84f` | Yes | `ready` |
| notifications fanout | `6acbecda0007de28bf66` | `6acc0bc5c219e97da54c` | Yes | `ready` |

## Observations

Both active deployments are available as rollback targets. Both Functions are configured to execute `src/main.js`, and both latest executions fail before handler startup because that file does not exist in the deployed archive.

The live execute permission is `any` for both Functions. This baseline does not change that setting, but the permission should be compared with the repository's intended authenticated-caller policy during the later configuration review.
