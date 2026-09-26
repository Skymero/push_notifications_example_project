# Appwrite Backend Configuration

Source documents:

> Historical field reference: the [2026-09-11 database/permission delta](../DOCS/db_struct_notification_deployment.md) and [two-function deployment guide](../DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md) supersede this sheet's four-function inventory, client-write grants, username uniqueness, and raw nonce semantics. Apply those changes before using the reviewed app.

* `Project_details/example-template-backend-sheet.md`
* `Project_details/database_defined_push_notification_prd.md`
* `Project_details/push_notification_plantuml_diagrams.md`
* `Code Review Jr Checklists/01-backend-functions-missing.md`
* `Code Review Jr Checklists/03-user-document-registration.md`
* `Code Review Jr Checklists/04-receive-readiness-confirmed-receipts.md`
* `Code Review Jr Checklists/06-token-lifecycle.md`
* `Code Review Jr Checklists/12-post-review-runtime-hardening.md`

Compatibility note:

* Table IDs use lowercase snake_case.
* Attribute IDs intentionally use the camelCase names from the PRD and current app/function code.
* Do not rename attributes to snake_case unless the React Native app and Appwrite Functions are updated in the same change.

---

## Project

name: Push Notification Example
description: Android-only React Native Expo app for Appwrite-authenticated FCM registration, receive validation, backend fanout, and receipt confirmation.

platform_scope: android
backend: Appwrite Databases, Appwrite Functions, Appwrite Account
push_provider: Firebase Cloud Messaging
package name: com.pushnotificationexample.app
Appwrite project Id: 6a921fef001e644048b0
appwrite endpoint: https://nyc.cloud.appwrite.io/v1

---

# Databases

## Database: push_notifications

id: push_notifications
name: Push Notifications

purpose: Durable notification state for users, Android device tokens, fanout jobs, recipient dispatch records, and receipt audit history.

---

### Table: users

id: users
name: Users

purpose: Application-level user profile linked to an Appwrite Account user ID.

permissions:

* read: owner_user
* create: authenticated_users
* update: owner_user_limited_profile_fields
* delete: server_functions_only

security_notes:

* Users may read only their own document.
* Users may update display/profile and active-device reference fields only if the Appwrite permission model and client code enforce that boundary.
* Backend functions may read user documents when creating sanitized recipient records.

---

#### Columns

* name: userId
  id: userId
  type: varchar
  size: 64
  required: true
  default: null
  description: Appwrite Account user ID.
  writer: client_on_registration_or_sign_in
  reader: owner_user_and_server_functions

* name: username
  id: username
  type: varchar
  size: 100
  required: true
  default: null
  description: Normalized app username.
  writer: client_on_registration_or_sign_in
  reader: owner_user_and_sanitized_recipient_views

* name: notificationEnabled
  id: notificationEnabled
  type: boolean
  required: true
  default: false
  description: Whether the user has completed notification setup for at least one current Android device.
  writer: client_after_device_token_sync_or_server_function
  reader: owner_user_and_server_functions

* name: activeDeviceId
  id: activeDeviceId
  type: varchar
  size: 128
  required: false
  default: null
  description: Stable installation ID for the current primary Android device.
  writer: client_after_device_token_sync
  reader: owner_user_and_server_functions

* name: activeDeviceTokenId
  id: activeDeviceTokenId
  type: varchar
  size: 64
  required: false
  default: null
  description: Appwrite document ID for the current active device token.
  writer: client_after_device_token_sync
  reader: owner_user_and_server_functions

* name: createdAt
  id: createdAt
  type: datetime
  required: true
  default: null
  description: User document creation timestamp in ISO 8601 format.
  writer: client_on_registration_or_sign_in
  reader: owner_user_and_server_functions

* name: updatedAt
  id: updatedAt
  type: datetime
  required: true
  default: null
  description: Last user document update timestamp in ISO 8601 format.
  writer: client_on_profile_or_device_reference_update
  reader: owner_user_and_server_functions

---

#### Indexes

* name: user_id_unique
  id: user_id_unique
  type: unique
  columns:

  * userId

* name: username_unique
  id: username_unique
  type: unique
  columns:

  * username

* name: active_device_token_id_index
  id: active_device_token_id_index
  type: key
  columns:

  * activeDeviceTokenId

---

#### Relationships

# No Appwrite relationship attribute is required. `activeDeviceTokenId` is an indexed scalar reference to `device_tokens.$id`.

