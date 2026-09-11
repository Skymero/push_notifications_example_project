# notification-support

Routes lower-volume notification support operations through one Appwrite Function so the project can use the Appwrite Free-tier option-2 architecture.

Supported actions:

* `sendValidation`
* `receiveValidation`
* `receipt`

Appwrite Console settings:

* Runtime: Node.js TypeScript
* Root directory: `functions/notification-support`
* Build command: `npm install && npm run build`
* Entry point: `dist/notification-support/src/main.js`
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
```

`FIREBASE_PRIVATE_KEY` may contain escaped `\n` sequences. Shared config converts escaped newlines into real newlines at runtime.

Backend secrets must be configured only in Appwrite Function environment variables. Do not place `APPWRITE_API_KEY`, `FIREBASE_CLIENT_EMAIL`, or `FIREBASE_PRIVATE_KEY` in mobile app `.env` files.
