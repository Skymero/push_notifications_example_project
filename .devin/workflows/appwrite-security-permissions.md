---
description: Appwrite Security Permissions - Collection, Document, Team, Function, and Storage permissions
auto_execution_mode: 3
---

# Junior Dev Checklist — Appwrite Security Permissions

Comprehensive guide for implementing and managing security permissions across Appwrite resources. Ensures proper access control while maintaining data security and user privacy.

---

## Quick expectations

* **Collection-level permissions**: Control who can read/write entire collections
* **Document-level permissions**: Control access to individual documents within collections
* **Team permissions**: Manage access based on team membership and roles
* **Function execution permissions**: Control who can trigger Appwrite functions
* **Storage bucket permissions**: Control file upload/download access and visibility
* **Principle of least privilege**: Grant minimum necessary access only
* **Never hardcode secrets**: Use environment variables and Appwrite's built-in secret management

---

## 1) Collection-level permissions

**Location:** Appwrite Console → Database → [Collection] → Settings → Permissions
**Expected:** Collections have appropriate read/write permissions for user roles and teams

### Steps

1. **Identify collection access requirements:**
   * Who needs to read data? (users, guests, specific teams)
   * Who needs to write/create data? (authenticated users, admins)
   * Is the collection public or private?

2. **Set read permissions:**
   * Public data: `Role:all` or `Role:guests`
   * User-specific data: `Role:users` (authenticated users only)
   * Team-specific data: `Role:team/[teamId]`
   * Owner-only data: `Role:member` (document owner only, set at document level)

3. **Set write permissions:**
   * Public writes: `Role:all` (rare, use with caution)
   * Authenticated writes: `Role:users`
   * Admin-only writes: `Role:team/[adminTeamId]`
   * Owner-only writes: `Role:member` (document owner only)

### Code example (setting collection permissions via SDK)

```js
// lib/appwrite.js
import { Databases } from 'appwrite';

const databases = new Databases(client);

// Update collection permissions
const updateCollectionPermissions = async (collectionId) => {
  try {
    await databases.updateCollection(
      databaseId,
      collectionId,
      collectionName,
      permissions: [
        'read("users")',      // Authenticated users can read
        'create("users")',    // Authenticated users can create
        'update("users")',    // Authenticated users can update
        'delete("users")',    // Authenticated users can delete
      ]
    );
  } catch (error) {
    console.error('Failed to update collection permissions:', error);
  }
};
```

### Common permission patterns

```js
// Public read, authenticated write
permissions: ['read("any")', 'create("users")', 'update("users")', 'delete("users")']

// Team-specific access
permissions: ['read("team/[teamId]")', 'create("team/[teamId]")']

// Owner-only access (combined with document-level permissions)
permissions: ['read("member")', 'update("member")', 'delete("member")']
```

### Tests

* Verify unauthenticated users cannot access protected collections
* Verify team members can only access collections they have permissions for
* Test write operations with different user roles

---

## 2) Document-level permissions

**Location:** Document creation/update via SDK or Appwrite Console
**Expected:** Individual documents have owner-specific permissions for sensitive data

### Steps

1. **Determine if document-level permissions are needed:**
   * Is the data user-specific? (profiles, private messages)
   * Should only the owner access it? (settings, drafts)
   * Should specific users have access? (shared documents)

2. **Set permissions on document creation:**
   * Use `Role:member` to grant access to document owner
   * Use `Role:user/[userId]` to grant access to specific users
   * Use `Role:team/[teamId]` to grant access to specific teams

3. **Update permissions dynamically:**
   * When sharing documents, add user/team permissions
   * When unsharing, remove permissions
   * Handle permission update errors gracefully

### Code example (document with owner permissions)

```js
// lib/appwrite.js
const createPrivateDocument = async (collectionId, data, userId) => {
  try {
    const response = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      data,
      // Grant owner-only access
      [
        'read("member")',    // Only document owner can read
        'update("member")',  // Only document owner can update
        'delete("member")',  // Only document owner can delete
      ]
    );
    return response;
  } catch (error) {
    console.error('Failed to create private document:', error);
    throw error;
  }
};
```

### Code example (sharing document with specific user)

```js
const shareDocumentWithUser = async (documentId, targetUserId) => {
  try {
    // Add read permission for specific user
    await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      {}, // no data changes
      [
        'read("member")',       // Keep owner permissions
        'update("member")',
        'delete("member")',
        `read("user:${targetUserId}")`, // Add read permission for target user
      ]
    );
  } catch (error) {
    console.error('Failed to share document:', error);
    throw error;
  }
};
```

