# Action Item

F5 [P1]: Foreground delivery produces no visible notification; startup and tap promises can reject unhandled. Goal: Coordinate early entrypoint registration with orchestration, present valid foreground notifications locally with Expo, process local response taps, and consume async listener failures while keeping durable receipts.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Coordinate early entrypoint registration with orchestration, present valid foreground notifications locally with Expo, process local response taps, and consume async listener failures while keeping durable receipts.
- **Location**: `lib/push-notifications/backgroundHandler.ts; lib/push-notifications/firebaseMessaging.ts; app/_layout.tsx`.
- **Expected outcome**: Foreground delivery produces no visible notification; startup and tap promises can reject unhandled is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: Foreground RNFirebase onMessage only submits a receipt. It never asks the OS to display the notification. Background registration starts in a router layout rather than the application entrypoint and catches initialization errors as permanently registered. Coordinate early entrypoint registration with orchestration, present valid foreground notifications locally with Expo, process local response taps, and consume async listener failures while keeping durable receipts. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Coordinate early entrypoint registration with orchestration, present valid foreground notifications locally with Expo, process local response taps, and consume async listener failures while keeping durable receipts.
- **CONTEXT**: Original evidence `lib/push-notifications/backgroundHandler.ts:25-41,104-124; app/_layout.tsx:10`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Jest verifies local presentation and receipt on tap, listener cleanup, and initial-notification failure. Physical foreground/background/terminated tests remain external.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Jest verifies local presentation and receipt on tap, listener cleanup, and initial-notification failure. Physical foreground/background/terminated tests remain external.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Jest verifies local presentation and receipt on tap, listener cleanup, and initial-notification failure. Physical foreground/background/terminated tests remain external.
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

