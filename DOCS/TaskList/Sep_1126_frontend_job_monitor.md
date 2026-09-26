# Action Item

F7 [P2]: Recipient list truncates and previous account job remains in memory. Goal: Page recipient reads using cursor ordering, reset/cancel job work per authenticated user, serialize send calls, subscribe before reconciliation and poll the selected job while the app is active.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Page recipient reads using cursor ordering, reset/cancel job work per authenticated user, serialize send calls, subscribe before reconciliation and poll the selected job while the app is active.
- **Location**: `lib/appwrite/notifications.ts; hooks/useNotificationJob.ts; app/index.tsx`.
- **Expected outcome**: Recipient list truncates and previous account job remains in memory is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: Only first 100 recipient records are loaded. A job and its Realtime subscriptions survive logout because the hook has no account input. A brief connection gap after the first read has no later reconciliation. Page recipient reads using cursor ordering, reset/cancel job work per authenticated user, serialize send calls, subscribe before reconciliation and poll the selected job while the app is active. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Page recipient reads using cursor ordering, reset/cancel job work per authenticated user, serialize send calls, subscribe before reconciliation and poll the selected job while the app is active.
- **CONTEXT**: Original evidence `lib/appwrite/notifications.ts:154-160; hooks/useNotificationJob.ts:12-69; app/index.tsx:41`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Jest verifies pagination and account state reset; monitor recovers a change missed by Realtime. Native 1000-row scrolling remains external.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Jest verifies pagination and account state reset; monitor recovers a change missed by Realtime. Native 1000-row scrolling remains external.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Jest verifies pagination and account state reset; monitor recovers a change missed by Realtime. Native 1000-row scrolling remains external.
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

