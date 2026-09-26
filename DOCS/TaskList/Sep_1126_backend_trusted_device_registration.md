# Action Item

B5: Move device lifecycle writes into support. Repair the concrete finding recorded in [the backend code review](../Astra/Code-Reviews/Sep_1126_backend_findings.md). Follow [the junior developer workflow](../../.devin/workflows/junior-dev-checklist.md) and the [Option 2 requirements](../../Project_details/notification_option2_functions_prd.md), preserving [the original product trust boundary](../../Project_details/database_defined_push_notification_prd.md).

## Understand and implement the repair

- [x] **Task Category:** backend/debugging. **Task description:** Move device lifecycle writes into support.
- **Location:** functions/notification-support/src/handlers/device.ts; functions/notification-support/src/main.ts; functions/notification-support/src/types.ts.
- **Expected outcome:** A supplied foreign userId or verified receiveStatus cannot forge ownership/readiness; registration rotation and logout update the same trusted row safely.
- **Implementation pseudocode in natural language:** Add registerDevice and deactivateDevice actions. Validate the Android device payload, derive userId from authenticated context, and atomically upsert a deterministic registration with owner read permissions only. Reset trusted readiness on token rotation, permission loss and reactivation. Coordinate the mobile caller and existing permission migration with root.
- **Comprehensive task explanation:** First read the finding and original line evidence. Trace the affected caller through the shared handler. Implement only the scoped fix, maintaining two deployed Functions and server-only credentials. For collection attributes or permissions, root records the exact console setup; never assume editing TypeScript changes Appwrite remotely. See the Mermaid sequence in [the deployment review](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md).
- **Delegation data:** DELEGATE_TO: Backend-Agent; TASK: Move device lifecycle writes into support; CONTEXT: finding B5; ARTIFACTS: this checklist and the backend review; ACCEPTANCE_CRITERIA: A supplied foreign userId or verified receiveStatus cannot forge ownership/readiness; registration rotation and logout update the same trusted row safely.; RETURN_TO: Orchestration-Agent.
- **Confidence:** 0.95 for local implementation; actual Appwrite/Firebase/device behavior requires the external acceptance run.

## Verify behavior and record remaining setup

- [x] **Task Category:** testing/documentation. **Task description:** Add a regression that fails on the original defect and verify the implemented repair.
- **Location:** tests/backend.test.ts and this checklist.
- **Expected outcome:** Focused handler tests pass and both active Functions typecheck without weakening authorization.
- **Implementation pseudocode in natural language:** From the repository root run `npx jest tests/backend.test.ts --runInBand` to exercise real handlers with controlled database/provider substitutes. Then run `npm run functions:check` to verify active Function TypeScript contracts. Expected output is passing test assertions and no TypeScript diagnostics. Record exact results below; keep console and physical-device checks distinct.
- **Comprehensive task explanation:** Mock tests demonstrate the failure mode and recovery logic; they do not prove remote permissions or delivery. Root executes packaging/runtime verification and the mobile agent validates integration. Do not mark an external test complete without executing it.
- **Delegation data:** DELEGATE_TO: Backend-Agent; TASK: Verify B5; CONTEXT: repair B5; ARTIFACTS: this checklist and tests; ACCEPTANCE_CRITERIA: repeatable focused regression plus typecheck; RETURN_TO: Orchestration-Agent.
- **Confidence:** 0.95.

## Execution evidence

Complete locally. `npx jest tests/backend.test.ts --runInBand` is included in the full passing suite: 7 suites and 42 tests. `npm run functions:check` passes both active Functions. Appwrite/Firebase/device validation remains pending.
