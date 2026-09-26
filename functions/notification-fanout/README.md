# notification-fanout

Creates a notification job, selects eligible Android device tokens from Appwrite Database, sends the notification through Firebase Admin, and records sanitized recipient dispatch results.

Appwrite Console settings:

* Runtime: Node.js 22
* Upload: `dist/functions/notification-fanout.tar.gz`, generated from the repository root with `npm run functions:package`
* Root directory: archive root
* Build command: `npm ci --omit=dev`
* Entry point: `dist/notification-fanout/src/main.js`
* Execute access: authenticated users

## Required environment variables

Set these in Appwrite Console for this function:

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
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_JOB_STALE_SECONDS
```

`FIREBASE_PRIVATE_KEY` may contain escaped `\n` sequences. Shared config converts escaped newlines into real newlines at runtime.

Backend secrets must be configured only in Appwrite Function environment variables. Do not place `APPWRITE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` in mobile app `.env` files.

## Free-tier fanout behavior

`NOTIFICATION_FANOUT_LIMIT` caps the number of eligible device-token records selected in one fanout execution. It defaults to `100` when unset.

`NOTIFICATION_JOB_STALE_SECONDS` controls stale `processing` job recovery. It defaults to `300` seconds. A retry against a stale `processing` job marks that job `failed` and returns the failed status instead of leaving the caller stuck on a permanently processing job.

The reviewed maximum fanout limit is 100. `NOTIFICATION_FANOUT_COOLDOWN_SECONDS` defaults to 10; `NOTIFICATION_VALIDATION_COOLDOWN_SECONDS` defaults to 30. Their fixed time slots require the documented `rateLimitKey` unique index.

The archive includes compiled shared helpers and a production lockfile. Do not upload this source folder alone. See the [deployment guide](../../DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md) and [required database/permission delta](../../DOCS/db_struct_notification_deployment.md). The server uses `node-appwrite@20.2.1` with transaction support. Runtime credentials require document read/write, collection metadata reads, and trusted Account reads. Existing client-writable records must be reconciled before rollout.
