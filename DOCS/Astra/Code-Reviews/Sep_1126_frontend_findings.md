# Mobile notification review findings

Date: 2026-09-11. These findings record original source locations before fixes. Source authority is [the Option 2 PRD](../../../Project_details/notification_option2_functions_prd.md), [original product requirements](../../../Project_details/database_defined_push_notification_prd.md), and [backend specification](../../../Project_details/notification_option2_backend_spec_sheet.md). The orchestration [sequence diagram](Sep_1126_notification_deployment_review.md) covers this flow. Analysis confidence: 0.94 for reproduced local code defects; native delivery remains unverified without Firebase and physical devices.

Applied the actual frontend-agent skill (AGENTS.md swaps its role links), the local analysis/security rules, and the requested junior-dev-checklist workflow. No alternative workflow or geometry harness is present. No styling redesign is required.

## F1 [P1] Public Appwrite values disappear from the native bundle

Original evidence: `lib/config.ts:1-25`. required(name) reads process.env[name], which Expo does not inline. Even correct environment values cannot configure a release bundle.

Remediation: Use literal process.env.EXPO_PUBLIC_* property reads, preserve public fallback IDs, and verify Expo transforms inline sample values. The same configuration review identified missing `client.setPlatform` in `lib/appwrite/client.ts`; initialize it from the configured Android package so Appwrite receives the correct native Origin. [Checklist](../../TaskList/Sep_1126_frontend_env_inlining.md).

Status: implemented locally; TypeScript, client regressions, and Android export pass. Live Appwrite/device verification remains pending.

## F2 [P1] Function failures are parsed as successful typed responses

Original evidence: `lib/appwrite/notifications.ts:23-30`. createExecution status and responseStatusCode are ignored. A 403 receipt is returned as an apparent success shape; a failed fanout can create an optimistic undefined job.

Remediation: Use explicitly synchronous execution, validate completion and HTTP success, parse an object, preserve safe backend error codes in a typed Error, and validate action response shapes. [Checklist](../../TaskList/Sep_1126_frontend_execution_errors.md).

Status: implemented locally; failed execution and async fanout discovery regressions pass.

## F3 [P1] Device lifecycle can retain revoked readiness and misreport permission

Original evidence: `lib/appwrite/notifications.ts:48-60; lib/push-notifications/firebaseMessaging.ts:87-101`. Same-token login restores isActive while retaining revoked tokenStatus; Android requestNotificationPermission discards the Expo prompt result in favor of Firebase requestPermission. Device readiness is also writable directly from the client.

Remediation: Consume authenticated support registerDevice/deactivateDevice actions agreed with backend. Let backend own token/readiness writes and derive user identity. On Android use Expo permission result as authoritative. [Checklist](../../TaskList/Sep_1126_frontend_device_registration.md).

Status: implemented locally; registration is routed through authenticated support and Android permission truth is preserved. Device verification remains pending.

## F4 [P1] Concurrent or switched-account receipts can be lost or never retried

Original evidence: `lib/push-notifications/retryQueue.ts:24-44; lib/push-notifications/backgroundHandler.ts:77-99; app/_layout.tsx:12-15`. Independent queue read/write operations overwrite each other. Receipts lack owner identity, and retry runs only at root mount before a newly signed-in account is available.

Remediation: Serialize local queue mutations, persist ownerUserId with each receipt, replay only for the authenticated owner, save before submission, and retry after login/resume plus a bounded foreground interval. [Checklist](../../TaskList/Sep_1126_frontend_receipt_queue.md).

Status: implemented locally; serialized owner-scoped queue regression passes. Background/resume behavior remains a device acceptance item.

## F5 [P1] Foreground delivery produces no visible notification; startup and tap promises can reject unhandled

Original evidence: `lib/push-notifications/backgroundHandler.ts:25-41,104-124; app/_layout.tsx:10`. Foreground RNFirebase onMessage only submits a receipt. It never asks the OS to display the notification. Background registration starts in a router layout rather than the application entrypoint and catches initialization errors as permanently registered.

Remediation: Coordinate early entrypoint registration with orchestration, present valid foreground notifications locally with Expo, process local response taps, and consume async listener failures while keeping durable receipts. [Checklist](../../TaskList/Sep_1126_frontend_notification_handlers.md).

Status: implemented locally; entrypoint registration and foreground local presentation are included in the successful Android export. Device display/open behavior remains pending.

## F6 [P1] Readiness and sign-out can retain stale authenticated state

Original evidence: `hooks/useNotificationReadiness.ts:34-61,159,202-234; lib/appwrite/auth.ts:58-64; app/index.tsx:71-78`. A validation poll continues across logout or another validation. It can later paint the new account green. App-state refresh overlaps existing work. signOut suppresses session deletion failure so UI can show signed out while the backend session remains active.

Remediation: Bind async work to a session/run generation, serialize readiness refresh, cancel polling/listeners on cleanup, retry receipts on session activation, and surface sign-out failure without clearing the account. [Checklist](../../TaskList/Sep_1126_frontend_readiness_sessions.md).

Status: implemented locally; readiness/job work is generation-bound, sign-out errors remain visible, and post-session bootstrap failure rolls the session back.

## F7 [P2] Recipient list truncates and previous account job remains in memory

Original evidence: `lib/appwrite/notifications.ts:154-160; hooks/useNotificationJob.ts:12-69; app/index.tsx:41`. Only first 100 recipient records are loaded. A job and its Realtime subscriptions survive logout because the hook has no account input. A brief connection gap after the first read has no later reconciliation.

Remediation: Page recipient reads using cursor ordering, reset/cancel job work per authenticated user, serialize send calls, subscribe before reconciliation and poll the selected job while the app is active. [Checklist](../../TaskList/Sep_1126_frontend_job_monitor.md).

Status: implemented locally; recipient pagination, account reset/cancellation, Realtime reconciliation, and active polling are present. Live Realtime remains pending.

## Supporting platform references

[Expo environment variables](https://docs.expo.dev/guides/environment-variables/) requires statically named public variable accesses for bundling. [React Native Firebase messaging usage](https://rnfirebase.io/messaging/usage) distinguishes foreground handling from automatic background notification display and requires early background-handler registration. Installed SDK source was also inspected for Appwrite execution metadata and Android permission behavior.
