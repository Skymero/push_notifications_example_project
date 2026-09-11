# Checklist: Production Auth Policy

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 8.1, 8.3, 11, 19, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially authentication and device registration.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: username auth currently maps to synthetic `@push.local` email addresses.

Tasks:

- [ ] Decide whether Appwrite username/password is implemented through email aliases or a real email field.
- [ ] Document the chosen Appwrite Account policy.
- [ ] Validate username format before calling Appwrite.
- [ ] Prevent username collisions caused by normalization.
- [ ] Show user-readable auth errors without raw stack traces.
- [ ] Ensure account switching deactivates or disassociates the previous device token.

Acceptance criteria:

- [ ] Registration and sign-in work on a clean Android install.
- [ ] Username normalization cannot silently map two users to one account.
- [ ] Signing out prevents device-token association leaks between accounts.

## Work Explanation

This work formalizes how username/password auth maps to Appwrite Account records. It closes the demo-only behavior around synthetic emails and documents how account switching should affect Android device tokens.

## Logic Behind It

Notification ownership depends on reliable identity. If username normalization creates collisions or sign-out leaves a token silently attached to the wrong account, the database-defined fanout model can target the wrong Android device.
