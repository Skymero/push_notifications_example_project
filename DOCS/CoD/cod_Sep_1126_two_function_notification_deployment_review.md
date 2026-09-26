# Chronicles of Debugging: Two-function notification deployment

This chronicle follows `.devin/workflows/cod.md` and explains the problems found while reviewing the Android React Native/Appwrite/FCM project. The target architecture deploys only `notification-fanout` and `notification-support`.

## Compiled functions were not runnable deployment artifacts

### **Problem Summary**

- TypeScript passed while Node could not load the emitted fanout entrypoint. Each old Appwrite source root also excluded the shared helpers imported by the function, and the wildcard workspace included the three retired standalone functions.

**Error/Terminal Output:**

```text
> notification-fanout@1.0.0 build
> tsc

Error [ERR_MODULE_NOT_FOUND]: Cannot find module
'...\notification-fanout\dist\_shared\appwrite'
imported from '...\dist\notification-fanout\src\main.js'
```

- **Theory**: The compiler checked types but did not test Node module loading or the Appwrite upload boundary. Extensionless ES-module imports failed in Node 22, and `_shared` would be outside an individual source upload.
- **What I've Tried**: Reproduced the emitted import failure, inspected output paths and manifests, restricted active workspaces, removed retired Function entries from the root lockfile, changed active server output to CommonJS, built clean archives, then installed and loaded the exact archive bytes outside the repository.

### Debugging process

- **What I checked**: Both active function manifests, TypeScript configs, emitted `dist`, README entrypoints, root workspaces, and shared imports.
  - **What hinted that this step was the right direction**: A successful typecheck beside an immediate Node loader error meant two different questions were being tested.
  - **What did you find in this debugging step**: Package `main`, emitted layout, module format, and documented upload root did not form one runnable unit.
  - **What this means for a beginner**: “The code compiles” does not mean “the server can start this upload.” Runtime files and dependencies must exist inside the deployed boundary.
- **What I checked**: Tar entries and dependency resolution in temporary directories.
  - **What hinted that this step was the right direction**: Local parent folders can accidentally supply dependencies or stale output that will not exist in Appwrite.
  - **What did you find in this debugging step**: Both rebuilt archives contain only their manifest, lockfile, and compiled tree; each installs production dependencies, loads its declared main, and returns the expected unauthenticated 401 in isolation.
  - **What this means for a beginner**: Testing the actual upload catches packaging failures that source tests cannot see.

### Snippet

```js
// Only these functions are deployable.
const names = ['notification-fanout', 'notification-support'];

// A new temporary build tree prevents stale JavaScript from surviving.
const staging = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-build-`));

// The archive carries compiled shared code and a production dependency lock.
run('tar', ['-czf', archive, '-C', staging,
  'package.json', 'package-lock.json', 'dist'], root);
```

### Solution and implementation

- Root workspaces and scripts now operate on exactly two functions. Active functions emit CommonJS, declare the real compiled entrypoint, and use exact `node-appwrite@20.2.1` for transaction APIs.
- `scripts/package-functions.cjs` creates two self-contained archives. `scripts/verify-function-packages.cjs` rejects secrets, traversal, `node_modules`, and retired-function content before an isolated install/load/authentication smoke.
- Active READMEs document archive-root deployment. Legacy receipt/send-validation/receive-validation READMEs are marked retired.

# Concepts

- Type checking versus runtime loading
- CommonJS and ES modules
- Serverless upload roots
- Reproducible locks
- Artifact-level smoke testing

## Receipt proof and trusted state were unsafe under failure and concurrency

### **Problem Summary**

- Readable recipient rows exposed the raw nonce used as proof of FCM delivery. Receipt audit, recipient state, device readiness, and job counts were separate writes. A crash after the audit blocked repair, concurrent devices lost counts, and later `received` events could downgrade `opened`.

**Error/Terminal Output:**

```text
Original state transition:
create receipt audit -> update recipient -> update device -> overwrite confirmedCount

