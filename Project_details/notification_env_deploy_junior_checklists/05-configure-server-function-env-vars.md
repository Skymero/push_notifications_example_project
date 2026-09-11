# Junior Developer Checklist: Configure Server Function Environment Variables

**Source finding:** High: Server-side Appwrite/Firebase function env vars are required by source but not verifiable locally  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Appwrite/Firebase console setup  
**Confidence:** 0.93  

## Goal

Configure backend-only environment variables in Appwrite Functions so the functions can use Appwrite Admin APIs and Firebase Admin SDK.

# Why These Changes Are Needed

The Appwrite Functions run trusted backend code. They need privileged Appwrite access to read and update notification records, and they need Firebase Admin credentials to send FCM messages. Those values are powerful, so they must be configured in Appwrite Console as function environment variables, not placed in the mobile app.

The key concept is trust boundary. Public Expo variables are bundled into the client and can be inspected. Server function variables stay on the backend and are available only to the Appwrite runtime. `APPWRITE_API_KEY` and `FIREBASE_PRIVATE_KEY` cross the trust boundary if they are added to client `.env`, so they must never go there.

This change is needed because the source calls `loadConfig()` at runtime. If any required server variable is missing, the function fails before it can send notifications or update trusted receipt state.

## Files

- `functions/_shared/env.ts`
- `functions/notification-fanout/README.md`
- `functions/notification-support/README.md`

## Appwrite Variables

Add these to both `notification-fanout` and `notification-support` in Appwrite Console:

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

## Firebase Variables

Add these to both functions:

```text
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

## Fanout Variable

Add this to `notification-fanout`:

```text
NOTIFICATION_INCLUDE_SENDER
```

## Checklist

- [ ] Open Appwrite Console.
- [ ] Open `notification-fanout`.
- [ ] Add every Appwrite variable listed above.
- [ ] Add every Firebase variable listed above.
- [ ] Add `NOTIFICATION_INCLUDE_SENDER`.
- [ ] Open `notification-support`.
- [ ] Add every Appwrite variable listed above.
- [ ] Add every Firebase variable listed above.
- [ ] Open Firebase Console.
- [ ] Go to Project settings.
- [ ] Copy Project ID to `FIREBASE_PROJECT_ID`.
- [ ] Open Service accounts.
- [ ] Use Firebase Admin SDK service-account JSON.
- [ ] Copy `client_email` to `FIREBASE_CLIENT_EMAIL`.
- [ ] Copy `private_key` to `FIREBASE_PRIVATE_KEY`.
- [ ] Preserve newlines or use escaped `\n`; the code converts escaped newlines.
- [ ] Do not add these values to mobile `.env`.
- [ ] Do not commit service-account JSON.
- [ ] Execute a test run for each deployed function in Appwrite Console.

## Acceptance Criteria

- [ ] Both functions load config without missing-variable errors.
- [ ] Firebase Admin initializes successfully.
- [ ] No backend secret is present in source control.

## Key Caveat

This cannot be fully verified from the repo. Final confirmation must happen in Appwrite Console execution logs.