### Tests

* Verify document owner can access their own documents
* Verify other users cannot access private documents
* Verify shared users can access shared documents
* Test permission revocation

---

## 3) Team permissions

**Location:** Appwrite Console → Teams → [Team] → Members or via SDK
**Expected:** Team members have appropriate access levels based on their role

### Steps

1. **Define team roles:**
   * Owner: Full control over team resources
   * Admin: Can manage members and team resources
   * Member: Standard access to team resources
   * Guest: Limited read-only access

2. **Add users to teams:**
   * Use Appwrite Teams API to add members
   * Assign appropriate roles
   * Handle duplicate membership gracefully

3. **Use team permissions in collections:**
   * Grant collection access based on team membership
   * Use `Role:team/[teamId]` for team-based access control
   * Combine with document-level permissions for fine-grained control

### Code example (creating team and adding members)

```js
// lib/appwrite.js
import { Teams } from 'appwrite';

const teams = new Teams(client);

const createTeamWithMembers = async (teamName, memberIds) => {
  try {
    // Create team
    const team = await teams.create(
      ID.unique(),
      teamName
    );

    // Add members with roles
    for (const memberId of memberIds) {
      await teams.createMembership(
        team.$id,
        memberId,
        ['member'], // Role: member, admin, or owner
        'http://localhost:3000/accept-invite' // Redirect URL
      );
    }

    return team;
  } catch (error) {
    console.error('Failed to create team:', error);
    throw error;
  }
};
```

### Code example (team-based collection permissions)

```js
const createTeamCollection = async (collectionId, teamId) => {
  try {
    await databases.createCollection(
      databaseId,
      collectionId,
      collectionName,
      permissions: [
        'read("team:' + teamId + '")',    // Team members can read
        'create("team:' + teamId + '")',  // Team members can create
        'update("team:' + teamId + '")',  // Team members can update
        'delete("team:' + teamId + '")',  // Team members can delete
      ]
    );
  } catch (error) {
    console.error('Failed to create team collection:', error);
    throw error;
  }
};
```

### Tests

* Verify team members can access team resources
* Verify non-members cannot access team resources
* Test role-based access (admin vs member)
* Verify team membership changes update access immediately

---

## 4) Function execution permissions

**Location:** Appwrite Console → Functions → [Function] → Settings → Permissions
**Expected:** Functions have appropriate execution permissions and cannot be abused

### Steps

1. **Determine who should execute functions:**
   * Public functions: `Role:all` or `Role:guests`
   * Authenticated functions: `Role:users`
   * Admin functions: `Role:team/[adminTeamId]`
   * Scheduled functions: No execution permissions needed (cron-based)

2. **Set function execution permissions:**
   * Use Appwrite Console or SDK to set permissions
   * Restrict sensitive functions to specific roles
   * Consider rate limiting for public functions

3. **Validate function inputs:**
   * Validate all input parameters
   * Sanitize user-provided data
   * Check user permissions within function logic
   * Return appropriate error messages

### Code example (function with permission checks)

```js
// functions/process-payment/index.js
export default async ({ req, res, log, error }) => {
  // Validate user is authenticated
  if (!req.headers['x-appwrite-user-id']) {
    return res.json({ error: 'Unauthorized' }, 401);
  }

  const userId = req.headers['x-appwrite-user-id'];

  // Validate input
  const { amount, recipientId } = JSON.parse(req.body);
  if (!amount || !recipientId) {
    return res.json({ error: 'Missing required fields' }, 400);
  }

  // Additional business logic validation
  if (amount <= 0) {
    return res.json({ error: 'Invalid amount' }, 400);
  }

  try {
    // Process payment
    const result = await processPayment(userId, amount, recipientId);
    return res.json(result, 200);
  } catch (err) {
    error('Payment processing failed:', err);
    return res.json({ error: 'Payment failed' }, 500);
  }
};
```

### Code example (setting function permissions via SDK)

```js
// lib/appwrite.js
import { Functions } from 'appwrite';

const functions = new Functions(client);

const updateFunctionPermissions = async (functionId) => {
  try {
    await functions.update(
      functionId,
      functionName,
      // Execution permissions
      ['execute("users")'], // Only authenticated users can execute
      // Environment variables
      {},
      // Events
      [],
      // Schedule
      ''
    );
  } catch (error) {
    console.error('Failed to update function permissions:', error);
  }
};
```

### Tests

* Verify unauthenticated users cannot execute protected functions
* Verify authenticated users can execute allowed functions
* Test function input validation
* Verify rate limiting for public functions

---

## 5) Storage bucket permissions

