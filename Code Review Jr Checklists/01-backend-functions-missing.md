# Checklist: Implement Missing Appwrite Functions

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 3.4, 10, 11, 12, 15, 16, 19, 20, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially the Appwrite Function, database, FCM, and receipt paths.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: the app calls Appwrite Functions, but no function source exists in the repo.

Tasks:

- [ ] Create `functions/notification-send-validation/`.
- [ ] Create `functions/notification-receive-validation/`.
- [ ] Create `functions/notification-fanout/`.
- [ ] Create `functions/notification-receipt/`.
- [ ] Add per-function `package.json`, source entrypoint, and README.
- [ ] Add shared function utilities for Appwrite Admin client initialization.
- [ ] Add shared function utilities for Firebase Admin initialization.
- [ ] Add request parsing and normalized error responses.
- [ ] Require Appwrite authentication for all function calls.
- [ ] Return sanitized responses only; never return FCM tokens.
- [ ] Add local function environment documentation.

Acceptance criteria:

- [ ] Client calls in `lib/appwrite/notifications.ts` have matching deployed function IDs.
- [ ] All functions can be sourced from this repo.
- [ ] Functions use server-side credentials only.
- [ ] `npm run typecheck` still passes.

## Work Explanation

This work creates the trusted backend surface that the mobile app already expects to call. The current client has function invocation methods, but without source-controlled Appwrite Functions there is no secure place to validate send access, send validation notifications, perform fanout, or accept receipts.

## Logic Behind It

`Project_details/` requires all cross-device delivery to happen server-side. Implementing these functions in the repo gives the project a reproducible backend, keeps Firebase Admin credentials out of Android builds, and gives the client stable contracts for readiness, fanout, and receipt confirmation.
