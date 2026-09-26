# Active notification backend review

Reviewed 2026-09-11 before repairs. Scope: `notification-fanout`, `notification-support`, shared helpers, and their mobile contracts. The original locations below describe the source at review start, not the final edited line numbers. This applies the actual backend skill at `C:/Users/ricky/.codeium/windsurf/skills/backend-agent-skill/SKILL.md` because `.devin/AGENTS.md` swaps its frontend/backend paths. Planning and the cross-component Mermaid sequence live in [the deployment review](Sep_1126_notification_deployment_review.md). Backend authorization and testing workflows were inspected; their generic examples are guidance, not authoritative project code.

## B1 — P1: A readable nonce cannot prove device reception

`functions/notification-fanout/src/main.ts:133-167` grants sender and recipient read access to a document containing the raw `receiptNonce`; `functions/notification-support/src/handlers/receiveValidation.ts:83-104` does the same for validation. `receipt.ts:45-46` accepts that readable value as delivery proof. An authenticated recipient can read the row and submit a receipt without receiving FCM, so readiness can turn green without delivery. The repair stores only a SHA-256 digest in the existing field and compares a required raw nonce received through FCM. No nonce is returned by registration/readiness APIs. Existing unhashed outstanding notifications must be resent after rollout.

## B2 — P1: Receipt retries and concurrent deliveries corrupt trusted state

`receipt.ts:27-32` returns success for an audit duplicate before verifying ownership or finishing any updates. A failure after the audit write at lines 59-69 permanently prevents recipient/device/job repair. Lines 88-92 read then overwrite `confirmedCount`, so two distinct concurrent recipients can both write 1. Concurrent events for one recipient can also increment twice, and lines 71-74 downgrade opened to received when events arrive out of order. Repair with authenticated, validated, atomic receipt transactions, deterministic audit IDs, conflict retries, and monotonic recipient state. Appwrite transaction support is a deployment prerequisite; the old node-appwrite 17.2.0 dependency cannot implement it.

## B3 — P1: Dispatch happens before its receipt target exists

`notification-fanout/src/main.ts:138-168` and `receiveValidation.ts:75-105` send to FCM before creating the recipient row. A quick physical-device receipt sees a missing recipient. The broad catch also confuses a successful send followed by a database failure with provider rejection. Validation failure creates no recipient history. Persist a pending recipient before dispatch, isolate provider errors from persistence errors, and update only dispatch fields afterward so a fast receipt remains confirmed.

## B4 — P1: Retries can send twice and no server throttling exists

Fanout checks a query then creates a random job ID at `main.ts:64-112`, allowing simultaneous same-key requests to both send. Validation ignores reuse entirely at `receiveValidation.ts:49-73`. Both handlers accept unlimited distinct sends despite the original PRD's rate-limit requirement and Option 2's documented 429 response. Claim jobs by deterministic IDs scoped to user/action/idempotency key, return existing jobs without sending, and enforce a database-backed unique rate-limit slot. Mark interrupted jobs failed on later replay without automatically resending an uncertain delivery.

## B5 — P1: Device ownership and readiness are writable by the client

`lib/appwrite/notifications.ts:49-113` creates/updates `userId`, token state, and `receiveStatus` directly with owner update permission. Appwrite document permissions do not restrict individual fields. A custom client can forge verified readiness or change a document's embedded ownership. Repair through authenticated support actions `registerDevice` and `deactivateDevice`, derive ownership from the execution context, ignore supplied trusted fields, and create owner-read-only device rows. Revoke existing client write permissions during deployment. The mobile agent owns the corresponding caller changes.

## B6 — P2: Provider failure handling revokes usable tokens and retains dead ones

`receiveValidation.ts:120-132` labels every provider or subsequent database exception an invalid token. Transient network/provider failures and permission/configuration errors therefore invalidate good devices. Fanout `main.ts:169-195` never invalidates permanently unregistered tokens. Classify only documented permanent registration-token errors as invalid, keep transient failures retryable, and avoid storing provider exception text in client-readable rows.

## B7 — P2: Invalid inputs bypass runtime validation and readiness is only local initialization

`_shared/http.ts:13-22` casts parsed JSON without validating the object; malformed JSON reaches a 500. Handler guards check truthiness but allow arrays, objects, unknown receipt events, invalid timestamps, and missing nonce. `sendValidation.ts:9-16` returns green after constructing SDK objects without contacting Appwrite or validating Firebase credentials. Repair bounded runtime validation with controlled 400 errors, and perform a read probe of required collections plus a credential token request before reporting backend readiness. Readiness remains a preflight: the physical-device round trip is separate evidence.

## Execution and verification

Finding-specific recipe checklists were created under `DOCS/TaskList/Sep_1126_backend_*.md` before implementation. B1-B7 are implemented locally. `tests/backend.test.ts` covers malformed requests, remote readiness probes, nonce forgery, receipt rollback/retry, lost commit responses, concurrent distinct recipients, reordered events, rotation, fast receipts, idempotency/rate limits, transient/permanent provider errors, and server-owned device/profile lifecycle. The complete run passes 7 suites and 42 tests, both active Functions typecheck, and both generated archives load in isolated installs. Database permissions, schema/index installation, real server transactions, Firebase credentials, native build, and device delivery cannot be proven by mocks and remain external release gates. Confidence: 0.96.

Primary references: [Option 2 PRD](../../../Project_details/notification_option2_functions_prd.md), [original notification PRD](../../../Project_details/database_defined_push_notification_prd.md), [backend specification](../../../Project_details/notification_option2_backend_spec_sheet.md), and [Appwrite transaction semantics](https://appwrite.io/docs/products/databases/documentsdb/transactions).
