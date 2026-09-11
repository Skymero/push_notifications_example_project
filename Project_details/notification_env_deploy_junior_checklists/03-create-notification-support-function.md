# Junior Developer Checklist: Create `functions/notification-support`

**Source finding:** Critical: `functions/notification-support` is missing  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Backend/Appwrite Functions  
**Confidence:** 0.98  

## Goal

Create the consolidated `notification-support` Appwrite Function as real deployable source.

# Why These Changes Are Needed

Appwrite deploys functions from real source folders, not from planning documents or patch files. The repository currently has a patch that describes `notification-support`, but there is no `functions/notification-support` folder for Appwrite to build.

The missing middle here is the difference between a design artifact and a deployable artifact. A design artifact can explain the intended code. A deployable artifact needs actual files: `package.json`, `tsconfig.json`, source entry point, handlers, and deployment notes. Appwrite's build system needs those files at the configured function root.

This change is needed because the target two-function architecture cannot exist until `notification-support` is materialized as source. Without it, `npm run functions:check` cannot validate it and Appwrite Console cannot deploy it.

## Files

- `Project_details/notification_support_function_implementation.patch`
- `functions/notification-support/package.json`
- `functions/notification-support/tsconfig.json`
- `functions/notification-support/README.md`
- `functions/notification-support/src/main.ts`
- `functions/notification-support/src/types.ts`
- `functions/notification-support/src/handlers/sendValidation.ts`
- `functions/notification-support/src/handlers/receiveValidation.ts`
- `functions/notification-support/src/handlers/receipt.ts`

## Checklist

- [ ] Create:

```text
functions/notification-support
functions/notification-support/src
functions/notification-support/src/handlers
```

- [ ] Port the implementation from:

```text
Project_details/notification_support_function_implementation.patch
```

- [ ] Confirm `package.json` has:

```json
{
  "name": "notification-support"
}
```

- [ ] Confirm `package.json` has a `check` script that runs TypeScript.
- [ ] Confirm `tsconfig.json` includes:

```text
src/**/*.ts
../_shared/**/*.ts
```

- [ ] Confirm `src/main.ts` routes only:

```text
sendValidation
receiveValidation
receipt
```

- [ ] Confirm unknown actions return:

```text
400 INVALID_SUPPORT_ACTION
```

- [ ] Confirm support handlers use shared Appwrite/Firebase helpers from `functions/_shared`.
- [ ] Run from repo root:

```text
npm install
npm run functions:check
```

- [ ] Confirm function check output includes:

```text
notification-support@1.0.0 check
```

## Acceptance Criteria

- [ ] `functions/notification-support` exists as a real folder.
- [ ] Appwrite Console can use `functions/notification-support` as root directory.
- [ ] `notification-support` type-checks with the function workspaces.

## Key Caveat

Previous tool attempts could not write under `functions`, so a developer with full workspace permissions may need to do this manually.
