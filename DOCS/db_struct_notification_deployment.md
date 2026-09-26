# Notification database and permission changes for the reviewed deployment

Updated 2026-09-11. This is the deployment delta to the [existing full field specification](../Code%20Review%20Jr%20Checklists/backend-database-spec-sheet.md), coordinated with [the code review](Astra/Code-Reviews/Sep_1126_notification_deployment_review.md). Keep its existing collection IDs and camelCase attribute names. This document supersedes its old four-function inventory, client-write permissions, and raw nonce semantics. These are required Appwrite Console changes; writing this file does not apply them to your project.

## Database and transaction prerequisite

Use the configured database with `users`, `device_tokens`, `notification_jobs`, `notification_recipients`, and `notification_receipts`. The implementation uses the Appwrite Databases collection/document API and `node-appwrite@20.2.1`, including transaction methods. A compatible Appwrite server with Databases transactions is required. Test an actual transaction commit in the deployed support function; a Node import or SDK mock cannot prove server compatibility. [Appwrite transactions](https://appwrite.io/docs/products/databases/documentsdb/transactions) commit staged related writes together and report conflicts for retry.

No new collection is introduced. Add one nullable field and its index before activating the new functions:

| Collection | Attribute/index | Definition | Purpose |
| --- | --- | --- | --- |
| `notification_jobs` | `rateLimitKey` | string/varchar, size 64, optional, null default | SHA-256 digest of authenticated user, action/device, and cooldown time slot |
| `notification_jobs` | `rate_limit_key_unique` | unique index on `rateLimitKey` | Atomically reject simultaneous distinct sends in the same slot |

Add or verify the composite query indexes used by the reviewed source:

| Collection/index | Ordered attributes | Used by |
| --- | --- | --- |
| `device_tokens.active_send_targets` | `platform`, `isActive`, `permissionStatus`, `tokenStatus` | fanout target selection |
| `notification_jobs.client_fanout_lookup` | `requestedByUserId`, `notificationType`, `idempotencyKey` | asynchronous mobile fanout job discovery |
| `notification_jobs.requester_idempotency_unique` | `requestedByUserId`, `idempotencyKey` (unique) | replay and conflict resolution |

Wait until the attribute and index are `available`. Existing jobs can retain null. Retain `jobId` uniqueness and the existing requester/idempotency uniqueness. Fanout stores the original request idempotency key so the authenticated client can locate its asynchronous job; validation scopes/hashes its stored key by operation/device. Deterministic document IDs handle replay. Rate-limit defaults are 10 seconds for fanout and 30 seconds for receive validation. They are fixed time windows, so two requests can straddle a boundary; they are not a strict sliding cooldown.

The existing `notification_recipients.receiptNonce` field remains size 128 (at least 64 required), but now stores only a SHA-256 digest bound to the target FCM token. The raw random nonce travels in FCM and the receipt request, never in readable database records or readiness responses. Outstanding old notifications with plaintext nonces must be treated as expired and resent after rollout; do not weaken receipt checks for compatibility. No extra nonce field is needed.

## Permissions are enforced on whole documents

Enable document security for all five collections and remove collection-level client create/update/delete grants. Server API keys perform trusted writes. A permission label such as “owner may update profile fields only” is not an Appwrite field-level restriction: an update grant permits changes to the whole document. [Appwrite permissions](https://appwrite.io/docs/advanced/platform/permissions)

| Collection | Client document access | Writer |
| --- | --- | --- |
| `users` | owner read only | `notification-support.ensureProfile`, registration/deactivation |
| `device_tokens` | owner read only | authenticated support registration/deactivation, dispatch/receipt handlers |
| `notification_jobs` | requesting user read only | fanout and support |
| `notification_recipients` | requesting user and recipient read only | fanout and support |
| `notification_receipts` | recipient read only, or no client read if unused | support receipt transaction |

Do not grant collection-wide client read on token records. Ownership comes from the Appwrite authenticated execution header; a supplied `userId` is not trusted. Profiles are derived from the authenticated Appwrite Account. Device registration accepts client observations such as permission and token, but the client cannot assert `receiveStatus`, `tokenStatus`, timestamps, or ownership.

For existing installations, removing collection permissions is insufficient: explicitly revoke old document-level update/delete grants on **every** existing user and device-token record. Verify ownership before retaining old rows because the previous clients could edit their embedded user IDs. Back up existing data and migrate verified rows with server credentials, or use a new isolated demo database and re-register test accounts/devices. Do not delete production records as a shortcut. Newly created server rows use deterministic IDs; old conflicting user/device unique-index rows must be reconciled before registration. The new code cannot make arbitrary legacy grants safe merely by being uploaded.

Retain the unique index on `users.userId`. Replace the old `username_unique` index with a nonunique username index: authenticated Account display names need not be globally unique. Keep device `userId + deviceId` uniqueness and active Android filters; jobs' IDs and requester/idempotency; recipient `jobId`, `recipientUserId`, and receipt-state filters; and receipt `receiptId`, `jobId`, `recipientRecordId`, `recipientUserId`. Appwrite document `$id` supplies deterministic primary-key uniqueness. Ensure field enums include the values written by the source: device permission `granted`, `denied`, `not_requested`, `unknown`; token `untested`, `valid`, `invalid`, `rotated`, `revoked`; receive `untested`, `verified`, `failed`, `expired`; dispatch `pending`, `accepted`, `rejected`, `error`; recipient receipt `not_confirmed`, `received`, `opened`, `expired`.

## Runtime credentials and verification

Both function runtime keys need document read/write and trusted Account reads (`documents.read`, `documents.write`, `users.read`). The readiness probe also reads collection metadata (`collections.read`) to verify required schema/permissions. Use the scope labels for the Databases API in your Appwrite Console; transactions must be allowed by the document-write scope. Provisioning attributes/indexes and changing collection permissions require separate administrative capabilities, which are not required for normal dispatch.

After deployment, verify an unauthenticated call is rejected; an authenticated client cannot create/update device or profile documents directly; an account cannot read another account's token; registration derives the authenticated owner; send validation reports a controlled configuration error for a missing index; and two concurrent receipts for distinct recipients commit a final count of two. Verify one recipient's repeated or reordered events count once, and submitting the stored nonce digest fails. These checks remain remote release gates until exercised in the actual project.