---

### Table: device_tokens

id: device_tokens
name: Device Tokens

purpose: One Android installation token per authenticated user/device pair, including permission and lifecycle state.

permissions:

* read: owner_user
* create: authenticated_users
* update: owner_user_registration_fields_and_server_functions_lifecycle_fields
* delete: server_functions_only

security_notes:

* Raw `fcmToken` values must never be readable by other users.
* The client may directly upsert its own token registration fields only.
* Backend-controlled fields include `tokenStatus`, `receiveStatus`, `lastValidatedAt`, `lastReceivedAt`, and authoritative invalid/revoked changes.
* Appwrite document permissions alone cannot enforce field-level rules; the client implementation must not expose UI or helper paths that set backend-controlled fields.

---

#### Columns

* name: deviceTokenId
  id: deviceTokenId
  type: varchar
  size: 64
  required: true
  default: null
  description: Appwrite document ID for this device-token record. Should mirror `$id`.
  writer: client_on_create
  reader: owner_user_and_server_functions

* name: userId
  id: userId
  type: varchar
  size: 64
  required: true
  default: null
  description: Appwrite Account user ID that owns this token.
  writer: client_on_create
  reader: owner_user_and_server_functions

* name: deviceId
  id: deviceId
  type: varchar
  size: 128
  required: true
  default: null
  description: Stable app-generated Android installation ID.
  writer: client_on_create
  reader: owner_user_and_server_functions

* name: fcmToken
  id: fcmToken
  type: varchar
  size: 4096
  required: true
  default: null
  description: Current Firebase Cloud Messaging registration token for this Android installation.
  writer: client_on_permission_granted_or_token_refresh
  reader: owner_user_and_server_functions_only

* name: platform
  id: platform
  type: enum
  required: true
  values:

  * android
  default: android
  description: Supported platform for this pass.
  writer: client_on_create
  reader: owner_user_and_server_functions

* name: appVersion
  id: appVersion
  type: varchar
  size: 32
  required: true
  default: null
  description: Installed app version reported by Expo config.
  writer: client_on_sync
  reader: owner_user_and_server_functions

* name: buildNumber
  id: buildNumber
  type: varchar
  size: 64
  required: false
  default: null
  description: Android OS/build identifier available to the app.
  writer: client_on_sync
  reader: owner_user_and_server_functions

* name: permissionStatus
  id: permissionStatus
  type: enum
  required: true
  values:

  * granted
  * denied
  * not_requested
  * unknown
  default: unknown
  description: Current Android notification permission state as normalized by the app.
  writer: client_after_permission_check_or_prompt
  reader: owner_user_and_server_functions

* name: tokenStatus
  id: tokenStatus
  type: enum
  required: true
  values:

  * untested
  * valid
  * invalid
  * rotated
  * revoked
  default: untested
  description: Backend-controlled FCM token validity state.
  writer: server_functions_only
  reader: owner_user_and_server_functions

* name: receiveStatus
  id: receiveStatus
  type: enum
  required: true
  values:

  * untested
  * verified
  * failed
  * expired
  default: untested
  description: Backend-controlled receive validation state. Green readiness requires `verified`.
  writer: server_functions_only
  reader: owner_user_and_server_functions

* name: lastValidatedAt
  id: lastValidatedAt
  type: datetime
  required: false
  default: null
  description: Last time `notification-receive-validation` attempted provider validation.
  writer: server_functions_only
  reader: owner_user_and_server_functions

* name: lastReceivedAt
  id: lastReceivedAt
  type: datetime
  required: false
  default: null
  description: Last time this Android installation submitted an accepted receipt.
  writer: notification_receipt_function
  reader: owner_user_and_server_functions

* name: lastTokenRefreshAt
  id: lastTokenRefreshAt
  type: datetime
  required: false
  default: null
  description: Last time the app observed an FCM token refresh.
  writer: client_on_token_refresh
  reader: owner_user_and_server_functions

* name: isActive
  id: isActive
  type: boolean
  required: true
  default: true
  description: Whether this token is eligible for backend fanout after validation.
  writer: client_on_sign_out_for_own_record_and_server_functions_for_lifecycle
  reader: owner_user_and_server_functions

* name: createdAt
  id: createdAt
  type: datetime
  required: true
  default: null
  description: Device-token record creation timestamp in ISO 8601 format.
  writer: client_on_create
  reader: owner_user_and_server_functions

