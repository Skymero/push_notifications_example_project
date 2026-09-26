# Action Item: Finish configuration and prove installation readiness

Findings D2 and D3, priority P1. Firebase is not the only outstanding setup. The reviewed `.env` has an empty `EXPO_PUBLIC_APPWRITE_PROJECT_ID`; `google-services.json` is absent; `app.json` has an empty EAS project ID; and the ignored existing Android Gradle application ID differs from the Expo package. This checklist follows [the review](../Astra/Code-Reviews/Sep_1126_notification_deployment_review.md), [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md), and [original acceptance criteria](../../Project_details/database_defined_push_notification_prd.md).

## Task: Add a repeatable configuration preflight

**Task Category:** testing/documentation. **Location:** `scripts/check-deployment.cjs`, `app.config.js`, root package scripts, README. **Expected outcome:** missing account-owned configuration is detected without disclosing its contents. **Implementation pseudocode in natural language:** Check public Appwrite value presence; validate Firebase file package identity; detect the existing stale Android package; report EAS linkage as a cloud-build prerequisite. Allow EAS to supply Firebase JSON through `GOOGLE_SERVICES_JSON`. **Comprehensive task explanation:** An APK needs build-time public Appwrite values and the matching Firebase Android configuration. Adding variables later does not repair an already bundled APK. EAS excludes ignored `.env` and Firebase files unless supplied through its build environment/file variables. See [Expo environment documentation](https://docs.expo.dev/guides/environment-variables/) and [EAS environment variables](https://docs.expo.dev/eas/environment-variables/).

DELEGATE_TO: Testing-Agent / root integration
TASK: Configuration preflight and cloud Firebase file path support.
CONTEXT: Local .env and native evidence contradict Firebase-only readiness.
ARTIFACTS: Findings D2-D3 and this checklist.
ACCEPTANCE_CRITERIA: Preflight returns actionable missing-item names without values; Expo config retains Android package.
RETURN_TO: Orchestration-Agent.

- [x] Implement and run the preflight.
- [x] Support Firebase file environment variable for EAS.
- [x] Document local and cloud build prerequisites.
- [ ] Populate the real Appwrite Project ID in local build configuration (account-owned; pending).
- [ ] Register Android package `com.pushnotificationexample.app` in Appwrite Console (remote; unverified).
- [ ] Create Firebase Android app for that package, supply its JSON, and configure server credentials in both functions (account-owned; pending).

## Task: Build a clean Android install and test two devices

**Task Category:** testing. **Location:** EAS preview build, or a fresh staging copy of current reviewed source; physical devices. **Expected outcome:** independently installed devices can register, send to each other, and confirm reception. **Implementation pseudocode in natural language:** Link the EAS project, populate its public environment and Firebase file variable, build the preview APK, and install it on two phones. Alternatively copy current source to a fresh directory excluding `.git`, `node_modules`, `android`, and `ios`; install dependencies and run Expo prebuild there after providing Firebase configuration. Exercise the matrix in the deployment guide. **Comprehensive task explanation:** Do not delete the existing ignored native tree: Git cannot recover its edits. Its Gradle application ID currently differs from Expo config, and Expo does not regenerate an existing native directory automatically. Preview APKs are installable directly; production AABs are intended for store distribution. The current code implements Android only.

DELEGATE_TO: Testing-Agent / device owner
TASK: Native build and two-device acceptance.
CONTEXT: Static/unit tests cannot prove FCM delivery.
ARTIFACTS: Deployment guide and review verification record.
ACCEPTANCE_CRITERIA: A-to-B and B-to-A delivery in foreground/background/open, trusted receipts, denial/re-enable, account switch and offline recovery pass.
RETURN_TO: Orchestration-Agent.

- [ ] Provide EAS project linkage and build environment if using EAS (pending external setup).
- [ ] Build clean Android APK with real Firebase configuration (blocked by missing Firebase JSON).
- [ ] Complete the two-device matrix and record actual results (pending physical devices).

Confidence: 0.98 in the local missing/mismatched configuration evidence. Live resources are unverified. These unchecked external steps are release gates, not completed implementation fixes.
