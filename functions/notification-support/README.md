# notification-support

Routes lower-volume notification support operations through one Appwrite Function so the project can use the Appwrite Free-tier option-2 architecture.

Supported actions:

* `sendValidation`
* `receiveValidation`
* `receipt`
* `ensureProfile`
* `registerDevice`
* `deactivateDevice`

Appwrite Console settings:

* Runtime: Node.js 22
* Upload: `dist/functions/notification-support.tar.gz`, generated from the repository root with `npm run functions:package`
* Root directory: archive root
* Build command: `npm ci --omit=dev`
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

`ensureProfile`, `registerDevice`, and `deactivateDevice` derive the user from the authenticated execution and require only Appwrite variables. Firebase is required for sending and readiness validation. `receipt` requires the raw FCM nonce; the stored value is a digest bound to the token.

Optional settings include `NOTIFICATION_VALIDATION_COOLDOWN_SECONDS` (30), `NOTIFICATION_FANOUT_COOLDOWN_SECONDS` (10), `NOTIFICATION_JOB_STALE_SECONDS` (300), and `NOTIFICATION_FANOUT_LIMIT` (100, maximum 100). The cooldowns require the documented unique rate-limit index.

The upload contains compiled shared helpers and a production lockfile. Do not upload this source folder alone. See the [deployment guide](../../DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md) and [required database/permission delta](../../DOCS/db_struct_notification_deployment.md). The server uses transaction-capable `node-appwrite@20.2.1`; verify real server transactions, runtime key scopes, and legacy row permissions before rollout.
