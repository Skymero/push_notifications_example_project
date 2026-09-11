# Checklist: Complete Token Lifecycle

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 6.2, 8.46, 8.47, 8.48, 11.2, 16, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially token rotation.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: token upsert resets status and does not fully track refresh, rotation, invalidation, or validation timestamps.

Tasks:

- [ ] Preserve existing `tokenStatus` unless the local token actually changes.
- [ ] Set `lastTokenRefreshAt` when FCM token refresh occurs.
- [ ] Set `receiveStatus = untested` after token rotation.
- [ ] Decide whether old token records are marked `rotated` or replaced atomically.
- [ ] Ensure fanout excludes `invalid`, `rotated`, `revoked`, and inactive tokens.
- [ ] Update `lastValidatedAt` after validation attempts.
- [ ] Update `lastReceivedAt` after receipt confirmation.
- [ ] Deactivate the current Android device token on sign-out.
- [ ] Do not create duplicate active token records for `userId + deviceId`.

Acceptance criteria:

- [ ] Token refresh updates the existing Android device record.
- [ ] Rotated tokens return receive readiness to yellow.
- [ ] Permanently invalid tokens are excluded from future fanout.

## Work Explanation

This work completes the Android FCM token lifecycle around refresh, rotation, validation, invalidation, and sign-out. It keeps one active token record per `userId + deviceId` and records lifecycle timestamps.

## Logic Behind It

FCM tokens can rotate or be rejected later by the provider. The PRD treats token state as operational data, so the backend must know which tokens are active, stale, invalid, or revoked before selecting recipients for fanout.