Failure modes:
audit succeeds, later write fails, retry returns duplicate too early
two readers observe confirmedCount=0, both write confirmedCount=1
```

- **Theory**: A delivery nonce cannot prove receipt if the same client can read it from the database. Idempotency does not make a sequence atomic; related trusted writes need one transaction.
- **What I've Tried**: Stored a token-bound digest, required the raw FCM nonce, moved validation before duplicate success, and committed audit/recipient/device/count changes in a conflict-retrying transaction.

### Debugging process

- **What I checked**: Recipient permissions, notification payload construction, nonce comparison, duplicate receipt behavior, event ordering, and count updates.
  - **What hinted that this step was the right direction**: The PRD called device receipt authoritative while the proof itself was visible through the authoritative row.
  - **What did you find in this debugging step**: The client could copy the nonce without receiving FCM, a partial receipt could never finish, and ordinary read-modify-write lost concurrent confirmations.
  - **What this means for a beginner**: A secret stops being proof when the claimant can read it elsewhere. An idempotency key prevents repeats only when its protected state is committed consistently.
- **What I checked**: Appwrite transaction support, conflict retries, rollback, and a lost commit response.
  - **What hinted that this step was the right direction**: Atomic increment fixes one field but cannot coordinate four collections.
  - **What did you find in this debugging step**: Appwrite database transactions can stage these writes together. The callback contains database operations only; FCM is kept outside retryable transactions.
  - **What this means for a beginner**: Retrying database work can be safe. Retrying an external send inside the same loop might notify a phone twice.

### Snippet

```ts
// The row stores a digest bound to the exact token used for the send.
receiptNonce: hashReceiptNonce(nonce, input.token.fcmToken),

// Only the recipient's first confirmed transition increments the job.
if (!wasConfirmed) {
  await databases.incrementDocumentAttribute({
    databaseId,
    collectionId: config.notificationJobsCollectionId,
    documentId: request.jobId,
    attribute: 'confirmedCount',
    value: 1,
    transactionId,
  });
}
```

### Solution and implementation

- Shared payload code hashes nonce and target token and compares the digest in constant time.
- Shared transaction code commits or rolls back related receipt writes and retries optimistic conflicts with a bounded budget.
- Receipt handling validates ownership, current device/token, and raw nonce before duplicate success; uses deterministic audit IDs; keeps `opened` monotonic; and counts one confirmation per recipient.
- Tests cover nonce forgery, rollback/retry, response loss after commit, simultaneous distinct recipients, reordered events, and token rotation.

# Concepts

- Delivery proof and disclosure
- Cryptographic digest binding
- Atomicity and idempotency
- Optimistic concurrency
- Monotonic states

## Dispatch, retries, throttling, and token failures were ambiguous

### **Problem Summary**

- FCM was called before its recipient row existed, allowing a fast receipt to fail. Random job IDs allowed simultaneous identical requests to send twice. Validation ignored replay keys, no server throttle enforced the PRD, transient failures invalidated good tokens, and permanent dead registrations stayed eligible.

**Error/Terminal Output:**

```text
Original ordering: FCM send -> recipient create
Original claim: query existing -> create random job ID
Two executions could both see no existing job and both send.
```

- **Theory**: The database must claim work and persist the receipt target before the external side effect. Provider failures need a narrow permanent/transient classification.
- **What I've Tried**: Added deterministic jobs, unique database rate slots, pending recipients, bounded fanout workers, stale-job retirement, safe replay, and permanent-token invalidation guarded against rotation.

### Debugging process

- **What I checked**: Fanout/validation order, create races, idempotency reuse, target bounds, FCM errors, and post-send database failures.
  - **What hinted that this step was the right direction**: FCM and Appwrite do not share one transaction, and two function processes do not share memory.
  - **What did you find in this debugging step**: “Query then create” was not an atomic claim; validation retries could resend; broad catches mixed provider and persistence failures.
  - **What this means for a beginner**: Database uniqueness can decide one winner even when two servers run the same request together.
- **What I checked**: Mobile waiting behavior for fanout.
  - **What hinted that this step was the right direction**: A 100-target send can outlive a synchronous phone request, while asynchronous Appwrite execution returns no handler JSON body.
  - **What did you find in this debugging step**: The durable job is the reliable response. The client can schedule async work and locate its owner-readable job using the same raw request key.
  - **What this means for a beginner**: Long work should be observed through durable state instead of holding a mobile HTTP call open.

### Snippet

```ts
const jobId = deterministicId(
  'job', request.userId, request.type,
  request.deviceId ?? '', request.idempotencyKey,
);

