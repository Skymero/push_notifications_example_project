# Push Notification Example

Simple Expo React Native app for database-defined FCM push notification registration, readiness validation, fanout requests, and receipt confirmation.

Current setup instructions are in the [reviewed deployment guide](DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md), with [review findings and verification](DOCS/Astra/Code-Reviews/Sep_1126_notification_deployment_review.md) and [database/permission changes](DOCS/db_struct_notification_deployment.md). Firebase configuration, a populated Appwrite Project ID, verified server deployment, and a clean two-device Android build are required before live readiness can be claimed.

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

4. Configure Appwrite collections using the existing field sheet plus `DOCS/db_struct_notification_deployment.md`. Its server-only write permissions, nonce semantics, and rate-limit index supersede the old sheet.

5. Configure Appwrite Functions from the source folders:

   - `notification-fanout`
   - `notification-support`

   Run `npm run functions:package` and `npm run functions:smoke`; upload only the two archives under `dist/functions/`. Each function README lists its archive root, build command, entry point, and environment variables. Legacy standalone validation/receipt source is excluded from active workspaces.

6. Run the preflight, then create a clean native Android build using the deployment guide. The existing ignored Android folder is stale and should be preserved. Use a fresh native build or EAS preview APK; Expo Go cannot run this project's React Native Firebase native modules.

For a Console-by-Console Firebase recipe, service-account separation, `google-services.json` placement, EAS file variables, and physical-device acceptance, follow [the Firebase junior-developer checklist](DOCS/TaskList/Sep_1126_firebase_console_google_services_setup.md).

   ```bash
   npm run deployment:check
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
npm run functions:package
npm run functions:smoke
npm run deployment:check
```

## Notes

- The client never sends notifications directly to recipient FCM tokens.
- Firebase Admin credentials and Appwrite API keys belong only in Appwrite Functions or another trusted backend environment.
- Web and iOS are intentionally out of scope for this pass.
