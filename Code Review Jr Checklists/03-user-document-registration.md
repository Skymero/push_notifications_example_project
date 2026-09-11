# Checklist: Create User Documents During Registration

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 6.1, 8.3, 8.6, 11.1, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially registration and device setup.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: account creation does not create or update the required user document.

Tasks:

- [ ] Add `users` collection constants to the client data layer.
- [ ] After successful registration, create a user document keyed or indexed by Appwrite Account user ID.
- [ ] Store `userId`, `username`, `notificationEnabled`, `activeDeviceId`, `activeDeviceTokenId`, `createdAt`, and `updatedAt`.
- [ ] After device-token upsert, update `activeDeviceId` and `activeDeviceTokenId`.
- [ ] Ensure sign-in loads the existing user document.
- [ ] Do not let the client update backend-controlled token validity fields.
- [ ] Add Appwrite document permissions so users read/update only their own permitted user fields.

Acceptance criteria:

- [ ] Registering creates one Account user and one matching app user document.
- [ ] Device sync updates the current user's active device references.
- [ ] Reopening the app does not create duplicate user documents.

## Work Explanation

This work connects Appwrite Account identity to the application-level `users` collection required by the PRD. It ensures registration creates both authentication state and the database record that tracks notification enablement and active device references.

## Logic Behind It

Appwrite Account alone does not carry the project-specific notification fields. The fanout and readiness flows need a stable app user document so the backend can associate each Android device token with an owner and the UI can reason about the user's current active device.
