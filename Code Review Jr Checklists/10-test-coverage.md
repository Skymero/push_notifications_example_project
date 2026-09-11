# Checklist: Add PRD Test Coverage

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially section 20 and global acceptance criteria in section 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md` and map tests to each major flow.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: the project has typechecking but no unit, integration, fanout, or physical-device tests.

Tasks:

- [ ] Add Jest configuration for TypeScript React Native tests.
- [ ] Add unit tests for permission-state normalization.
- [ ] Add unit tests for status-to-color mapping.
- [ ] Add unit tests for local token versus database-token comparison.
- [ ] Add unit tests for notification payload parsing and unknown schema rejection.
- [ ] Add unit tests for receipt retry classification.
- [ ] Add backend tests or fixtures for fanout eligibility filtering.
- [ ] Add backend tests for receipt idempotency and ownership checks.
- [ ] Add Android physical-device test checklist for foreground, background, terminated, permission denied, token rotation, offline queue, and account switching.

Acceptance criteria:

- [ ] `npm test` exists and runs the unit suite.
- [ ] Manual Android device testing is documented.
- [ ] Every PRD section 21 global acceptance criterion is covered by automated or manual validation.

## Work Explanation

This work adds automated and manual verification for the flows required by the PRD. It starts with deterministic unit tests and extends to integration and Android physical-device checks where FCM behavior cannot be simulated reliably.

## Logic Behind It

TypeScript only proves the code compiles. The PRD acceptance criteria depend on runtime behavior across authentication, permissions, token rotation, backend fanout, receipt confirmation, and Android app lifecycle states, so install readiness needs broader evidence.
