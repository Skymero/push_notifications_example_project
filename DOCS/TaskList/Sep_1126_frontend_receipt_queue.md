# Action Item

F4 [P1]: Concurrent or switched-account receipts can be lost or never retried. Goal: Serialize local queue mutations, persist ownerUserId with each receipt, replay only for the authenticated owner, save before submission, and retry after login/resume plus a bounded foreground interval.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Serialize local queue mutations, persist ownerUserId with each receipt, replay only for the authenticated owner, save before submission, and retry after login/resume plus a bounded foreground interval.
- **Location**: `lib/push-notifications/retryQueue.ts; lib/push-notifications/backgroundHandler.ts; lib/appwrite/auth.ts; app/index.tsx; types/notifications.ts`.
- **Expected outcome**: Concurrent or switched-account receipts can be lost or never retried is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: Independent queue read/write operations overwrite each other. Receipts lack owner identity, and retry runs only at root mount before a newly signed-in account is available. Serialize local queue mutations, persist ownerUserId with each receipt, replay only for the authenticated owner, save before submission, and retry after login/resume plus a bounded foreground interval. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Serialize local queue mutations, persist ownerUserId with each receipt, replay only for the authenticated owner, save before submission, and retry after login/resume plus a bounded foreground interval.
- **CONTEXT**: Original evidence `lib/push-notifications/retryQueue.ts:24-44; lib/push-notifications/backgroundHandler.ts:77-99; app/_layout.tsx:12-15`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Jest races concurrent appends/removal, tests owner isolation and transient retry recovery. Physical background/offline behavior remains external.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Jest races concurrent appends/removal, tests owner isolation and transient retry recovery. Physical background/offline behavior remains external.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Jest races concurrent appends/removal, tests owner isolation and transient retry recovery. Physical background/offline behavior remains external.
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

