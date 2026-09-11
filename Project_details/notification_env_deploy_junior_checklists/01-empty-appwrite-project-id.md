# Junior Developer Checklist: Empty Appwrite Project ID

**Source finding:** Critical: `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is present but empty in local `.env`  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Frontend/config  
**Confidence:** 0.98  

## Goal

Set the public Appwrite project ID so the mobile app can initialize Appwrite correctly.

# Why These Changes Are Needed

The Appwrite Project ID is the public identifier that tells the mobile client which Appwrite project it should talk to. The app can have a valid endpoint and database ID, but if `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is empty, the Appwrite SDK does not have enough information to target the correct backend project.

The important distinction is that this value is not a secret. It is safe for the mobile app because it only identifies the Appwrite project. The dangerous value is `APPWRITE_API_KEY`, which belongs only in Appwrite Function environment variables. A junior developer should learn to separate public client configuration from privileged server configuration before deployment.

This change is needed because the app's config helper treats a blank project ID as incomplete configuration. Without this fix, deployment can appear successful while runtime Appwrite calls fail or point nowhere useful.

## Files

- `.env`
- `.env.example`
- `lib/config.ts`

## Checklist

- [ ] Open Appwrite Console.
- [ ] Select the correct Appwrite project.
- [ ] Copy the Project ID from project settings.
- [ ] Open local `.env`.
- [ ] Set:

```text
EXPO_PUBLIC_APPWRITE_PROJECT_ID=<appwrite_project_id>
```

- [ ] Confirm the value is not blank.
- [ ] Confirm the value is the public Appwrite Project ID, not `APPWRITE_API_KEY`.
- [ ] Open `.env.example`.
- [ ] Confirm `.env.example` includes:

```text
EXPO_PUBLIC_APPWRITE_PROJECT_ID=
```

- [ ] Do not add Appwrite API keys to `.env` for the mobile app.
- [ ] Run:

```text
npm run typecheck
```

## Acceptance Criteria

- [ ] `EXPO_PUBLIC_APPWRITE_PROJECT_ID` is present and non-empty in local `.env`.
- [ ] `hasAppwriteConfig()` can evaluate true when endpoint, project ID, and database ID are all set.
- [ ] No backend Appwrite API key is present in client env files.

## Key Caveat

`.env` is ignored by git, so this fix may need to be repeated in each developer or deployment environment.
