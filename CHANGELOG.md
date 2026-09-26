# Changelog

## Unreleased

- Added a repository-specific Firebase Console and `google-services.json` junior-developer setup checklist, including server credential separation, credential-file ignore patterns, and clean native-build validation.
- Completed the Android notification deployment review and implemented its security, concurrency, lifecycle, error-handling, configuration, and monitoring repairs.
- Restricted active workspaces to `notification-fanout` and `notification-support`; added reproducible archives and isolated runtime smoke tests.
- Added server-owned profile/device lifecycle, token-bound nonce hashes, transactional receipts, deterministic idempotency, database-backed throttling, pre-send recipient persistence, and permanent-token handling.
- Added Expo-safe public configuration, Appwrite Android platform identity, early background registration, foreground display, owner-scoped durable receipts, stale-work cancellation, asynchronous fanout discovery, pagination, and Realtime reconciliation.
- Expanded regression coverage to 7 suites and 42 passing tests and documented the remaining Appwrite, Firebase, native-build, and two-device gates.
- Upgraded the two active Functions to `firebase-admin@14.4.0`, pruned retired Function lockfile entries, and documented the remaining advisories tied to the PRD-pinned Expo SDK 54 dependency graph.

- Added `Project_details/notification_project_remaining_setup_code_review.md` with remaining Appwrite, Firebase, Android, and deployment-readiness findings for the option-2 notification project.
- Added `Project_details/notification_option2_backend_spec_sheet.md` covering the `notification-fanout` and `notification-support` Appwrite Functions, including runtime contracts, database dependencies, and required Appwrite/Firebase environment variables.
- Added a CoD-style tutorial note for notification deploy verification commands and Windows permission repair at `DOCS/CoD/cod_Sep_0726_notification_deploy_checks_and_permissions.md`.
- Added `DOCS/ChangeLog.md` for workflow-specific documentation changes.
- Added the Appwrite Free-tier option-2 `notification-support` function with routed `sendValidation`, `receiveValidation`, and `receipt` actions.
- Updated the mobile Appwrite function contract to call `notification-fanout` plus consolidated `notification-support`.
- Added configurable fanout limits and stale `processing` job recovery for `notification-fanout`.
- Hardened receipt nonce validation and prevented receipt events from double-counting `confirmedCount`.
- Documented required Appwrite Function and Firebase Admin environment variables in function READMEs.
- Updated setup documentation to reference the two deployed notification functions.
- Verified `npm install`, app typecheck, Jest, and function workspace checks pass with `notification-support`.
- Pending external setup remains: fill the real Appwrite Project ID, configure Appwrite Function environment variables in Appwrite Console, and add Firebase `google-services.json` from Firebase Console.

