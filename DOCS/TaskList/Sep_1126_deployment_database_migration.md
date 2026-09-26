# Action Item: Apply the reviewed Appwrite schema and permission contract

Finding D4, priority P1. Older setup documents permit direct client writes and describe four functions; the fixed two-function source requires server-owned profiles/device state, hashed receipt proof, transaction support, and atomic rate-limit claims. Reference [database changes](../db_struct_notification_deployment.md), [backend findings B1-B7](../Astra/Code-Reviews/Sep_1126_backend_findings.md), and [Option 2 PRD](../../Project_details/notification_option2_functions_prd.md).

## Task: Document and install the schema/permission delta

**Task Category:** data/backend/documentation. **Location:** Appwrite Console and `DOCS/db_struct_notification_deployment.md`. **Expected outcome:** deployed functions can use their queries and transactions, and clients cannot bypass their trust boundary. **Implementation pseudocode in natural language:** Verify the actual database and collections, add the optional rateLimitKey string and unique index, wait for availability, enable document security, remove broad client writes, and reconcile existing client-writable rows before enabling new code. Keep the nonce column but store hashes. **Comprehensive task explanation:** Static code cannot revoke remote permissions. A schema mismatch prevents function writes; old document grants survive collection-level changes; and old readable raw nonces cannot prove FCM delivery. Preserve existing data by backing up and migrating verified records or use a separate demo database.

DELEGATE_TO: Backend-Agent / deployment owner
TASK: Schema and permission rollout.
CONTEXT: B1/B2/B4/B5 fixes depend on server capabilities and access controls.
ARTIFACTS: Canonical database delta and this checklist.
ACCEPTANCE_CRITERIA: Required index available; direct client writes denied; ownership/read isolation pass; real concurrent receipt transaction tests pass.
RETURN_TO: Orchestration-Agent.

- [x] Write the exact schema/permission delta and migration caveats.
- [ ] Confirm actual Appwrite database/collection IDs and server transaction support (remote; unverified).
- [ ] Add `rateLimitKey` and its unique index, retaining existing required lookup indexes (remote; pending).
- [ ] Revoke legacy client document grants and reconcile legacy unique-index rows (remote; pending).
- [ ] Verify least-privilege function runtime keys and authenticated execution permissions (remote; pending).
- [ ] Run the real permission and concurrent receipt acceptance checks (remote; pending).

## Task: Make current deployment guidance discoverable

**Task Category:** documentation. **Location:** root README, active function READMEs, historical backend specs. **Expected outcome:** a developer uploads exactly two correct archives and reads current permission requirements. **Implementation pseudocode in natural language:** Point root README and old sheets to the reviewed guide; mark legacy folders as retired without deleting them; list exact archive root, entrypoint, command, and environment settings. **Comprehensive task explanation:** Keeping old source for reference must not cause obsolete deployment instructions to override the fixed architecture.

DELEGATE_TO: Backend-Agent / root integration
TASK: Align active instructions with reviewed deployment.
CONTEXT: Historical documents remain useful as field references but not as current deployment authority.
ARTIFACTS: Deployment guide and archive manifests.
ACCEPTANCE_CRITERIA: Root and active README instructions agree on the same two archives/settings.
RETURN_TO: Orchestration-Agent.

- [x] Update current guides and add supersession notices to old sheets.
- [x] Verify documentation links and active function inventory.