// A unique index makes this fixed-window claim atomic across processes.
const rateLimitKey = createHash('sha256').update(JSON.stringify([
  request.userId, request.type, request.deviceId ?? '',
  Math.floor(Date.now() / (cooldown * 1000)),
])).digest('hex');
```

### Solution and implementation

- `jobs.ts` distinguishes claimed work, replay, incompatible reuse, fixed-window rate limiting, and stale interrupted work.
- `dispatch.ts` creates a pending row before FCM, stores sanitized outcomes, invalidates only documented permanent registration errors, and refuses to invalidate a newly rotated token.
- Fanout is capped at 100 and uses five workers. The phone schedules it asynchronously, discovers the job by user/type/key, preserves uncertain request identity, and then uses database/Realtime monitoring.
- Send readiness now probes required collections/index, a transaction create/rollback, the authenticated Account, and Firebase credential access before returning green.

# Concepts

- Deterministic identifiers
- Unique indexes as locks
- Fixed-window rate limiting
- Durable jobs
- Permanent versus transient provider errors

## Client authority, mobile lifecycle, and configuration were unreliable

### **Problem Summary**

- Mobile code could update entire profile/device documents containing trusted ownership/readiness fields. Expo public variables were dynamically indexed and therefore not inlined into release bundles. Appwrite lacked the Android platform identifier. Notification permission, background startup, foreground display, receipt queues, account switches, readiness polling, Realtime reconciliation, and recipient pagination also had concrete defects.

**Error/Terminal Output:**

```text
Original public configuration:
const required = (name: string) => process.env[name] ?? '';

Current deployment preflight:
BLOCKED: EXPO_PUBLIC_APPWRITE_PROJECT_ID is configured for this local build
BLOCKED: Firebase Android configuration file exists
BLOCKED: Existing Android application ID matches Expo config
PENDING: EAS project linkage (required only for cloud builds)
```

- **Theory**: Avoiding trusted edits in the UI is not authorization because Appwrite document grants cover the whole row. Mobile build values must exist at bundling/native-generation time, and every delayed callback/persisted item needs an account/lifecycle owner.
- **What I've Tried**: Moved profile/device writes into authenticated support actions, used literal Expo variable access, set Appwrite's platform, registered background handling in the entrypoint, displayed foreground pushes locally, serialized/account-scoped receipts, and generation-bound readiness/job activity.

### Debugging process

- **What I checked**: Client create/update permissions, server trust in device fields, profile bootstrap, token rotation, sign-out, Expo environment rules, Appwrite client origin, Android permission APIs, listeners, AsyncStorage operations, hooks across account changes, and recipient pagination.
  - **What hinted that this step was the right direction**: TypeScript was green while build-time replacement, Android headless startup, and remote authorization obey rules outside the type system.
  - **What did you find in this debugging step**: An authenticated custom client could forge owner/readiness fields; dynamic public variables vanished from native bundles; listener/queue work crossed session boundaries; the first 100 recipients were the only ones loaded.
  - **What this means for a beginner**: Authentication tells the server who called. Authorization still has to decide which fields that caller may control. Async mobile work also needs cancellation when its user or screen changes.
- **What I checked**: `app.json`, local environment presence, Firebase files, EAS linkage, and the ignored Android Gradle tree.
  - **What hinted that this step was the right direction**: The claim that only Firebase remained did not match an empty Appwrite Project ID or a different native application ID.
  - **What did you find in this debugging step**: Firebase JSON is absent, the Project ID is empty, EAS is not linked, and ignored Gradle uses `com.pushnotificationexample` while Expo expects `com.pushnotificationexample.app`.
  - **What this means for a beginner**: Configuration is compiled into the APK. Changing `.env` after building does not repair an installed app.

### Snippet

```ts
// Expo can inline statically named public variables.
endpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT ?? '',
projectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID ?? '',

// The client removes its claimed owner before calling trusted registration.
const { userId, ...registration } = input;
return executeJson(functionIds.support,
  supportEnvelope('registerDevice', registration));