* name: updatedAt
  id: updatedAt
  type: datetime
  required: true
  default: null
  description: Device-token record update timestamp in ISO 8601 format.
  writer: client_or_server_on_update
  reader: owner_user_and_server_functions

---

#### Indexes

* name: user_id_device_id_unique
  id: user_id_device_id_unique
  type: unique
  columns:

  * userId
  * deviceId

* name: active_android_verified_tokens_index
  id: active_android_verified_tokens_index
  type: key
  columns:

  * platform
  * isActive
  * tokenStatus
  * receiveStatus

* name: user_id_index
  id: user_id_index
  type: key
  columns:

  * userId

* name: device_id_index
  id: device_id_index
  type: key
  columns:

  * deviceId

---

#### Relationships

# `userId` is an indexed scalar reference to `users.userId`. Keep this scalar model unless the Appwrite project intentionally adopts relationship attributes.

---

### Table: notification_jobs

id: notification_jobs
name: Notification Jobs

purpose: One backend-authoritative fanout or receive-validation job.

permissions:

* read: requesting_user
* create: server_functions_only
* update: server_functions_only
* delete: server_functions_only

security_notes:

* The mobile app invokes a function; it must not create or update job documents directly.
* Job content is server-defined. The client may request only an approved notification type and idempotency key.
* `confirmedCount` counts unique recipient records that have confirmed receipt, not total receipt events.

---

#### Columns

* name: jobId
  id: jobId
  type: varchar
  size: 64
  required: true
  default: null
  description: Public job identifier, ideally matching the Appwrite document `$id`.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: idempotencyKey
  id: idempotencyKey
  type: varchar
  size: 160
  required: true
  default: null
  description: Client-provided idempotency key scoped to requester and notification action.
  writer: server_functions_only
  reader: server_functions_only_or_requesting_user_if_needed_for_debug

* name: requestedByUserId
  id: requestedByUserId
  type: varchar
  size: 64
  required: true
  default: null
  description: Appwrite Account user ID that requested the job.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: notificationType
  id: notificationType
  type: enum
  required: true
  values:

  * system_test
  * receive_validation
  default: system_test
  description: Server-approved notification workflow.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: title
  id: title
  type: varchar
  size: 160
  required: true
  default: null
  description: Server-defined display title.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: body
  id: body
  type: varchar
  size: 512
  required: true
  default: null
  description: Server-defined display body.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: status
  id: status
  type: enum
  required: true
  values:

  * queued
  * processing
  * completed
  * partially_completed
  * failed
  default: queued
  description: Backend job processing status.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: targetCount
  id: targetCount
  type: integer
  required: true
  min: 0
  default: 0
  description: Number of eligible Android device-token records selected for this job.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: providerAcceptedCount
  id: providerAcceptedCount
  type: integer
  required: true
  min: 0
  default: 0
  description: Number of recipient sends accepted by FCM.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: providerRejectedCount
  id: providerRejectedCount
  type: integer
  required: true
  min: 0
  default: 0
  description: Number of recipient sends rejected by FCM.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: confirmedCount
  id: confirmedCount
  type: integer
  required: true
  min: 0
  default: 0
  description: Number of unique recipient records that submitted a valid receipt.
  writer: notification_receipt_function
  reader: requesting_user_and_server_functions

* name: createdAt
  id: createdAt
  type: datetime
  required: true
  default: null
  description: Job creation timestamp in ISO 8601 format.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

* name: completedAt
  id: completedAt
  type: datetime
  required: false
  default: null
  description: Job completion timestamp in ISO 8601 format.
  writer: server_functions_only
  reader: requesting_user_and_server_functions

---

#### Indexes

* name: job_id_unique
  id: job_id_unique
  type: unique
  columns:

  * jobId

* name: requester_idempotency_unique
  id: requester_idempotency_unique
  type: unique
  columns:

  * requestedByUserId
  * idempotencyKey

* name: requested_by_user_id_index
  id: requested_by_user_id_index
  type: key
  columns:

  * requestedByUserId

* name: status_created_at_index
  id: status_created_at_index
  type: key
  columns:

  * status
  * createdAt

---

#### Relationships

# No Appwrite relationship attribute is required. `requestedByUserId` is an indexed scalar reference to `users.userId`.

---

### Table: notification_recipients

id: notification_recipients
name: Notification Recipients

purpose: One recipient dispatch record per notification job and target Android device token.

permissions:

