# Checklist: Add Realtime Job Monitoring

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 8.17, 8.28, 8.34, 9.5, 9.6, 18, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially fanout and sender status UI.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: job monitoring fetches once and does not subscribe to job or recipient changes.

Tasks:

- [ ] Add Appwrite Realtime client support.
- [ ] Implement `subscribeToNotificationJob(jobId)`.
- [ ] Implement `subscribeToNotificationRecipients(jobId)`.
- [ ] Update `useNotificationJob` to subscribe after fanout returns `jobId`.
- [ ] Clean up subscriptions on unmount, sign-out, and when a new job starts.
- [ ] Keep recipient queries scoped to the current job only.
- [ ] Add pagination or incremental loading for recipient records.
- [ ] Render aggregate counts from the job document.

Acceptance criteria:

- [ ] Recipient cards update as provider dispatch status changes.
- [ ] Recipient cards update as Android devices submit receipts.
- [ ] The UI does not subscribe to all users or all recipient records.

## Work Explanation

This work makes the sender UI observe job and recipient status changes after fanout starts. It replaces one-time polling with scoped Appwrite Realtime subscriptions and cleanup logic.

## Logic Behind It

The PRD requires recipient cards to show dispatch and receipt progression separately. Fanout and receipt events happen after the initial button press, so the Android app needs live updates for the active job without subscribing to unrelated database records.
