# Action Item

F3 [P1]: Device lifecycle can retain revoked readiness and misreport permission. Goal: Consume authenticated support registerDevice/deactivateDevice actions agreed with backend. Let backend own token/readiness writes and derive user identity. On Android use Expo permission result as authoritative.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Consume authenticated support registerDevice/deactivateDevice actions agreed with backend. Let backend own token/readiness writes and derive user identity. On Android use Expo permission result as authoritative.
- **Location**: `lib/appwrite/notifications.ts; lib/push-notifications/firebaseMessaging.ts`.
- **Expected outcome**: Device lifecycle can retain revoked readiness and misreport permission is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: Same-token login restores isActive while retaining revoked tokenStatus; Android requestNotificationPermission discards the Expo prompt result in favor of Firebase requestPermission. Device readiness is also writable directly from the client. Consume authenticated support registerDevice/deactivateDevice actions agreed with backend. Let backend own token/readiness writes and derive user identity. On Android use Expo permission result as authoritative. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Consume authenticated support registerDevice/deactivateDevice actions agreed with backend. Let backend own token/readiness writes and derive user identity. On Android use Expo permission result as authoritative.
- **CONTEXT**: Original evidence `lib/appwrite/notifications.ts:48-60; lib/push-notifications/firebaseMessaging.ts:87-101`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Jest verifies Android denial, support envelopes with no trusted userId, and no client device writes. Backend verifies reactivation.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Jest verifies Android denial, support envelopes with no trusted userId, and no client device writes. Backend verifies reactivation.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Jest verifies Android denial, support envelopes with no trusted userId, and no client device writes. Backend verifies reactivation.
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