* read: job_requester_or_recipient_user
* create: server_functions_only
* update: server_functions_only
* delete: server_functions_only

security_notes:

* This table must never store raw FCM token values.
* Sender-visible data must be sanitized.
* Provider acceptance and device receipt are separate statuses.
* Recipient records are the source of truth for per-target delivery cards.

---

#### Columns

* name: recipientRecordId
  id: recipientRecordId
  type: varchar
  size: 64
  required: true
  default: null
  description: Public recipient record identifier, ideally matching `$id`.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: jobId
  id: jobId
  type: varchar
  size: 64
  required: true
  default: null
  description: Parent notification job ID.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: recipientUserId
  id: recipientUserId
  type: varchar
  size: 64
  required: true
  default: null
  description: Appwrite Account user ID for the target recipient.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: deviceTokenId
  id: deviceTokenId
  type: varchar
  size: 64
  required: true
  default: null
  description: Target `device_tokens.$id` used by the backend for this recipient.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: username
  id: username
  type: varchar
  size: 100
  required: false
  default: null
  description: Sanitized recipient display name for sender-side cards.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: platform
  id: platform
  type: enum
  required: true
  values:

  * android
  default: android
  description: Target platform for this recipient record.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: providerMessageId
  id: providerMessageId
  type: varchar
  size: 256
  required: false
  default: null
  description: FCM provider message ID when the provider accepts the send.
  writer: notification_fanout_or_receive_validation_function
  reader: job_requester_recipient_and_server_functions

* name: dispatchStatus
  id: dispatchStatus
  type: enum
  required: true
  values:

  * pending
  * accepted
  * rejected
  * error
  default: pending
  description: Provider-level dispatch status.
  writer: notification_fanout_or_receive_validation_function
  reader: job_requester_recipient_and_server_functions

* name: receiptStatus
  id: receiptStatus
  type: enum
  required: true
  values:

  * not_confirmed
  * received
  * opened
  * expired
  default: not_confirmed
  description: Device receipt status. This is separate from provider acceptance.
  writer: notification_receipt_function_or_timeout_worker
  reader: job_requester_recipient_and_server_functions

* name: failureCode
  id: failureCode
  type: varchar
  size: 128
  required: false
  default: null
  description: Normalized FCM or backend error code.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: failureMessage
  id: failureMessage
  type: varchar
  size: 512
  required: false
  default: null
  description: Sanitized diagnostic message safe for app display or support.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: receiptNonce
  id: receiptNonce
  type: varchar
  size: 128
  required: false
  default: null
  description: Optional server-created nonce included in the FCM payload and receipt request.
  writer: server_functions_only
  reader: server_functions_only_preferred

* name: dispatchedAt
  id: dispatchedAt
  type: datetime
  required: false
  default: null
  description: Timestamp when the backend submitted this recipient message to FCM.
  writer: server_functions_only
  reader: job_requester_recipient_and_server_functions

* name: receivedAt
  id: receivedAt
  type: datetime
  required: false
  default: null
  description: Timestamp when the Android app submitted a valid `received` receipt.
  writer: notification_receipt_function
  reader: job_requester_recipient_and_server_functions

* name: openedAt
  id: openedAt
  type: datetime
  required: false
  default: null
  description: Timestamp when the Android app submitted a valid `opened` receipt.
  writer: notification_receipt_function
  reader: job_requester_recipient_and_server_functions

---

#### Indexes

* name: recipient_record_id_unique
  id: recipient_record_id_unique
  type: unique
  columns:

  * recipientRecordId

* name: job_id_index
  id: job_id_index
  type: key
  columns:

  * jobId

* name: recipient_user_id_index
  id: recipient_user_id_index
  type: key
  columns:

  * recipientUserId

* name: job_recipient_user_index
  id: job_recipient_user_index
  type: key
  columns:

  * jobId
  * recipientUserId

* name: job_dispatch_receipt_index
  id: job_dispatch_receipt_index
  type: key
  columns:

  * jobId
  * dispatchStatus
  * receiptStatus

---

#### Relationships

# `jobId`, `recipientUserId`, and `deviceTokenId` are indexed scalar references. Do not store FCM tokens here.

---

### Table: notification_receipts

id: notification_receipts
name: Notification Receipts

purpose: Append-only receipt audit trail for received, displayed, and opened events.

permissions:

* read: server_functions_only
* create: server_functions_only
* update: server_functions_only
* delete: server_functions_only

