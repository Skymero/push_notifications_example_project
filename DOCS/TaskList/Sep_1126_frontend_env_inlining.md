# Action Item

F1 [P1]: Public Appwrite values disappear from the native bundle. Goal: Use literal process.env.EXPO_PUBLIC_* property reads, preserve public fallback IDs, and verify Expo transforms inline sample values.

References: [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), [product requirements](../../Project_details/database_defined_push_notification_prd.md), [review evidence](../Astra/Code-Reviews/Sep_1126_frontend_findings.md), and [sequence diagram](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Confidence: 0.94; native/remote acceptance must be completed after Firebase/Appwrite setup.

## Task Title: Implement the verified fix

- **Task Category**: frontend/debugging
- **Task description**: Use literal process.env.EXPO_PUBLIC_* property reads, preserve public fallback IDs, and verify Expo transforms inline sample values.
- **Location**: `lib/config.ts`.
- **Expected outcome**: Public Appwrite values disappear from the native bundle is no longer reproducible locally.
- **Implementation pseudocode in natural language**: First read the existing call path and referenced contract. Reproduce the exact failure described in the review. Apply the scoped fix, preserving nonce/ownership validation and the two-function boundary. Add a regression that failed before the change.
- **Comprehensive task explanation**: required(name) reads process.env[name], which Expo does not inline. Even correct environment values cannot configure a release bundle. Use literal process.env.EXPO_PUBLIC_* property reads, preserve public fallback IDs, and verify Expo transforms inline sample values. Reuse the current Expo/Appwrite stack; add no third-party dependency or database fields.
- [x] Implement scoped change.
- **DELEGATE_TO**: Frontend-Agent
- **TASK**: Use literal process.env.EXPO_PUBLIC_* property reads, preserve public fallback IDs, and verify Expo transforms inline sample values.
- **CONTEXT**: Original evidence `lib/config.ts:1-25`.
- **ARTIFACTS**: Review and orchestration Mermaid sequence diagram linked above.
- **ACCEPTANCE_CRITERIA**: Verify bundle inlining and run npm run typecheck.
- **RETURN_TO**: Orchestration-Agent

## Task Title: Verify and record results

- **Task Category**: testing/documentation
- **Task description**: Run targeted regressions and TypeScript, then mark completed local work separately from live device validation.
- **Location**: `tests/frontend*.test.ts` and this checklist.
- **Expected outcome**: Verify bundle inlining and run npm run typecheck.
- **Implementation pseudocode in natural language**: Run `npm test -- --runInBand tests/frontend` to exercise mobile regressions; run `npm run typecheck` to find contract/import errors. Expected output is all suites passing and no TypeScript errors. Record exact results; do not infer native delivery from mocks.
- **Comprehensive task explanation**: Verify bundle inlining and run npm run typecheck.
- [x] Targeted checks pass and results recorded.
- [ ] External device acceptance, where applicable, is completed after deployment.
- **DELEGATE_TO**: Testing-Agent
- **TASK**: Verify the fix using the commands and acceptance criteria above.
- **CONTEXT**: Local SDK mocks verify code behavior only; Firebase/native delivery requires a device build.
- **ARTIFACTS**: Tests and this checklist.
- **ACCEPTANCE_CRITERIA**: No regression in the fixed behavior; outstanding setup is explicit.
- **RETURN_TO**: Orchestration-Agent

## Execution evidence

Complete locally. The full Jest suite passes 7 suites and 42 tests; TypeScript passes; the Android Expo export completed. Scope includes `lib/appwrite/client.ts`: call `setPlatform` with the existing configured Android package, verified against installed Appwrite SDK behavior. Root coordinates Appwrite Console Android platform registration; no new configuration value is invented.
