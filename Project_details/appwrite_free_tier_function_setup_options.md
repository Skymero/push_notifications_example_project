# Appwrite Free Tier Function Setup Options

## Short Answer

Recommended choice: **option 2**.

Use:

```text
Function 1: notification-fanout
Function 2: notification-support
  - send validation
  - receive validation
  - notification receipt
```

This fits Appwrite's Free plan because the current pricing page lists **2 Functions per project**, **750K executions per month**, **100 execution logs**, **15-minute builds**, and **5GB API bandwidth per month** for Free. Appwrite's compute docs also state that Free uses the default runtime spec of **512MB memory / 0.5 CPU** and includes **100 GB-hours of execution and build time per month**.

Sources checked September 7, 2026:

- https://appwrite.io/pricing
- https://appwrite.io/docs/advanced/billing/compute
- https://appwrite.io/docs/products/functions/functions

## Problem Orientation

Given:

- This repo currently has four Appwrite Functions:
  - `notification-fanout`
  - `notification-receipt`
  - `notification-receive-validation`
  - `notification-send-validation`
- Appwrite Free only allows 2 deployed Functions per project.
- The project needs Firebase Admin credentials and privileged Appwrite writes for the trusted backend parts.

What must be decided:

- Whether four responsibilities require four deployed Appwrite Functions.
- Which responsibilities can share one deployed function safely.
- Whether any of these responsibilities can move into the mobile app.

The hard part is the **trust boundary**, not folder organization. A single deployed Appwrite Function can contain multiple internal handlers, but the mobile app cannot safely replace backend code that sends through Firebase Admin, reads recipient device tokens, verifies receipt ownership, or updates trusted delivery state.

## Minimal Dependency Map

Core idea: **deployed function count is not the same thing as responsibility count**.

- Appwrite Free tier constraint:
  - You get 2 deployed Functions per project.
  - Therefore, the current 4-function deployment does not fit Free.

- Server-side-only responsibilities:
  - Need secrets, Firebase Admin, Appwrite API-key permissions, cross-user recipient selection, or trusted status writes.

- App-side responsibilities:
  - Good for local preflight checks, UI readiness, local retry metadata, payload parsing, and idempotency-key generation.
  - Not good for authoritative validation or delivery-state writes.

## Option Comparison

| Option | Free-tier fit | Security fit | Recommendation |
|---|---:|---:|---|
| Option 1: consolidate all four into one Appwrite Function | Yes | Yes, if internally routed correctly | Viable, but all logs/errors/deployments are mixed |
| Option 2: fanout alone, other three in a second Appwrite Function | Yes | Yes | **Best balance** |
| Option 3: fanout alone, other three inside the app | Partly | No for receipt and receive validation | Use only for local preflight, not authoritative behavior |

## Why Option 2 Is Best Here

Option 2 uses exactly the two function slots allowed by Appwrite Free:

```text
notification-fanout
notification-support
```

Keep `notification-fanout` separate because it is the highest-risk and most central backend operation:

- It selects eligible device tokens.
- It sends through Firebase Admin.
- It creates notification jobs and recipient records.
- It records provider accepted/rejected results.

Put these in `notification-support`:

```text
sendValidation
receiveValidation
receipt
```

That second function should route by an explicit `action` field:

```json
{
  "action": "receipt",
  "payload": {}
}
```

Internally, keep the code separated:

```text
functions/notification-support/src/main.ts
functions/notification-support/src/handlers/sendValidation.ts
functions/notification-support/src/handlers/receiveValidation.ts
functions/notification-support/src/handlers/receipt.ts
```

This preserves conceptual boundaries while only consuming one deployed Appwrite Function slot for the support operations.

## Why Not Option 3

Option 3 is only safe if "within the app" means **local preflight checks**.

These can move into the app:

- Check whether the user is signed in locally.
- Check whether Android notification permission is granted.
- Check whether a local FCM token exists.
- Check whether a local device ID exists.
- Generate idempotency keys.
- Parse notification payloads.
- Queue receipt retries locally.
- Show a yellow pending state before server confirmation.

These should not move fully into the app:

- `notification-receipt`
- `notification-receive-validation`
- real `notification-fanout`

Reason: the app is not trusted. A client can be modified, replay requests, lie about receipt state, or claim another recipient record unless the server verifies ownership, nonce, and device-token state.

## Responsibility-by-Responsibility Decision

### Fanout

Keep server-side.

It uses Firebase Admin and selects recipient tokens. The mobile app must not contain Firebase Admin credentials or gain access to other users' FCM tokens.

### Notification Receipt

Keep server-side, but it can be inside `notification-support`.

The current receipt function verifies:

- authenticated user
- `jobId`
- `recipientRecordId`
- `deviceId`
- `receiptNonce`
- active device token ownership

It then writes trusted receipt state and updates recipient/job/device-token status. That is backend-authoritative state, so it should not be app-only.

### Receive Validation

Keep server-side, but it can be inside `notification-support`.

Receive validation sends a real validation push through Firebase Admin and waits for the receipt path to prove the device processed the payload. The app can check local readiness, but it cannot prove server-to-FCM-to-device delivery by itself.

### Send Validation

This is the safest one to simplify.

The current implementation mostly checks that an authenticated user can reach the send function. It can become:

```text
notification-support action: sendValidation
```

or even:

```text
notification-support action: ping
```

Do not spend a full Free-tier function slot on send validation alone.

## Free-Tier Cost Mental Model

For Appwrite Free, your bottlenecks are:

- **Function count:** hard architectural constraint because Free allows 2 functions per project.
- **Executions:** shared monthly quota, currently 750K/month on the pricing page.
- **GB-hours:** runtime plus build compute pool, currently 100 GB-hours/month on the compute docs.
- **Build time:** Free builds must finish within 15 minutes.
- **Logs:** only 100 execution logs on Free, so separate functions can help debugging, but you only get two.

Consolidating functions helps with the function-count limit. It does **not** magically reduce executions if the same number of requests still happen.

Example:

```text
One fanout request + ten recipient receipts = eleven function executions
```

That remains roughly true whether receipts live in a separate function or in a routed `notification-support` function.

## Final Recommendation

Use **option 2**:

```text
notification-fanout
notification-support
```

Where `notification-support` contains:

```text
sendValidation
receiveValidation
receipt
```

Use option 1 only if you want the simplest possible deployment and want to leave one Free-tier function slot unused for future work.

Do not use option 3 as stated. Only move local readiness checks into the app. Keep receipt validation and receive validation server-side because they protect trusted notification state.

## Quick Retrieval Check

To make the decision reusable, remember this rule:

```text
If it only checks local device/app state, it can live in the app.
If it uses secrets, validates ownership, reads other users' tokens, or writes trusted delivery state, it belongs in an Appwrite Function.
```