security_notes:

* The mobile app submits receipts through `notification-receipt`; it does not write this table directly.
* `receiptId` is the idempotency key.
* Duplicate receipt submissions should return duplicate-as-success without creating a second receipt document.

---

#### Columns

* name: receiptId
  id: receiptId
  type: varchar
  size: 192
  required: true
  default: null
  description: Unique receipt idempotency key, usually `jobId:recipientRecordId:eventType`.
  writer: notification_receipt_function
  reader: server_functions_only

* name: jobId
  id: jobId
  type: varchar
  size: 64
  required: true
  default: null
  description: Parent notification job ID.
  writer: notification_receipt_function
  reader: server_functions_only

* name: recipientRecordId
  id: recipientRecordId
  type: varchar
  size: 64
  required: true
  default: null
  description: Recipient record confirmed by this receipt.
  writer: notification_receipt_function
  reader: server_functions_only

* name: recipientUserId
  id: recipientUserId
  type: varchar
  size: 64
  required: true
  default: null
  description: Authenticated Appwrite Account user ID that submitted the receipt.
  writer: notification_receipt_function
  reader: server_functions_only

* name: deviceId
  id: deviceId
  type: varchar
  size: 128
  required: true
  default: null
  description: Stable Android installation ID that submitted the receipt.
  writer: notification_receipt_function
  reader: server_functions_only

* name: eventType
  id: eventType
  type: enum
  required: true
  values:

  * received
  * displayed
  * opened
  default: received
  description: Receipt event type from the Android app.
  writer: notification_receipt_function
  reader: server_functions_only

* name: clientTimestamp
  id: clientTimestamp
  type: datetime
  required: true
  default: null
  description: Device-reported event timestamp.
  writer: notification_receipt_function
  reader: server_functions_only

* name: serverTimestamp
  id: serverTimestamp
  type: datetime
  required: true
  default: null
  description: Server receipt timestamp assigned by the Appwrite Function.
  writer: notification_receipt_function
  reader: server_functions_only

---

#### Indexes

* name: receipt_id_unique
  id: receipt_id_unique
  type: unique
  columns:

  * receiptId

* name: job_id_index
  id: job_id_index
  type: key
  columns:

  * jobId

* name: recipient_record_id_index
  id: recipient_record_id_index
  type: key
  columns:

  * recipientRecordId

* name: recipient_user_id_index
  id: recipient_user_id_index
  type: key
  columns:

  * recipientUserId

* name: job_event_type_index
  id: job_event_type_index
  type: key
  columns:

  * jobId
  * eventType

---

#### Relationships

# No Appwrite relationship attribute is required. `jobId`, `recipientRecordId`, and `recipientUserId` are indexed scalar references.

---

# Storage Buckets

# No storage buckets are required for this application.

---

# Appwrite Functions

## Function: notification-send-validation

id: notification-send-validation
name: Notification Send Validation
runtime: node
source_directory: functions/notification-send-validation
purpose: Verify that the authenticated user can reach the backend send path.

permissions:

* execute: authenticated_users

request_body:

```json
{}
```

success_response:

```json
{
  "color": "green",
  "code": "SEND_READY",
  "message": "Authenticated Android user can reach the Appwrite send function."
}
```

failure_codes:

* AUTH_REQUIRED
* FUNCTION_UNAVAILABLE

environment_required:

* APPWRITE_ENDPOINT
* APPWRITE_PROJECT_ID
* APPWRITE_API_KEY

---

## Function: notification-receive-validation

id: notification-receive-validation
name: Notification Receive Validation
runtime: node
source_directory: functions/notification-receive-validation
purpose: Send one validation notification to the authenticated user's current Android token.

permissions:

* execute: authenticated_users

request_body:

```json
{
  "deviceId": "stable-android-installation-id",
  "idempotencyKey": "user:device:receive-validation:timestamp-or-uuid"
}
```

success_response_provider_accepted:

```json
{
  "color": "yellow",
  "code": "RECEIPT_PENDING",
  "message": "Validation notification was accepted by FCM; waiting for device receipt.",
  "jobId": "notification-job-id",
  "recipientRecordId": "recipient-record-id"
}
```

failure_codes:

* AUTH_REQUIRED
* INVALID_RECEIVE_VALIDATION_REQUEST
* DEVICE_RECORD_INACTIVE
* FCM_TOKEN_INVALID
* FUNCTION_UNAVAILABLE

