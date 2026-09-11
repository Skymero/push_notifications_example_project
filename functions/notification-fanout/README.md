# notification-fanout

Creates a notification job, selects eligible Android device tokens from Appwrite Database, sends the notification through Firebase Admin, and records sanitized recipient dispatch results.

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-fanout`
* Build command: `npm install && npm run build`
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
