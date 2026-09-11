# Checklist: Receipt Retry Classification

Source documents required:

- [ ] Read `Project_details/database_defined_push_notification_prd.md`, especially sections 8.49, 8.50, 8.51, 8.52, 15, and 21.
- [ ] Read `Project_details/push_notification_plantuml_diagrams.md`, especially recipient processing and confirmation.
- [ ] Before handoff, verify the implementation still matches `Project_details/`.

Finding: receipt retry currently queues every failure and does not distinguish duplicate, retryable, or permanent failures.

Tasks:

- [ ] Add normalized receipt submit response handling.
- [ ] Treat `RECEIPT_DUPLICATE` as success and remove the queued receipt.
- [ ] Remove malformed or unauthorized receipts from the queue as terminal failures.
- [ ] Retain network and function-unavailable failures as retryable.
- [ ] Add retry metadata: firstAttemptAt, lastAttemptAt, attemptCount.
- [ ] Cap the queue and use namespaced AsyncStorage keys.
- [ ] Retry queued receipts on app foreground.
- [ ] Retry queued receipts after sign-in.
- [ ] Add connectivity-triggered retry if a network listener is introduced.

Acceptance criteria:

- [ ] Offline receipt confirmation is retried later.
- [ ] Duplicate receipt responses do not remain queued.
- [ ] Malformed receipts do not retry indefinitely.

## Work Explanation

This work makes receipt retry durable and bounded. It adds classification so offline/transient failures are retried, duplicates are treated as success, and permanently invalid receipts are discarded with a terminal reason.

## Logic Behind It

The PRD requires receipt confirmation to survive background and offline states, but not every failure should be retried forever. Classification protects storage, avoids repeated invalid requests, and keeps device receipt counts accurate.
