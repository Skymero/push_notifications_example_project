# Junior Developer Checklist: Document Function Environment Variables

**Source finding:** Medium: Function READMEs do not list the required Appwrite/Firebase environment variables  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Documentation/backend deployment  
**Confidence:** 0.94  

## Goal

Make Appwrite Function setup clear enough that a junior developer can deploy without reading source files.

# Why These Changes Are Needed

Function deployment should not require a developer to reverse-engineer environment variables from TypeScript source. If the README does not list required variables, a deployer can miss one and only discover the problem through Appwrite runtime logs.

Firebase private keys are especially error-prone because newline formatting matters. The code handles escaped `\n`, but the deployer still needs to know that the private key belongs in Appwrite Console and must not be committed or placed in the mobile app.

This change is needed because deployment documentation is part of deploy readiness. Clear READMEs reduce setup mistakes, protect secrets, and make the function contract repeatable for the next developer.

## Files

- `functions/notification-fanout/README.md`
- `functions/notification-support/README.md`

## Checklist

- [ ] Open `functions/notification-fanout/README.md`.
- [ ] Add a section named:

```text
Required environment variables
```

- [ ] List these Appwrite variables:

```text
APPWRITE_ENDPOINT
APPWRITE_PROJECT_ID
APPWRITE_API_KEY
APPWRITE_DATABASE_ID
APPWRITE_USERS_COLLECTION_ID
APPWRITE_DEVICE_TOKENS_COLLECTION_ID
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID
```

- [ ] List these Firebase Admin variables:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

- [ ] For `notification-fanout`, also list:

```text
NOTIFICATION_INCLUDE_SENDER
NOTIFICATION_FANOUT_LIMIT
NOTIFICATION_JOB_STALE_SECONDS
```

- [ ] Open `functions/notification-support/README.md`.
- [ ] Add the same Appwrite and Firebase Admin variable sections.
- [ ] Document that `FIREBASE_PRIVATE_KEY` can use escaped `\n` newlines.
- [ ] State that backend secrets must be configured in Appwrite Console only.
- [ ] Do not include real secret values.
- [ ] Confirm Appwrite Console settings are documented:

```text
Runtime
Root directory
Build command
Entry point
Execute access
```

- [ ] Run a markdown review for spelling and accuracy.

## Acceptance Criteria

- [ ] Both function READMEs list every required environment variable.
- [ ] Firebase private-key newline handling is documented.
- [ ] No real secrets are present in README files.
- [ ] Appwrite Console deployment settings are clear.

## Key Caveat

Documentation must match the final implemented env config. If `NOTIFICATION_FANOUT_LIMIT` or `NOTIFICATION_JOB_STALE_SECONDS` are not implemented, document them as planned instead of required.
