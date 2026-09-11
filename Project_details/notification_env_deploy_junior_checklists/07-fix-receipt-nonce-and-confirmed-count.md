# Junior Developer Checklist: Fix Receipt Nonce And `confirmedCount`

**Source finding:** High: Receipt validation still permits missing nonce and can double-count confirmations  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Backend/Appwrite Functions  
**Confidence:** 0.93  

## Goal

Require receipt nonce validation and prevent duplicate confirmation counts.

# Why These Changes Are Needed

Receipt handling is the backend's trusted proof that a recipient device actually saw a notification event. The receipt nonce is a small server-generated value that ties the receipt request back to the notification payload. If the backend accepts a missing nonce when a nonce exists on the recipient record, the receipt proof is weaker than the data model intends.

`confirmedCount` has a different purpose: it should count confirmed recipients, not receipt events. A device may report `received` and later `opened`. Those are two useful events, but they are still one recipient. Incrementing for every new receipt idempotency key can make aggregate counts higher than the number of target devices.

This change is needed to keep two invariants true: receipts must belong to the real recipient notification, and job confirmation totals must represent recipient confirmation rather than event volume.

## Files

- `functions/notification-support/src/handlers/receipt.ts`
- Temporary reference if still present: `functions/notification-receipt/src/main.ts`

## Checklist

- [ ] Open the consolidated receipt handler.
- [ ] Find the current receipt nonce comparison.
- [ ] Replace optional-both-present logic with:

```ts
if (recipient.receiptNonce && recipient.receiptNonce !== request.receiptNonce) {
  return fail(context, 403, 'RECEIPT_UNAUTHORIZED', 'Receipt validation nonce did not match.');
}
```

- [ ] Confirm a request without `receiptNonce` is rejected when the recipient has `receiptNonce`.
- [ ] Before updating the recipient, store its previous `receiptStatus`.
- [ ] Treat these statuses as already confirmed:

```text
received
opened
```

- [ ] Create receipt audit records for unique receipt idempotency keys.
- [ ] Keep duplicate receipt idempotency keys as success.
- [ ] Increment `notification_jobs.confirmedCount` only when previous status was `not_confirmed`.
- [ ] Do not increment when previous status was `received` or `opened`.
- [ ] Add tests for:
  - [ ] matching nonce accepted
  - [ ] wrong nonce rejected
  - [ ] missing nonce rejected when stored nonce exists
  - [ ] missing nonce accepted only for legacy recipient with no stored nonce
  - [ ] duplicate idempotency key returns success
  - [ ] `received` then `opened` increments only once
- [ ] Run:

```text
npm run functions:check
npx jest --runInBand
```

## Acceptance Criteria

- [ ] Stored nonce cannot be bypassed by omitting `receiptNonce`.
- [ ] `confirmedCount` counts confirmed recipients, not receipt events.
- [ ] Duplicate receipts remain duplicate-as-success.

## Key Caveat

Apply this in `notification-support`; the old standalone `notification-receipt` should stop being deployed after option 2 is complete.
