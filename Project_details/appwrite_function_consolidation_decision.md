# Appwrite Function Consolidation Decision

## Short Answer

Yes, consolidate the four Appwrite Functions into one deployed Appwrite Function.

Do not move receipt handling, receive validation, or real send/fanout validation fully into the mobile app. The mobile app can run local preflight checks, but it cannot replace server-side checks that need Firebase Admin credentials, Appwrite API-key privileges, trusted status updates, or anti-spoofing verification.

As of September 7, 2026, Appwrite's pricing page lists the Free plan as allowing **2 Functions per project**, so the current four-function layout does not fit the free tier. Source: https://appwrite.io/pricing

## Problem Orientation

Given:

- This repo currently has four function folders:
  - `notification-fanout`
  - `notification-receipt`
  - `notification-receive-validation`
  - `notification-send-validation`
- The app calls each through separate function IDs in `.env.example`.
- Appwrite's free tier limits the number of deployed functions.

What must be decided:

- Whether the architecture needs four deployed Appwrite Functions.
- Whether those responsibilities can be merged into one deployed function.
- Whether some responsibilities can be pushed into normal app utility functions.

The hard part is not code organization. The hard part is the trust boundary. Some logic is only expensive or inconvenient on the backend, but other logic is security-critical and must run in a trusted server environment.

## Dependency Map

Core concept: trust boundary.

- Client-side utility logic:
  - Good for permission checks, local token presence, local idempotency-key generation, UI readiness colors, retry queue decisions, and payload parsing.
  - Bad for secrets, cross-user writes, recipient status authority, and Firebase Admin sends.

- Appwrite Function logic:
  - Needed when code uses the Appwrite API key, Firebase Admin credentials, privileged database writes, recipient selection, receipt verification, and server-authoritative status updates.

- Function count versus responsibility count:
  - One deployed function can contain multiple internal handlers.
  - Four responsibilities do not require four deployed functions.

## Recommended Shape

Use one deployed function, for example:

```text
notification-api
```

Route by an explicit action in the request body:

```json
{
  "action": "fanout",
  "payload": {}
}
```

Supported actions:

```text
sendValidation
receiveValidation
fanout
receipt
```

Inside that one function, keep separate internal modules:

```text
functions/notification-api/src/main.ts
functions/notification-api/src/handlers/fanout.ts
functions/notification-api/src/handlers/receipt.ts
functions/notification-api/src/handlers/receiveValidation.ts
functions/notification-api/src/handlers/sendValidation.ts
```

That gives you one Appwrite deployment slot while preserving the same conceptual boundaries.

## What Can Move Into The App

These can safely be normal app utilities:

- Check whether the user is authenticated locally.
- Check whether notification permission is granted.
- Check whether a local FCM token exists.
- Check whether the local device ID exists.
- Generate idempotency keys.
- Parse notification payloads.
- Queue receipt retries locally.
- Decide whether the UI should show yellow before server confirmation.

These checks are useful, but they are not authoritative.

## What Should Stay Server-Side

### Fanout

Must stay server-side.

Reason:

- The client must not hold Firebase Admin credentials.
- The client must not read every recipient's FCM token.
- Recipient selection must be database-defined and server-controlled.
- Notification content should be server-controlled or server-validated.

### Receipt

Should stay server-side.

Reason:

- The receipt handler verifies that the authenticated user actually owns the recipient record.
- It checks the `receiptNonce`.
- It verifies the device token belongs to that user and device.
- It updates `notification_recipients`, `notification_receipts`, `device_tokens`, and `notification_jobs`.

If this becomes a pure app utility, a client can claim receipt for records it should not control unless the database permissions and validation model are redesigned very carefully. Even then, the confirmed count and device verification state are better treated as server-authoritative.

### Receive Validation

Must stay server-side if it actually sends a validation push.

Reason:

- Sending the test notification uses Firebase Admin.
- Firebase Admin credentials cannot ship in the mobile app.
- The server needs to create a validation job and recipient record, then wait for the receipt path to confirm actual device processing.

The app can check local readiness, but it cannot prove that FCM accepted a server push or that the device processed it.

### Send Validation

This one is the easiest to simplify.

The current implementation only checks that the user is authenticated and can reach the function. That can be merged into the consolidated function as `sendValidation`, or replaced by a lightweight `ping` / `dryRun` action.

Do not spend a whole free-tier function slot on this.

## Can We Use Only Fanout?

Only if you are willing to weaken the product behavior.

With only fanout:

- You can create jobs.
- You can send pushes through Firebase Admin.
- You can record whether FCM accepted or rejected each send.

But you lose:

- Reliable "device actually received it" confirmation.
- The green receive-readiness signal described in the PRD.
- Idempotent receipt submission.
- Receipt retry reconciliation.
- Server-authoritative `lastReceivedAt`.
- A clean way to distinguish "FCM accepted the message" from "the device processed the payload."

That may be acceptable for a tiny demo where "sent to FCM" is enough. It is not equivalent to the current design.

## Best Free-Tier Compromise

The best free-tier version is:

```text
One deployed Appwrite Function:
notification-api

Internal actions:
- sendValidation
- receiveValidation
- fanout
- receipt
```

Then update the app config so all four public function IDs point to the same Appwrite Function ID, or better, replace the four IDs with one:

```text
EXPO_PUBLIC_APPWRITE_NOTIFICATION_API_FUNCTION_ID=notification-api
```

And update the client wrapper from:

```ts
executeJson(functionIds.fanout, request)
```

to:

```ts
executeJson(functionIds.notificationApi, {
  action: 'fanout',
  payload: request,
})
```

Same pattern for:

```text
sendValidation
receiveValidation
receipt
```

## The Key Mental Model

Ask this every time:

```text
Does this code only inspect local app state, or does it assert trusted backend truth?
```

If it only inspects local app state, it can be an app utility.

If it sends through Firebase Admin, reads other users' device tokens, validates receipt ownership, writes delivery status, or updates aggregate counts, it belongs in Appwrite Function code.

## Final Recommendation

Consolidate the four deployed functions into one Appwrite Function with internal routed handlers.

Do not drop receipt or receive validation unless this is intentionally becoming a weaker demo that tracks only provider acceptance. Keep those responsibilities server-side, but package them as utility modules inside the single deployed function, not as separate Appwrite deployments and not as mobile-app-only utilities.
