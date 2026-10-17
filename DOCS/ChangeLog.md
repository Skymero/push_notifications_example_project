# DOCS ChangeLog

## 2026-10-11

- Wired `productionLock()` into `scripts/package-functions.cjs` so each function archive ships a pruned `package-lock.json` (212 entries — the function's own dependency closure walked from the root lockfile, not the 1055-package monorepo tree). Without it, the documented `npm ci --omit=dev` Appwrite build command would fail for lack of a lockfile.
- Switched `scripts/verify-function-packages.cjs` from `npm install` to `npm ci --omit=dev` so the smoke test exercises the real live install path, and added a hard failure when an archive lacks `package-lock.json`.
- Added `--force-local` to all `tar` invocations and replaced `-C <dir>` with running tar from the target directory, so the scripts work under GNU tar (Git Bash) as well as Windows bsdtar (PowerShell); GNU tar previously rejected drive-letter paths.
- Verified: `functions:package`, `functions:smoke` (211 packages installed via `npm ci`, isolated runtime import + `AUTH_REQUIRED` auth boundary pass for both functions), archive inventories contain `package.json`, `package-lock.json`, `dist/<fn>/src/main.js`, `dist/_shared/*.js`, and archived `package.json.main` matches the expected compiled entrypoints.
- Added `scripts/deploy-function.cjs` to run the entrypoint update, archive upload, ready-poll, activation, and unauthenticated probe for one function at a time; currently blocked pending an API key with `functions.write` scope.
- Added `DOCS/TaskList/Oct_1126_notification_functions_review_fixes.md` — junior-dev checklist for the code-review findings (timeout sizing, receiveValidation finalization, notificationType payload, pending-recipient reconciliation, device-write rate limiting, and smaller cleanups).

## 2026-09-11

- Added `DOCS/TaskList/Sep_1126_firebase_console_google_services_setup.md` with the exact Firebase Console, Android client file, Firebase Admin credential, EAS/local build, and two-device verification procedure; added ignore patterns for common Firebase Admin key filenames.
- Added `DOCS/Astra/Code-Reviews/Sep_1126_notification_deployment_review.md` with the completed two-function review, Mermaid sequence, fourteen source findings, local evidence, and external release boundary.
- Added backend/frontend finding reports and finding-specific junior checklists under `DOCS/TaskList/`; completed their local implementation and retained remote/device acceptance items as open.
- Added `DOCS/db_struct_notification_deployment.md` for transactions, rate-limit/query indexes, nonce hashes, server-only writes, legacy permission migration, and runtime scopes.
- Added `DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md` with exact archive settings, environment setup, clean Android build routes, and a two-device matrix.
- Added `DOCS/CoD/cod_Sep_1126_two_function_notification_deployment_review.md` following `.devin/workflows/cod.md`, with reproduced errors, debugging play-by-play, commented snippets, solutions, concepts, verification, and remaining setup.
- Updated current READMEs and historical specifications to identify the reviewed two-function instructions as authoritative and the three standalone support functions as retired.
- Upgraded both deployable Functions to `firebase-admin@14.4.0`, removed retired Function entries from the root lockfile, verified a clean install, and recorded the Expo SDK 54 audit boundary that requires a separate major-SDK migration.

## 2026-09-07

- Added `Project_details/notification_project_remaining_setup_code_review.md` with the remaining setup and deploy-readiness review for the notification project.
- Added `Project_details/notification_option2_backend_spec_sheet.md` for the option-2 Appwrite notification functions and their Appwrite/Firebase environment variables.
- Added `DOCS/CoD/cod_Sep_0726_notification_deploy_checks_and_permissions.md`.
- Documented the notification deployment verification commands using the `engr-tutor` explanation style and `cod.md` debugging-log structure.
- Explained successful and common failing output for `npm run functions:check`, `npm run typecheck`, and `npx jest --runInBand`.
- Documented the corrected Windows `takeown` and `icacls` permission repair process, including the PowerShell-safe `$($env:USERNAME)` syntax.