database_writes:

* update `device_tokens.lastValidatedAt`
* create `notification_jobs` with `notificationType = receive_validation`
* create `notification_recipients` with `dispatchStatus = accepted` when FCM accepts
* update token to `tokenStatus = invalid` and `receiveStatus = failed` when FCM rejects

---

## Function: notification-fanout

id: notification-fanout
name: Notification Fanout
runtime: node
source_directory: functions/notification-fanout
purpose: Query database-defined eligible Android tokens and send server-defined FCM notifications.

permissions:

* execute: authenticated_users

request_body:

```json
{
  "notificationType": "system_test",
  "idempotencyKey": "fanout-request-id"
}
```

success_response:

```json
{
  "jobId": "notification-job-id",
  "status": "queued-or-processing-or-completed"
}
```

eligible_token_rules:

* platform must be `android`
* `isActive` must be true
* `tokenStatus` must be `valid`
* `receiveStatus` must be `verified`
* optionally include or exclude the sender based on `NOTIFICATION_INCLUDE_SENDER`

failure_codes:

* AUTH_REQUIRED
* INVALID_FANOUT_REQUEST
* FANOUT_ALREADY_RUNNING
* FANOUT_PARTIAL_FAILURE
* FUNCTION_UNAVAILABLE

database_writes:

* create or reuse `notification_jobs` by requester and idempotency key
* create one `notification_recipients` record per eligible Android target
* update `dispatchStatus`, `providerMessageId`, `failureCode`, and `failureMessage`
* update job aggregate counts
* mark permanently rejected tokens invalid or inactive

---

## Function: notification-receipt

id: notification-receipt
name: Notification Receipt
runtime: node
source_directory: functions/notification-receipt
purpose: Accept authenticated Android receipt events and update recipient/job/device-token state.

permissions:

* execute: authenticated_users

request_body:

```json
{
  "jobId": "notification-job-id",
  "recipientRecordId": "recipient-record-id",
  "deviceId": "stable-android-installation-id",
  "eventType": "received",
  "clientTimestamp": "2026-08-28T12:00:00.000Z",
  "idempotencyKey": "job:recipient:event",
  "receiptNonce": "optional-server-nonce"
}
```

success_response:

```json
{
  "ok": true
}
```

duplicate_success_response:

```json
{
  "ok": true,
  "duplicate": true
}
```

failure_codes:

* AUTH_REQUIRED
* RECEIPT_MALFORMED
* RECEIPT_UNAUTHORIZED
* RECEIPT_EXPIRED
* FUNCTION_UNAVAILABLE

database_writes:

* create append-only `notification_receipts` document if the receipt is new
* update matching `notification_recipients.receiptStatus`
* update `notification_recipients.receivedAt` or `openedAt`
* update `device_tokens.receiveStatus = verified`
* update `device_tokens.tokenStatus = valid`
* increment `notification_jobs.confirmedCount` only once per confirmed recipient

---

# Function Environment Variables

The Markdown backend sheet must not contain real credentials. Store secrets only in Appwrite Function variables.

```text
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_appwrite_project_id
APPWRITE_API_KEY=your_server_api_key
APPWRITE_DATABASE_ID=push_notifications
APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_service_account_email
FIREBASE_PRIVATE_KEY=your_firebase_service_account_private_key
NOTIFICATION_VALIDATION_TIMEOUT_SECONDS=60
NOTIFICATION_RECEIPT_TIMEOUT_SECONDS=300
NOTIFICATION_MAX_RETRIES=3
NOTIFICATION_INCLUDE_SENDER=true
```

---

# Client Environment Variables

These values are public Appwrite identifiers used by the Expo app. They are not server secrets.

```text
EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
EXPO_PUBLIC_APPWRITE_PROJECT_ID=your_appwrite_project_id
EXPO_PUBLIC_APPWRITE_DATABASE_ID=push_notifications
EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID=users
EXPO_PUBLIC_APPWRITE_DEVICE_TOKENS_COLLECTION_ID=device_tokens
EXPO_PUBLIC_APPWRITE_NOTIFICATION_JOBS_COLLECTION_ID=notification_jobs
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECIPIENTS_COLLECTION_ID=notification_recipients
EXPO_PUBLIC_APPWRITE_NOTIFICATION_RECEIPTS_COLLECTION_ID=notification_receipts
EXPO_PUBLIC_APPWRITE_SEND_VALIDATION_FUNCTION_ID=notification-send-validation
EXPO_PUBLIC_APPWRITE_RECEIVE_VALIDATION_FUNCTION_ID=notification-receive-validation
EXPO_PUBLIC_APPWRITE_FANOUT_FUNCTION_ID=notification-fanout
EXPO_PUBLIC_APPWRITE_RECEIPT_FUNCTION_ID=notification-receipt
```

