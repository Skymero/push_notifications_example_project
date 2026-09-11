# Code Review Junior Developer Checklists

These checklists convert the code review findings into implementation tasks.

Mandatory source gate for every checklist:

- Read `Project_details/database_defined_push_notification_prd.md`.
- Read `Project_details/push_notification_plantuml_diagrams.md`.
- Confirm the task still follows the Project_details plan before starting work.
- Confirm the task still follows the Project_details plan before handoff.

Project decisions from the owner:

- This repo is expected to include Appwrite Function source.
- The fanout algorithm will be implemented in an Appwrite Function.
- Appwrite token upsert remains direct client database access with strict document permissions.
- Web support is not required.
- Android is the only required mobile platform for this readiness pass.

## Files

- `01-backend-functions-missing.md`
- `02-android-install-readiness.md`
- `03-user-document-registration.md`
- `04-receive-readiness-confirmed-receipts.md`
- `05-realtime-job-monitoring.md`
- `06-token-lifecycle.md`
- `07-receipt-retry-classification.md`
- `08-permission-request-flow.md`
- `09-auth-policy.md`
- `10-test-coverage.md`
- `11-firebase-fcm-console-setup.md`
- `backend-database-spec-sheet.md`
- `appwrite-functions-fanout-checklist.md`

## Work Explanation

This folder turns the code review findings into executable work packages. Each file isolates one readiness gap so a junior developer can take a bounded task, understand what must be changed, and verify the result against the project source documents.

## Logic Behind It

The PRD defines an end-to-end notification system, but the current repo is split across client code, future Appwrite Functions, Firebase setup, database configuration, and physical Android validation. Separate checklists keep those responsibilities from being mixed together while preserving the core rule from `Project_details/`: the client may register its own token and request work, but backend fanout and receipt authority must live in trusted Appwrite Function/database paths.
