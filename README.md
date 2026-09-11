# Push Notification Example

Simple Expo React Native app for database-defined FCM push notification registration, readiness validation, fanout requests, and receipt confirmation.

The implementation follows:

- `Project_details/database_defined_push_notification_prd.md`
- `Project_details/push_notification_plantuml_diagrams.md`

## What Is Included

- Username/password Appwrite authentication.
- Explicit Android notification setup after authentication.
- Firebase Cloud Messaging token retrieval through React Native Firebase.
- Stable per-installation device ID persistence.
- Appwrite user-document creation and Android device-token upsert for the current signed-in user.
- Separate send and receive readiness indicators.
- Send-notification button that invokes the Appwrite fanout function.
- Job summary and recipient-card UI.
- Foreground/opened notification handlers.
- Module-level background handler registration.
- Versioned notification payload parsing.
- Idempotent receipt submission with local retry queue metadata and terminal-failure classification.
- Appwrite Function source under `functions/`.

## Required Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example` and fill in the public Appwrite values.

3. Add the Android Firebase file for a development or production build:

   - `google-services.json`
   - Keep the file out of source control. The repo `.gitignore` already excludes it.

4. Configure Appwrite collections from `Code Review Jr Checklists/backend-database-spec-sheet.md`.

5. Configure Appwrite Functions from the source folders:

   - `notification-fanout`
   - `notification-support`

   Each function README lists the root directory, build command, entry point, and environment variables.

6. Run with a native Android development build. Push notification behavior is not reliable in Expo Go.

   ```bash
   npm run android
   ```

7. Use a physical Android device for FCM testing. Confirm these flows manually:

   - first sign-in and Android permission grant
   - foreground receipt
   - background receipt
   - terminated-app notification open
   - permission denied and settings re-enable
   - token rotation after reinstall or data clear
   - offline receipt queue retry

## Validation

```bash
npm run typecheck
npm test
npm run functions:check
```

## Notes

- The client never sends notifications directly to recipient FCM tokens.
- Firebase Admin credentials and Appwrite API keys belong only in Appwrite Functions or another trusted backend environment.
- Web and iOS are intentionally out of scope for this pass.
