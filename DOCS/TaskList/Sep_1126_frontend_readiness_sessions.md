# Action Item

F6 [P1]: Readiness and sign-out can retain stale authenticated state. Goal: Bind async work to a session/run generation, serialize readiness refresh, cancel polling/listeners on cleanup, retry receipts on session activation, and surface sign-out failure without clearing the account.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Bind async work to a session/run generation, serialize readiness refresh, cancel polling/listeners on cleanup, retry receipts on session activation, and surface sign-out failure without clearing the account.
- **Location**: `hooks/useNotificationReadiness.ts; lib/appwrite/auth.ts; app/index.tsx`.
- **Expected outcome**: Readiness and sign-out can retain stale authenticated state is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: A validation poll continues across logout or another validation. It can later paint the new account green. App-state refresh overlaps existing work. signOut suppresses session deletion failure so UI can show signed out while the backend session remains active. Bind async work to a session/run generation, serialize readiness refresh, cancel polling/listeners on cleanup, retry receipts on session activation, and surface sign-out failure without clearing the account. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Bind async work to a session/run generation, serialize readiness refresh, cancel polling/listeners on cleanup, retry receipts on session activation, and surface sign-out failure without clearing the account.
- **CONTEXT**: Original evidence `hooks/useNotificationReadiness.ts:34-61,159,202-234; lib/appwrite/auth.ts:58-64; app/index.tsx:71-78`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Jest verifies stale work ignored, no overlapping validation, and failed sign-out remains an error. npm run typecheck.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Jest verifies stale work ignored, no overlapping validation, and failed sign-out remains an error. npm run typecheck.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Jest verifies stale work ignored, no overlapping validation, and failed sign-out remains an error. npm run typecheck.
- [x] Targeted checks pass and results recorded.
- [ ] External device acceptance, where applicable, is completed after deployment.
- **DELEGATE_TO**: Testing-Agent
- **TASK**: Verify the fix using the commands and acceptance criteria above.
- **CONTEXT**: Local SDK mocks verify code behavior only; Firebase/native delivery requires a device build.
- **ARTIFACTS**: Tests and this checklist.
- **ACCEPTANCE_CRITERIA**: No regression in the fixed behavior; outstanding setup is explicit.
- **RETURN_TO**: Orchestration-Agent

## Execution evidence

Complete locally. The full Jest suite passes 7 suites and 42 tests; TypeScript passes; the Android Expo export completed. Physical-device acceptance remains pending.

