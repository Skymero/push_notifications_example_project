# Junior Developer Checklist: Option-2 Support Function Client Contract

**Source finding:** Critical: Option-2 support function env var is missing and the client still uses four function IDs  
**Source review:** `Project_details/notification_env_deploy_readiness_review.md`  
**Owner:** Frontend/Appwrite integration  
**Confidence:** 0.97  

## Goal

Update the mobile app so it calls exactly two Appwrite notification functions: `notification-fanout` and `notification-support`.

# Why These Changes Are Needed

The Appwrite Free-tier option-2 architecture only deploys two notification functions: `notification-fanout` and `notification-support`. `notification-fanout` stays separate because sending to many devices is the highest-risk operation. `notification-support` groups the smaller support actions behind one function ID.

The current client still knows about three separate support function IDs: send validation, receive validation, and receipt. That means the app is still shaped for the old four-function deployment even if the backend team creates `notification-support`. The client and backend must share the same contract, or the app will call function IDs that are not deployed.

This change teaches an important integration pattern: consolidation on the backend requires a matching request envelope on the client. Instead of choosing a different function ID for each operation, the client calls one support function and passes `{ action, payload }` so the backend router can choose the correct handler.

## Files

- `.env`
- `.env.example`
- `lib/config.ts`
- `lib/appwrite/notifications.ts`

## Checklist

- [ ] Add this to local `.env`:

```text
EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID=notification-support
```

- [ ] Keep this in local `.env`:

```text
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
```

- [ ] Remove or stop using these legacy client function IDs:

```text
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID
```

- [ ] Update `.env.example` to document the two-function model.
- [ ] Update `lib/config.ts` so `appConfig.appwrite.functions` exposes only:

```ts
fanout: string;
support: string;
```

- [ ] Update `invokeSendValidation()` to call `functionIds.support`.
- [ ] Send this request body for send validation:

```ts
{ action: 'sendValidation', payload: {} }
```

- [ ] Update `invokeReceiveValidation(deviceId, idempotencyKey)` to call `functionIds.support`.
- [ ] Send this request body for receive validation:

```ts
{ action: 'receiveValidation', payload: { deviceId, idempotencyKey } }
```

- [ ] Update `submitNotificationReceipt(request)` to call `functionIds.support`.
- [ ] Send this request body for receipt:

```ts
{ action: 'receipt', payload: request }
```

- [ ] Leave `invokeNotificationFanout()` pointed at `functionIds.fanout`.
- [ ] Search for old function references:

```text
rg "sendValidation|receiveValidation|functionIds\\.receipt|APPWRITE_SEND_VALIDATION|APPWRITE_RECEIVE_VALIDATION|APPWRITE_RECEIPT" lib .env.example
```

- [ ] Run:

```text
npm run typecheck
npx jest --runInBand
```

## Acceptance Criteria

- [ ] Client code uses `EXPO_PUBLIC_APPWRITE_SUPPORT_FUNCTION_ID`.
- [ ] Client code uses `EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID`.
- [ ] Client support calls use the `{ action, payload }` envelope.
- [ ] No client source depends on the old three support function IDs.

## Key Caveat

This checklist depends on `functions/notification-support` existing and supporting the same action names.