---

# Firebase Configuration

Android app:

* package_name: `com.pushnotificationexample.app`
* required_file: `google-services.json`
* source_control: ignored by `.gitignore`
* setup_reference: `Code Review Jr Checklists/11-firebase-fcm-console-setup.md`

Server credentials:

* Use a Firebase service account for Appwrite Functions.
* Store service account values in Appwrite Function variables.
* Never add Firebase Admin credentials to `.env`, `.env.example`, `app.json`, or mobile source files.

---

# Permission Model Summary

## Client Allowed Writes

The mobile client may write:

* its own `users` document during registration/sign-in
* its own `users.activeDeviceId`
* its own `users.activeDeviceTokenId`
* its own `device_tokens` registration fields
* direct token deactivation on sign-out for its own token record, if kept as the chosen account-switching policy

## Server-Only Writes

Appwrite Functions must write:

* `notification_jobs`
* `notification_recipients`
* `notification_receipts`
* provider result fields
* authoritative token validity fields
* authoritative receive validation fields
* job aggregate counts

## Never Expose To Other Users

* `device_tokens.fcmToken`
* Firebase service account private key
* Appwrite server API key
* unsanitized provider error payloads

---

# Configuration Rules

## Supported Column Types

This backend sheet uses:

* varchar
* integer
* boolean
* datetime
* enum

Relationship fields are documented under each table's Relationships section instead of as Appwrite relationship attributes.

---

## Naming Rules

Database, table, and index IDs should use:

```text
lowercase_snake_case
```

Attribute IDs must match the app and function code:

```text
camelCase
```

Reason: the current React Native and Appwrite Function code reads and writes camelCase document fields such as `userId`, `deviceId`, `receiveStatus`, and `recipientRecordId`.

---

## Enum Rules

Do not add enum values casually. Every enum value must be handled by:

* the React Native UI
* the Appwrite Functions
* receipt retry classification where applicable
* test fixtures

---

## Index Rules

Create indexes before testing the app on device. Required lookup paths:

* user by `userId`
* user by `username`
* device token by `userId + deviceId`
* fanout tokens by `platform + isActive + tokenStatus + receiveStatus`
* job by `requestedByUserId + idempotencyKey`
* recipients by `jobId`
* recipients by `recipientUserId`
* receipts by `receiptId`

---

## Appwrite Console Setup Order

1. Create the Appwrite project.
2. Create database `push_notifications`.
3. Create all tables and attributes from this sheet.
4. Create indexes after attributes finish processing.
5. Configure collection-level permissions.
6. Configure document-level permissions in client/function create calls.
7. Create the server API key for functions.
8. Create Firebase project and Android app.
9. Add Firebase service account values to Appwrite Function variables.
10. Create and deploy the four Appwrite Functions.
11. Add public Appwrite IDs to the Expo `.env` file.
12. Add `google-services.json` for Android builds.
13. Build and test on a physical Android device.

---

# Intended Workflow

```text
Developer updates backend-database-spec-sheet.md
        |
Create or update Appwrite database/tables/indexes
        |
Create Firebase Android app and service account
        |
Configure Appwrite Function variables
        |
Deploy Appwrite Functions from this repo
        |
Run React Native Android development build
        |
Validate PRD section 21 acceptance criteria
```

---

# Work Explanation

This backend sheet is the Appwrite setup source of truth for the Android push notification application. It follows the Markdown hierarchy from `Project_details/example-template-backend-sheet.md` while adding the application-specific database tables, attributes, indexes, permission boundaries, functions, environment variables, and setup order required by `Project_details/database_defined_push_notification_prd.md`.

# Logic Behind It

The project depends on a strict boundary: the Android client registers only its own token and submits receipts, while Appwrite Functions perform all cross-device fanout and authoritative receipt/token lifecycle updates. The database shape separates user identity, token lifecycle, fanout jobs, recipient delivery state, and receipt audit history so the app can show accurate send/receive readiness without exposing Firebase Admin credentials or other users' FCM tokens.
