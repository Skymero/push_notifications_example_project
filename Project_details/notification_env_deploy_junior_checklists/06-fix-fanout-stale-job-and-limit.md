# Junior Developer Checklist: Fix Fanout Stale-Job And Limit Risks

**Source finding:** High: `notification-fanout` still has stale-job and fanout-limit deployment risks  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Backend/Appwrite Functions  
**Confidence:** 0.91  

## Goal

Prevent permanently stuck fanout jobs and make the Free-tier fanout cap explicit.

# Why These Changes Are Needed

Fanout is idempotent: the same user and idempotency key should not create duplicate notification jobs. That is correct, but the current logic returns any existing job immediately, including a job stuck in `processing`. If the function crashes or times out after creating the job, every retry can return the same unfinished job forever.

The missing middle is that idempotency needs a recovery rule. It is not enough to prevent duplicates; the code also needs to decide what to do with unfinished work. A stale timeout gives the function a clear rule for when a `processing` job is too old to trust.

The hardcoded `Query.limit(100)` is a separate deployment risk. A limit may be fine for Appwrite Free tier, but it should be explicit and documented. This change is needed so the function behaves predictably under failure and so developers understand exactly how many devices a fanout can target.

## Files

- `functions/_shared/env.ts`
- `functions/notification-fanout/src/main.ts`
- `functions/notification-fanout/README.md`

## Checklist

- [ ] Add `fanoutLimit` to `FunctionConfig`.
- [ ] Read it from:

```text
NOTIFICATION_FANOUT_LIMIT
```

- [ ] Default the limit to `100` if the env var is missing.
- [ ] Validate that the limit is a positive integer.
- [ ] Replace hardcoded `Query.limit(100)` with the configured limit.
- [ ] Add `jobStaleSeconds` to `FunctionConfig`.
- [ ] Read it from:

```text
NOTIFICATION_JOB_STALE_SECONDS
```

- [ ] Default stale seconds to `300`.
- [ ] When an existing fanout job is found, check its `status`.
- [ ] If status is `completed`, `partially_completed`, or `failed`, return it.
- [ ] If status is `processing` and recent, return it.
- [ ] If status is `processing` and stale, mark it `failed` with a sanitized failure reason.
- [ ] Do not try to resume stale jobs unless progress metadata is added first.
- [ ] Update `functions/notification-fanout/README.md` with the limit and stale-job behavior.
- [ ] Add tests or manual verification notes for:
  - [ ] existing terminal job
  - [ ] fresh processing job
  - [ ] stale processing job
  - [ ] configured fanout limit
- [ ] Run:

```text
npm run functions:check
```

## Acceptance Criteria

- [ ] A stale `processing` job cannot remain stuck forever for the same idempotency key.
- [ ] Fanout target count uses a documented/configurable limit.
- [ ] README explains Free-tier limit behavior.

## Key Caveat

Marking stale jobs failed is simpler and safer than resuming unless the function stores detailed progress.
