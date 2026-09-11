# Checklist: Android Permission Request Flow

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 7.2, 8.7, 8.8, 8.9, 8.10, 13.2, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially permission request flow.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: permission request can happen automatically during readiness refresh and may not provide the required explanation path.

Tasks:

- [ ] Separate `checkPermission` from `requestPermission`.
- [ ] Add an explicit Android notification setup section before the OS prompt.
- [ ] Request permission only after authentication.
- [ ] Do not request permission automatically on every foreground refresh.
- [ ] Persist denied permission status to the current device token record.
- [ ] Show an open-settings action when permission is denied.
- [ ] Recheck permission when app returns to foreground.

Acceptance criteria:

- [ ] The Android OS prompt appears only after the user takes the setup action.
- [ ] Denial does not cause repeated prompts.
- [ ] Permission changes in Android settings update receive readiness after returning to the app.

## Work Explanation

This work separates permission checking from permission requesting and adds a deliberate Android setup path. The user sees the setup state before the OS prompt, and later foreground checks only refresh state.

## Logic Behind It

The PRD requires permission to be requested after authentication and not repeatedly after denial. Keeping checks and prompts separate prevents accidental prompt loops and makes denied-permission recovery explicit through Android settings.
