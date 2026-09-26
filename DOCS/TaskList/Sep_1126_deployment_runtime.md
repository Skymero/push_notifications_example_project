# Action Item: Make the two function uploads runnable

Finding D1, priority P1. The baseline `npm run build --workspace notification-fanout` succeeds, but importing `dist/notification-fanout/src/main.js` with Node 22.17.0 fails with `ERR_MODULE_NOT_FOUND` for `dist/_shared/appwrite`. Both packages emit extensionless ES modules, claim an incorrect `main`, and document individual source roots that exclude their shared TypeScript imports. The wildcard workspaces also include all three retired functions. Reference [review](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md), [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), and [backend spec](../../Project_details/notification_option2_backend_spec_sheet.md).

## Task: Correct runtime and upload boundaries

**Task Category:** backend/testing/documentation. **Location:** [package.json](../../package.json), both active `functions/*/package.json` and `tsconfig.json`, `scripts/package-functions.cjs`, `scripts/verify-function-packages.cjs`, function READMEs. **Expected outcome:** exactly two archives, each containing its shared compiled code, correct main, and a production dependency lockfile; Node can load and invoke each handler with no repository dependencies.

**Implementation pseudocode in natural language:** Select only fanout and support as workspaces. Emit CommonJS compatible with the existing extensionless imports. Compile each function and copy the resulting dist tree into an isolated generated folder. Build a production-only manifest and lock, then archive only dist and the two manifest files. Extract every archive outside the source tree, install its locked dependencies, require its declared main, and invoke it without authentication to assert the controlled 401 response.

**Comprehensive task explanation:** Type-checking does not load compiled code, and a local build can accidentally see sibling helpers that an Appwrite upload lacks. Packaging the compiled shared tree and exercising a clean extracted artifact closes both gaps. Use Node.js 22 in Appwrite, upload the archive root, run `npm ci --omit=dev`, and use the entrypoint listed in its README. Never include the mobile app, `.env`, credentials, `node_modules`, or retired functions in an upload.

DELEGATE_TO: Backend-Agent / Testing-Agent (root integration)
TASK: Repair build/runtime packaging and verify clean artifacts.
CONTEXT: Only two deployed functions are permitted by the chosen architecture.
ARTIFACTS: D1 review finding and this checklist.
ACCEPTANCE_CRITERIA: `npm run functions:check`, `npm run functions:package`, and `npm run functions:smoke` pass for exactly two functions.
RETURN_TO: Orchestration-Agent.

- [x] Restrict workspaces and correct active package/TypeScript metadata.
- [x] Add deterministic packaging and isolated execution checks.
- [x] Update upload instructions and identify legacy source as retired.
- [x] Run the three acceptance commands and record evidence in the review.

## Task: Support transactional receipt fixes

**Task Category:** backend/testing. **Location:** active function dependency manifests and root lockfile. **Expected outcome:** transaction-capable Appwrite SDK with reproducible versions. **Implementation pseudocode in natural language:** Upgrade active server SDK to `node-appwrite@20.2.1`, the first release with database transactions, retain mobile SDK, and verify all active source against installed types. **Comprehensive task explanation:** A transaction is needed for receipt audit, recipient status, and aggregate count to commit together. Atomic increments alone cannot repair a crash between those writes. This prerequisite requires a transaction-capable Appwrite deployment and is checked in backend readiness; see the [official changelog](https://github.com/appwrite/sdk-for-node/blob/main/CHANGELOG.md).

DELEGATE_TO: Backend-Agent / root integration
TASK: Provide transaction-capable server dependency.
CONTEXT: Backend receipt race findings.
ARTIFACTS: Backend findings and this checklist.
ACCEPTANCE_CRITERIA: Active functions compile and transactional receipt regressions pass.
RETURN_TO: Orchestration-Agent.

- [x] Upgrade the two active server SDK dependencies and lockfile.
- [x] Upgrade both active Functions to `firebase-admin@14.4.0` and remove retired Function entries from the root lockfile.
- [x] Verify backend tests and document the Appwrite server prerequisite.

Execution evidence: `npm ci --ignore-scripts`, `npm run functions:check`, `npm run functions:package`, and `npm run functions:smoke` pass. Both archives install their locked production dependencies in isolated temporary directories, load their declared main file, and return the expected controlled 401 without repository dependencies. The full Jest run passes 7 suites and 42 tests. `npm ls firebase-admin --workspaces` resolves 14.4.0 for both active Functions. The remaining production-audit findings are in the PRD-pinned Expo SDK 54 graph and require a separately tested SDK 57 migration; real Appwrite transaction compatibility remains a deployment gate.