**Location:** Appwrite Console → Storage → [Bucket] → Settings → Permissions
**Expected:** Storage buckets have appropriate read/write permissions and file access controls

### Steps

1. **Determine bucket access requirements:**
   * Public assets: `Role:all` for read, `Role:users` for write
   * User uploads: `Role:member` for read/write
   * Team files: `Role:team/[teamId]` for access
   * Private files: Document-level permissions only

2. **Set bucket-level permissions:**
   * Read permissions: Who can view files
   * Write permissions: Who can upload files
   * Delete permissions: Who can delete files

3. **Set file-level permissions:**
   * Use `Role:member` for owner-only files
   * Use `Role:user/[userId]` for shared files
   * Use `Role:team/[teamId]` for team files

### Code example (creating bucket with permissions)

```js
// lib/appwrite.js
import { Storage } from 'appwrite';

const storage = new Storage(client);

const createSecureBucket = async (bucketId, bucketName) => {
  try {
    await storage.createBucket(
      bucketId,
      bucketName,
      // Bucket permissions
      [
        'read("users")',   // Authenticated users can read
        'create("users")', // Authenticated users can upload
        'update("users")', // Authenticated users can update
        'delete("users")', // Authenticated users can delete
      ],
      // File security (false = no file-level security)
      true, // Enable file-level security for individual file control
      // Maximum file size (in bytes)
      10485760, // 10MB
      // Allowed file extensions
      ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
      // Compression
      false
    );
  } catch (error) {
    console.error('Failed to create bucket:', error);
    throw error;
  }
};
```

### Code example (uploading file with owner permissions)

```js
const uploadPrivateFile = async (bucketId, file, userId) => {
  try {
    const response = await storage.createFile(
      bucketId,
      ID.unique(),
      file,
      // File-level permissions (owner-only)
      [
        'read("member")',   // Only owner can read
        'update("member")', // Only owner can update
        'delete("member")', // Only owner can delete
      ]
    );
    return response;
  } catch (error) {
    console.error('Failed to upload file:', error);
    throw error;
  }
};
```

### Code example (generating preview URL with permissions)

```js
const getFilePreview = async (bucketId, fileId) => {
  try {
    const url = storage.getFilePreview(
      bucketId,
      fileId,
      200, // width
      200, // height
      100, // quality
      'center', // gravity
      0, // border
      0, // borderWidth
      0, // borderRadius
      0, // opacity
      0, // rotation
      0, // background
      'jpg' // format
    );
    return url.href;
  } catch (error) {
    console.error('Failed to get file preview:', error);
    throw error;
  }
};
```

### Tests

* Verify unauthenticated users cannot access protected buckets
* Verify file owners can access their own files
* Verify shared users can access shared files
* Test file upload size limits and extension validation
* Verify preview URLs respect permissions

---

## 6) Security best practices

### Never hardcode secrets

```js
// BAD: Hardcoded API key
const apiKey = 'sk_live_1234567890abcdef';

// GOOD: Use environment variable
const apiKey = process.env.STRIPE_API_KEY;
```

### Validate all inputs

```js
const validateInput = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid input');
  }
  
  // Sanitize strings
  if (data.name) {
    data.name = data.name.trim().substring(0, 100);
  }
  
  // Validate numbers
  if (data.amount) {
    if (isNaN(data.amount) || data.amount <= 0) {
      throw new Error('Invalid amount');
    }
  }
  
  return data;
};
```

### Use principle of least privilege

```js
// BAD: Granting too much access
permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")']

// GOOD: Minimum necessary access
permissions: ['read("users")', 'create("users")']
```

### Log security events

```js
const logSecurityEvent = async (event, userId, details) => {
  try {
    await databases.createDocument(
      databaseId,
      securityLogsCollectionId,
      ID.unique(),
      {
        event,
        userId,
        details,
        timestamp: new Date().toISOString(),
        ipAddress: req.headers['x-forwarded-for'] || req.connection.remoteAddress
      }
    );
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
};
```

---

## 7) Grep / codemod hints

* Find hardcoded secrets: `rg "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]+['\"]" -n`
* Find overly permissive permissions: `rg "read\(['\"]any['\"]\)|create\(['\"]any['\"]\)" -n`
* Find missing permission checks: `rg "createDocument|updateDocument|deleteDocument" -n | rg -v "permissions"`

---

## 8) Update changelog

After implementing permission changes, update `DOCS/ChangeLog.md` with:
- Collection permission changes
- Document permission patterns added
- Team permission structures
- Function execution restrictions
- Storage bucket security updates
- Any breaking changes to access patterns