// Android background handling registers before the Router UI mounts.
registerBackgroundMessagingHandler();
require('expo-router/entry');
```

### Solution and implementation

- Support now routes `ensureProfile`, `registerDevice`, and `deactivateDevice`, derives Account identity/name, owns trusted fields/timestamps, and writes owner-read-only documents. Sign-in rolls back a newly created session if server profile bootstrap fails.
- Expo config uses literal public accesses; Appwrite receives `com.pushnotificationexample.app` through `setPlatform`; Android permission truth comes from Expo's OS permission result.
- `index.js` performs early background registration. Foreground display begins without waiting for receipt network completion; receipt work is saved before submission and retried for the matching owner after auth/resume and on a bounded interval.
- Readiness and job hooks cancel stale user generations, serialize work, reset on logout, subscribe before reconciliation, poll while active, and page recipients with cursors.
- `app.config.js` supports EAS `GOOGLE_SERVICES_JSON`. `deployment:check` reports missing/mismatched item names without printing secrets. The deployment guide preserves the ignored native folder and directs clean generation through EAS or a fresh copy.

# Concepts

- Whole-document permissions and server trust boundaries
- Expo environment inlining
- Native package/platform identity
- Android headless and foreground delivery
- Durable serialized queues
- Session-scoped async work
- Realtime reconciliation and pagination

## Verification and remaining external work

### **Problem Summary**

- The review needed to establish which layers are functional locally without claiming that mocks or a JavaScript bundle prove Appwrite permissions, Firebase credentials, native compilation, or two-device delivery.

**Error/Terminal Output:**

```text
npm run typecheck                        PASS
npm run functions:check                 PASS (two active functions)
npx jest --runInBand                    PASS (7 suites, 42 tests)
npm run functions:package               PASS (two archives)
npm run functions:smoke                 PASS (both isolated handlers)
npx expo export --platform android      PASS (1 bundle, 1,243 modules)
npm ci --ignore-scripts                 PASS
npm audit --omit=dev                    REVIEW (18 moderate, 9 high, 0 critical)
git diff --check                        PASS
npm run deployment:check               EXPECTED BLOCKED on external setup
```

- **Theory**: Each check answers a different question. Local correctness and live deployment readiness must remain separate.
- **What I've Tried**: Layered source, regression, compiled artifact, isolated archive, Android bundle, and secret-safe configuration checks, then documented the exact remote/device acceptance gates.

### Debugging process

- **What I checked**: TypeScript, seven test suites, archive contents and imports, Android export, local configuration presence, schema/permissions, and the physical-device matrix.
  - **What hinted that this step was the right direction**: Earlier green static checks had been treated too broadly, while runtime and configuration defects still existed.
  - **What did you find in this debugging step**: Local code/artifacts now pass. The real Appwrite Project ID, Firebase JSON/Admin values, schema/index/permission migration, function deployments, clean APK, and two physical phones remain unverified.
  - **What this means for a beginner**: A release is a chain of independently testable links. Passing unit tests does not configure Firebase or prove a phone received anything.

### Snippet

```js
// Presence-only checks keep values and Firebase contents out of logs.
check(Boolean(setting('EXPO_PUBLIC_APPWRITE_PROJECT_ID')),
  'EXPO_PUBLIC_APPWRITE_PROJECT_ID is configured for this local build');
check(fs.existsSync(firebasePath),
  'Firebase Android configuration file exists');
```

### Solution and implementation

- The master review and every junior checklist now distinguish completed local work from open external gates.
- Both Function workspaces now use `firebase-admin@14.4.0`, retired Function entries are absent from the root lockfile, and a clean install succeeds. The residual audit report belongs to the PRD-pinned Expo SDK 54 graph; npm proposes an SDK 57 major migration, which needs a separate native upgrade and device-validation cycle.
- `DOCS/db_struct_notification_deployment.md` defines transaction support, rate-limit and query indexes, hashed nonce semantics, server-only writes, legacy permission migration, and runtime scopes.
- `DOCS/Astra/Code-Reviews/Sep_1126_deployment_guide.md` defines the two archive settings, environments, clean build options, and the two-device acceptance matrix.
- No placeholder Firebase file, secret, remote permission claim, or physical-device claim was fabricated.

# Concepts

- Verification layers
- Secret-safe preflight
- JavaScript export versus native build
- Remote schema/permission tests
- Physical-device acceptance

# Summary

The review found and repaired local security, concurrency, packaging, mobile lifecycle, error-handling, and monitoring defects that prevented a credible two-function deployment. Only `notification-fanout` and `notification-support` participate in active workspaces, the root lockfile, and generated uploads. The remaining work is account/device owned: configure Appwrite and Firebase, apply the database/permission delta, deploy the two archives, create a clean Android APK, and complete the two-device matrix. The review documents these external gates separately from the passing local evidence.
