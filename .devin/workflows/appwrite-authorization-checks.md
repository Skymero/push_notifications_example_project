---
description: Appwrite Authorization Checks - Permission validation, RBAC, Resource ownership, Team access, Document-level security
auto_execution_mode: 3
---

# Junior Dev Checklist — Appwrite Authorization Checks

Comprehensive guide for implementing authorization checks in Appwrite-based applications. Ensures proper access control, resource ownership verification, and security across all operations.

---

## Quick expectations

* **Permission validation**: Validate user permissions before allowing operations
* **Role-based access control**: Implement roles with different permission levels
* **Resource ownership verification**: Ensure users can only access their own resources
* **Team/organization access**: Manage access based on team membership
* **Document-level security**: Implement fine-grained access control at document level
* **Defense in depth**: Implement multiple layers of authorization checks

---

## 1) Permission validation patterns

**Location:** `lib/appwrite.js`, middleware functions, API handlers
**Expected:** All operations validate user permissions before execution

### Steps

1. **Define permission levels:**
   * Read: Can view resources
   * Write: Can create/update resources
   * Delete: Can remove resources
   * Admin: Full control over resources

2. **Implement permission checks:**
   * Check user authentication
   * Verify user roles
   * Validate resource ownership
   * Check team membership

3. **Handle authorization failures:**
   * Return 401 for unauthenticated
   * Return 403 for unauthorized
   * Log authorization failures
   * Provide clear error messages

### Code example (permission validator)

```js
// lib/auth/permissionValidator.js

const PERMISSIONS = {
  READ: 'read',
  WRITE: 'write',
  DELETE: 'delete',
  ADMIN: 'admin',
};

const hasPermission = (user, requiredPermission) => {
  if (!user) return false;
  
  const userPermissions = user.permissions || [];
  return userPermissions.includes(requiredPermission) || 
         userPermissions.includes(PERMISSIONS.ADMIN);
};

const requirePermission = (requiredPermission) => {
  return (user) => {
    if (!hasPermission(user, requiredPermission)) {
      throw new Error(`Permission denied: ${requiredPermission} required`);
    }
  };
};

const requireAnyPermission = (...permissions) => {
  return (user) => {
    if (!user) return false;
    
    const userPermissions = user.permissions || [];
    const hasAny = permissions.some(perm => 
      userPermissions.includes(perm) || userPermissions.includes(PERMISSIONS.ADMIN)
    );
    
    if (!hasAny) {
      throw new Error(`Permission denied: one of ${permissions.join(', ')} required`);
    }
  };
};

export { PERMISSIONS, hasPermission, requirePermission, requireAnyPermission };
```

### Code example (authorization middleware)

```js
// lib/auth/authorizationMiddleware.js

import { requirePermission } from './permissionValidator';

export const requireAuth = (handler) => {
  return async ({ req, res, log, error }) => {
    const userId = req.headers['x-appwrite-user-id'];
    
    if (!userId) {
      return res.json({ error: 'Authentication required' }, 401);
    }
    
    try {
      const user = await databases.getDocument(
        databaseId,
        userCollectionId,
        userId
      );
      
      req.user = user;
      return handler({ req, res, log, error });
    } catch (err) {
      error('Authentication failed:', err);
      return res.json({ error: 'Authentication failed' }, 401);
    }
  };
};

export const requireAdmin = (handler) => {
  return requireAuth(async ({ req, res, log, error }) => {
    try {
      requirePermission('admin')(req.user);
      return handler({ req, res, log, error });
    } catch (err) {
      return res.json({ error: 'Admin access required' }, 403);
    }
  });
};

export const requireWriteAccess = (handler) => {
  return requireAuth(async ({ req, res, log, error }) => {
    try {
      requirePermission('write')(req.user);
      return handler({ req, res, log, error });
    } catch (err) {
      return res.json({ error: 'Write access required' }, 403);
    }
  });
};
```

### Code example (using authorization middleware)

```js
// functions/api/admin/users/index.js
import { requireAdmin } from '../../../lib/auth/authorizationMiddleware';

const listAllUsersHandler = async ({ req, res, log, error }) => {
  // Admin-only operation
  const users = await databases.listDocuments(databaseId, userCollectionId);
  return res.json(users, 200);
};

export default requireAdmin(listAllUsersHandler);
```

### Code example (permission check helper)

```js
// lib/auth/permissionChecker.js

const checkUserPermission = async (userId, resourceType, resourceId, action) => {
  try {
    // Get user
    const user = await databases.getDocument(
      databaseId,
      userCollectionId,
      userId
    );
    
    // Check if user is admin
    if (user.role === 'admin') {
      return { allowed: true, reason: 'admin' };
    }
    
    // Check resource ownership
    if (resourceType === 'document') {
      const resource = await databases.getDocument(
        databaseId,
        resourceId.collectionId,
        resourceId.documentId
      );
      
      if (resource.userId === userId) {
        return { allowed: true, reason: 'owner' };
      }
    }
    
    // Check team permissions
    if (resourceType === 'team') {
      const membership = await databases.listDocuments(
        databaseId,
        teamMembershipCollectionId,
        [
          Query.equal('userId', userId),
          Query.equal('teamId', resourceId)
        ]
      );
      
      if (membership.total > 0) {
        const memberRole = membership.documents[0].role;
        
        if (action === 'read' && ['member', 'admin', 'owner'].includes(memberRole)) {
          return { allowed: true, reason: 'team_member' };
        }
        
        if (action === 'write' && ['admin', 'owner'].includes(memberRole)) {
          return { allowed: true, reason: 'team_admin' };
        }
      }
    }
    
    return { allowed: false, reason: 'no_permission' };
  } catch (error) {
    console.error('Permission check failed:', error);
    return { allowed: false, reason: 'error' };
  }
};

export { checkUserPermission };
```

### Tests

* Verify unauthenticated requests are rejected
* Test unauthorized requests return 403
* Check admin users bypass permission checks
* Verify permission errors are logged

---

## 2) Role-based access control

**Location:** User collection schema, role assignment functions, permission checks
**Expected**: Users have roles with specific permission sets

### Steps

1. **Define role hierarchy:**
   * Guest: Limited read access
   * User: Standard read/write access
   * Moderator: Additional moderation permissions
   * Admin: Full system access

2. **Assign roles to users:**
   * Set role on user creation
   * Update roles via admin functions
   * Validate role changes
   * Log role assignments

3. **Implement role-based permissions:**
   * Map roles to permission sets
   * Check role before operations
   * Handle role transitions
   * Support custom roles

### Code example (role definitions)

```js
// lib/auth/roles.js

const ROLES = {
  GUEST: 'guest',
  USER: 'user',
  MODERATOR: 'moderator',
  ADMIN: 'admin',
};

const ROLE_PERMISSIONS = {
  [ROLES.GUEST]: ['read:public'],
  [ROLES.USER]: [
    'read:public',
    'read:own',
    'create:own',
    'update:own',
    'delete:own',
  ],
  [ROLES.MODERATOR]: [
    'read:public',
    'read:own',
    'create:own',
    'update:own',
    'delete:own',
    'moderate:content',
    'read:all',
  ],
  [ROLES.ADMIN]: [
    'read:public',
    'read:own',
    'read:all',
    'create:own',
    'create:all',
    'update:own',
    'update:all',
    'delete:own',
    'delete:all',
    'moderate:content',
    'manage:users',
    'manage:roles',
  ],
};

const getPermissionsForRole = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

const hasRolePermission = (user, permission) => {
  const permissions = getPermissionsForRole(user.role);
  return permissions.includes(permission);
};

export { ROLES, ROLE_PERMISSIONS, getPermissionsForRole, hasRolePermission };
```

### Code example (role assignment)

```js
// lib/auth/roleManager.js

import { ROLES } from './roles';

const assignRole = async (userId, role, assignedBy) => {
  try {
    // Validate role
    if (!Object.values(ROLES).includes(role)) {
      throw new Error('Invalid role');
    }
    
    // Check if assigner has permission to assign roles
    const assigner = await databases.getDocument(
      databaseId,
      userCollectionId,
      assignedBy
    );
    
    if (assigner.role !== ROLES.ADMIN) {
      throw new Error('Only admins can assign roles');
    }
    
    // Update user role
    const updatedUser = await databases.updateDocument(
      databaseId,
      userCollectionId,
      userId,
      { role }
    );
    
    // Log role change
    await databases.createDocument(
      databaseId,
      auditLogCollectionId,
      ID.unique(),
      {
        action: 'role_change',
        userId,
        oldRole: assigner.role,
        newRole: role,
        assignedBy,
        timestamp: new Date().toISOString(),
      }
    );
    
    return updatedUser;
  } catch (error) {
    console.error('Role assignment failed:', error);
    throw error;
  }
};

const getDefaultRole = (user) => {
  // New users default to 'user' role
  return ROLES.USER;
};

export { assignRole, getDefaultRole };
```

### Code example (role-based authorization)

```js
// lib/auth/roleAuthorization.js

import { hasRolePermission } from './roles';

const requireRole = (requiredRole) => {
  return (user) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    if (user.role !== requiredRole) {
      throw new Error(`Role ${requiredRole} required`);
    }
  };
};

const requireAnyRole = (...roles) => {
  return (user) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    if (!roles.includes(user.role)) {
      throw new Error(`One of roles ${roles.join(', ')} required`);
    }
  };
};

const requirePermission = (permission) => {
  return (user) => {
    if (!user) {
      throw new Error('Authentication required');
    }
    
    if (!hasRolePermission(user, permission)) {
      throw new Error(`Permission ${permission} required`);
    }
  };
};

export { requireRole, requireAnyRole, requirePermission };
```

### Code example (using role-based authorization)

```js
// functions/api/content/moderate.js
import { requirePermission } from '../../../lib/auth/roleAuthorization';

const moderateContentHandler = async ({ req, res, log, error }) => {
  const { contentId, action } = JSON.parse(req.body);
  
  try {
    // Check user has moderation permission
    requirePermission('moderate:content')(req.user);
    
    // Perform moderation action
    const result = await databases.updateDocument(
      databaseId,
      contentCollectionId,
      contentId,
      { moderationStatus: action, moderatedBy: req.user.$id }
    );
    
    return res.json(result, 200);
  } catch (err) {
    error('Moderation failed:', err);
    return res.json({ error: err.message }, 403);
  }
};
```

### Tests

* Verify role assignments work correctly
* Test role-based permission checks
* Check role changes are logged
* Verify default roles are assigned

---

## 3) Resource ownership verification

**Location:** CRUD operations, document access functions
**Expected**: Users can only access resources they own or have permission to access

### Steps

1. **Track resource ownership:**
   * Add `userId` field to resources
   * Set owner on resource creation
   * Verify ownership on access
   * Support shared resources

2. **Implement ownership checks:**
   * Check `userId` matches current user
   * Handle shared resources
   * Support ownership transfer
   * Log ownership changes

3. **Handle ownership violations:**
   * Return 403 for unauthorized access
   * Log unauthorized access attempts
   * Provide clear error messages
   * Support ownership verification API

### Code example (ownership checker)

```js
// lib/auth/ownershipChecker.js

const isResourceOwner = async (userId, resource) => {
  if (!resource || !resource.userId) {
    return false;
  }
  
  return resource.userId === userId;
};

const verifyOwnership = async (userId, collectionId, documentId) => {
  try {
    const resource = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    );
    
    if (resource.userId === userId) {
      return { owned: true, resource };
    }
    
    // Check if resource is shared with user
    if (resource.sharedWith && resource.sharedWith.includes(userId)) {
      return { owned: false, shared: true, resource };
    }
    
    return { owned: false, shared: false, resource };
  } catch (error) {
    console.error('Ownership verification failed:', error);
    return { owned: false, shared: false, error };
  }
};

const requireOwnership = (userId, collectionId, documentId) => {
  return async () => {
    const { owned, shared } = await verifyOwnership(userId, collectionId, documentId);
    
    if (!owned && !shared) {
      throw new Error('Resource not found or access denied');
    }
    
    return true;
  };
};

export { isResourceOwner, verifyOwnership, requireOwnership };
```

### Code example (ownership middleware)

```js
// lib/auth/ownershipMiddleware.js

import { verifyOwnership } from './ownershipChecker';

export const requireResourceOwnership = (collectionId) => {
  return async ({ req, res, log, error }) => {
    const userId = req.user.$id;
    const documentId = req.path.split('/').pop();
    
    const { owned, shared } = await verifyOwnership(userId, collectionId, documentId);
    
    if (!owned && !shared) {
      return res.json({ error: 'Resource not found or access denied' }, 404);
    }
    
    // Add ownership info to request
    req.ownership = { owned, shared };
    
    return handler({ req, res, log, error });
  };
};
```

### Code example (creating resource with ownership)

```js
// lib/resource/resourceCreator.js

const createResource = async (userId, collectionId, data) => {
  try {
    const resourceData = {
      ...data,
      userId, // Set owner
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const resource = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      resourceData
    );
    
    return resource;
  } catch (error) {
    console.error('Resource creation failed:', error);
    throw error;
  }
};

export { createResource };
```

### Code example (transferring ownership)

```js
// lib/resource/ownershipTransfer.js

const transferOwnership = async (resourceId, newOwnerId, currentUserId) => {
  try {
    // Verify current ownership
    const { owned } = await verifyOwnership(currentUserId, resourceCollectionId, resourceId);
    
    if (!owned) {
      throw new Error('Only resource owner can transfer ownership');
    }
    
    // Transfer ownership
    const updated = await databases.updateDocument(
      databaseId,
      resourceCollectionId,
      resourceId,
      {
        userId: newOwnerId,
        ownershipTransferredAt: new Date().toISOString(),
        previousOwnerId: currentUserId,
      }
    );
    
    // Log transfer
    await databases.createDocument(
      databaseId,
      auditLogCollectionId,
      ID.unique(),
      {
        action: 'ownership_transfer',
        resourceId,
        fromUserId: currentUserId,
        toUserId: newOwnerId,
        timestamp: new Date().toISOString(),
      }
    );
    
    return updated;
  } catch (error) {
    console.error('Ownership transfer failed:', error);
    throw error;
  }
};

export { transferOwnership };
```

### Code example (sharing resource)

```js
// lib/resource/resourceSharing.js

const shareResource = async (resourceId, shareWithUserId, currentUserId) => {
  try {
    // Verify ownership
    const { owned } = await verifyOwnership(currentUserId, resourceCollectionId, resourceId);
    
    if (!owned) {
      throw new Error('Only resource owner can share');
    }
    
    // Get current resource
    const resource = await databases.getDocument(
      databaseId,
      resourceCollectionId,
      resourceId
    );
    
    // Add to shared list
    const sharedWith = resource.sharedWith || [];
    if (!sharedWith.includes(shareWithUserId)) {
      sharedWith.push(shareWithUserId);
    }
    
    // Update resource
    const updated = await databases.updateDocument(
      databaseId,
      resourceCollectionId,
      resourceId,
      { sharedWith }
    );
    
    return updated;
  } catch (error) {
    console.error('Resource sharing failed:', error);
    throw error;
  }
};

export { shareResource };
```

### Tests

* Verify ownership checks work correctly
* Test shared resource access
* Check ownership transfer works
* Verify sharing functionality

---

## 4) Team/organization access

**Location:** Team membership functions, team-based permissions
**Expected**: Access to resources is controlled by team membership and roles

### Steps

1. **Define team structure:**
   * Teams have members with roles
   * Roles: owner, admin, member, guest
   * Teams can own resources
   * Resources can be team-specific

2. **Implement team membership:**
   * Add users to teams
   * Assign roles within teams
   * Handle team membership changes
   * Support team creation/deletion

3. **Implement team-based access:**
   * Check team membership
   * Verify team role permissions
   * Support team resource access
   * Handle team ownership

### Code example (team membership check)

```js
// lib/auth/teamMembership.js

const TEAM_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  GUEST: 'guest',
};

const getTeamMembership = async (userId, teamId) => {
  try {
    const memberships = await databases.listDocuments(
      databaseId,
      teamMembershipCollectionId,
      [
        Query.equal('userId', userId),
        Query.equal('teamId', teamId)
      ]
    );
    
    if (memberships.total === 0) {
      return null;
    }
    
    return memberships.documents[0];
  } catch (error) {
    console.error('Team membership check failed:', error);
    return null;
  }
};

const isTeamMember = async (userId, teamId) => {
  const membership = await getTeamMembership(userId, teamId);
  return membership !== null;
};

const hasTeamRole = async (userId, teamId, requiredRole) => {
  const membership = await getTeamMembership(userId, teamId);
  
  if (!membership) {
    return false;
  }
  
  const roleHierarchy = {
    [TEAM_ROLES.OWNER]: 4,
    [TEAM_ROLES.ADMIN]: 3,
    [TEAM_ROLES.MEMBER]: 2,
    [TEAM_ROLES.GUEST]: 1,
  };
  
  const userLevel = roleHierarchy[membership.role] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

export { TEAM_ROLES, getTeamMembership, isTeamMember, hasTeamRole };
```

### Code example (team-based authorization)

```js
// lib/auth/teamAuthorization.js

import { hasTeamRole, TEAM_ROLES } from './teamMembership';

const requireTeamMembership = (teamId) => {
  return async (userId) => {
    const isMember = await isTeamMember(userId, teamId);
    
    if (!isMember) {
      throw new Error('Team membership required');
    }
  };
};

const requireTeamRole = (teamId, requiredRole) => {
  return async (userId) => {
    const hasRole = await hasTeamRole(userId, teamId, requiredRole);
    
    if (!hasRole) {
      throw new Error(`Team role ${requiredRole} required`);
    }
  };
};

const requireTeamAdmin = (teamId) => {
  return requireTeamRole(teamId, TEAM_ROLES.ADMIN);
};

const requireTeamOwner = (teamId) => {
  return requireTeamRole(teamId, TEAM_ROLES.OWNER);
};

export { 
  requireTeamMembership, 
  requireTeamRole, 
  requireTeamAdmin, 
  requireTeamOwner 
};
```

### Code example (team resource access)

```js
// lib/auth/teamResourceAccess.js

const canAccessTeamResource = async (userId, resource) => {
  if (!resource.teamId) {
    // Not a team resource, check individual ownership
    return resource.userId === userId;
  }
  
  // Check team membership
  const membership = await getTeamMembership(userId, resource.teamId);
  
  if (!membership) {
    return false;
  }
  
  // Check if resource requires specific role
  if (resource.requiredTeamRole) {
    const hasRole = await hasTeamRole(userId, resource.teamId, resource.requiredTeamRole);
    return hasRole;
  }
  
  // Default: any team member can access
  return true;
};

export { canAccessTeamResource };
```

### Code example (team creation)

```js
// lib/team/teamManager.js

const createTeam = async (name, ownerId) => {
  try {
    // Create team
    const team = await databases.createDocument(
      databaseId,
      teamCollectionId,
      ID.unique(),
      {
        name,
        ownerId,
        createdAt: new Date().toISOString(),
      }
    );
    
    // Add owner as team member
    await databases.createDocument(
      databaseId,
      teamMembershipCollectionId,
      ID.unique(),
      {
        teamId: team.$id,
        userId: ownerId,
        role: TEAM_ROLES.OWNER,
        joinedAt: new Date().toISOString(),
      }
    );
    
    return team;
  } catch (error) {
    console.error('Team creation failed:', error);
    throw error;
  }
};

const addTeamMember = async (teamId, userId, role = TEAM_ROLES.MEMBER, addedBy) => {
  try {
    // Verify adder has permission
    const adderMembership = await getTeamMembership(addedBy, teamId);
    
    if (!adderMembership || 
        ![TEAM_ROLES.OWNER, TEAM_ROLES.ADMIN].includes(adderMembership.role)) {
      throw new Error('Only team owners and admins can add members');
    }
    
    // Check if user is already a member
    const existing = await getTeamMembership(userId, teamId);
    if (existing) {
      throw new Error('User is already a team member');
    }
    
    // Add member
    const membership = await databases.createDocument(
      databaseId,
      teamMembershipCollectionId,
      ID.unique(),
      {
        teamId,
        userId,
        role,
        addedBy,
        joinedAt: new Date().toISOString(),
      }
    );
    
    return membership;
  } catch (error) {
    console.error('Adding team member failed:', error);
    throw error;
  }
};

export { createTeam, addTeamMember };
```

### Tests

* Verify team membership checks work
* Test team role hierarchy
* Check team resource access
* Verify team creation and member addition

---

## 5) Document-level security implementation

**Location:** Document creation/update functions, permission checks
**Expected**: Individual documents have fine-grained access control

### Steps

1. **Set document-level permissions:**
   * Use `Role:member` for owner-only access
   * Use `Role:user/[userId]` for specific user access
   * Use `Role:team/[teamId]` for team access
   * Combine multiple permission types

2. **Implement permission inheritance:**
   * Inherit from collection permissions
   * Override with document permissions
   * Support permission combinations
   * Handle permission conflicts

3. **Manage document permissions:**
   * Add permissions on creation
   * Update permissions dynamically
   * Remove permissions when needed
   * Audit permission changes

### Code example (document with owner permissions)

```js
// lib/document/secureDocumentCreator.js

const createSecureDocument = async (collectionId, data, userId) => {
  try {
    const documentData = {
      ...data,
      userId, // Track owner
      createdAt: new Date().toISOString(),
    };
    
    // Create document with owner-only permissions
    const document = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      documentData,
      // Document-level permissions
      [
        'read("member")',   // Only owner can read
        'update("member")', // Only owner can update
        'delete("member")', // Only owner can delete
      ]
    );
    
    return document;
  } catch (error) {
    console.error('Secure document creation failed:', error);
    throw error;
  }
};
```

### Code example (document with team permissions)

```js
// lib/document/teamDocumentCreator.js

const createTeamDocument = async (collectionId, data, teamId) => {
  try {
    const documentData = {
      ...data,
      teamId, // Track team ownership
      createdAt: new Date().toISOString(),
    };
    
    // Create document with team permissions
    const document = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      documentData,
      // Team-based permissions
      [
        'read("team:' + teamId + '")',    // Team members can read
        'update("team:' + teamId + '")',  // Team members can update
        'delete("team:' + teamId + '")',  // Team members can delete
      ]
    );
    
    return document;
  } catch (error) {
    console.error('Team document creation failed:', error);
    throw error;
  }
};
```

### Code example (document with custom permissions)

```js
// lib/document/customPermissions.js

const createDocumentWithCustomPermissions = async (
  collectionId, 
  data, 
  permissions
) => {
  try {
    const documentData = {
      ...data,
      createdAt: new Date().toISOString(),
    };
    
    // Build permission array
    const permissionArray = [];
    
    // Add owner permissions
    if (permissions.owner) {
      permissionArray.push('read("member")');
      permissionArray.push('update("member")');
      permissionArray.push('delete("member")');
    }
    
    // Add specific user permissions
    if (permissions.users) {
      permissions.users.forEach(userId => {
        permissionArray.push(`read("user:${userId}")`);
        if (permissions.writeAccess) {
          permissionArray.push(`update("user:${userId}")`);
        }
      });
    }
    
    // Add team permissions
    if (permissions.teams) {
      permissions.teams.forEach(teamId => {
        permissionArray.push(`read("team:${teamId}")`);
        if (permissions.writeAccess) {
          permissionArray.push(`update("team:${teamId}")`);
        }
      });
    }
    
    // Create document
    const document = await databases.createDocument(
      databaseId,
      collectionId,
      ID.unique(),
      documentData,
      permissionArray
    );
    
    return document;
  } catch (error) {
    console.error('Custom permission document creation failed:', error);
    throw error;
  }
};
```

### Code example (updating document permissions)

```js
// lib/document/permissionUpdater.js

const updateDocumentPermissions = async (
  collectionId, 
  documentId, 
  newPermissions
) => {
  try {
    // Get current document
    const document = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    );
    
    // Build new permission array
    const permissionArray = [];
    
    // Preserve owner permissions
    permissionArray.push('read("member")');
    permissionArray.push('update("member")');
    permissionArray.push('delete("member")');
    
    // Add new user permissions
    if (newPermissions.users) {
      newPermissions.users.forEach(userId => {
        permissionArray.push(`read("user:${userId}")`);
        if (newPermissions.writeAccess) {
          permissionArray.push(`update("user:${userId}")`);
        }
      });
    }
    
    // Add new team permissions
    if (newPermissions.teams) {
      newPermissions.teams.forEach(teamId => {
        permissionArray.push(`read("team:${teamId}")`);
        if (newPermissions.writeAccess) {
          permissionArray.push(`update("team:${teamId}")`);
        }
      });
    }
    
    // Update document
    const updated = await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      {}, // No data changes
      permissionArray
    );
    
    // Log permission change
    await databases.createDocument(
      databaseId,
      auditLogCollectionId,
      ID.unique(),
      {
        action: 'permission_update',
        documentId,
        oldPermissions: document.$permissions,
        newPermissions: permissionArray,
        timestamp: new Date().toISOString(),
      }
    );
    
    return updated;
  } catch (error) {
    console.error('Document permission update failed:', error);
    throw error;
  }
};

export { updateDocumentPermissions };
```

### Code example (sharing document with user)

```js
// lib/document/documentSharing.js

const shareDocumentWithUser = async (
  collectionId, 
  documentId, 
  userId, 
  writeAccess = false
) => {
  try {
    // Get current document
    const document = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    );
    
    // Build new permissions
    const newPermissions = [...document.$permissions];
    
    // Add user read permission
    newPermissions.push(`read("user:${userId}")`);
    
    // Add write permission if requested
    if (writeAccess) {
      newPermissions.push(`update("user:${userId}")`);
    }
    
    // Update document
    const updated = await databases.updateDocument(
      databaseId,
      collectionId,
      documentId,
      {},
      newPermissions
    );
    
    return updated;
  } catch (error) {
    console.error('Document sharing failed:', error);
    throw error;
  }
};

export { shareDocumentWithUser };
```

### Code example (checking document access)

```js
// lib/document/documentAccessChecker.js

const canAccessDocument = async (userId, collectionId, documentId) => {
  try {
    const document = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    );
    
    // Check if user is owner
    if (document.userId === userId) {
      return { allowed: true, reason: 'owner' };
    }
    
    // Check document permissions
    const permissions = document.$permissions || [];
    
    // Check for user-specific permission
    const hasUserPermission = permissions.some(perm => 
      perm.includes(`user:${userId}`)
    );
    
    if (hasUserPermission) {
      return { allowed: true, reason: 'user_permission' };
    }
    
    // Check for team permission
    const userTeams = await databases.listDocuments(
      databaseId,
      teamMembershipCollectionId,
      [Query.equal('userId', userId)]
    );
    
    for (const membership of userTeams.documents) {
      const hasTeamPermission = permissions.some(perm => 
        perm.includes(`team:${membership.teamId}`)
      );
      
      if (hasTeamPermission) {
        return { allowed: true, reason: 'team_permission' };
      }
    }
    
    return { allowed: false, reason: 'no_permission' };
  } catch (error) {
    console.error('Document access check failed:', error);
    return { allowed: false, reason: 'error' };
  }
};

export { canAccessDocument };
```

### Tests

* Verify document-level permissions work
* Test permission updates
* Check document sharing functionality
* Verify access checks work correctly

---

## 6) Authorization audit logging

**Location**: Audit log collection, logging functions
**Expected**: All authorization decisions are logged for security auditing

### Code example (audit logger)

```js
// lib/auth/auditLogger.js

const logAuthorizationEvent = async (event) => {
  try {
    await databases.createDocument(
      databaseId,
      auditLogCollectionId,
      ID.unique(),
      {
        ...event,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error('Audit logging failed:', error);
  }
};

const logAccessGranted = async (userId, resource, action) => {
  await logAuthorizationEvent({
    type: 'access_granted',
    userId,
    resource,
    action,
  });
};

const logAccessDenied = async (userId, resource, action, reason) => {
  await logAuthorizationEvent({
    type: 'access_denied',
    userId,
    resource,
    action,
    reason,
  });
};

const logPermissionChange = async (userId, resource, oldPermissions, newPermissions, changedBy) => {
  await logAuthorizationEvent({
    type: 'permission_change',
    userId,
    resource,
    oldPermissions,
    newPermissions,
    changedBy,
  });
};

export { 
  logAuthorizationEvent, 
  logAccessGranted, 
  logAccessDenied, 
  logPermissionChange 
};
```

### Code example (authorization with audit logging)

```js
// lib/auth/authorizedOperation.js

import { logAccessGranted, logAccessDenied } from './auditLogger';

const performAuthorizedOperation = async (
  userId, 
  resource, 
  action, 
  operation
) => {
  try {
    // Check authorization
    const { allowed, reason } = await canAccessDocument(userId, resource.collectionId, resource.documentId);
    
    if (!allowed) {
      await logAccessDenied(userId, resource, action, reason);
      throw new Error('Access denied');
    }
    
    // Perform operation
    const result = await operation();
    
    // Log success
    await logAccessGranted(userId, resource, action);
    
    return result;
  } catch (error) {
    console.error('Authorized operation failed:', error);
    throw error;
  }
};

export { performAuthorizedOperation };
```

### Tests

* Verify audit logs are created
* Check access denied events are logged
* Verify permission changes are logged
* Test audit log query functionality

---

## 7) Grep / codemod hints

* Find missing authorization checks: `rg "createDocument|updateDocument|deleteDocument" -n | rg -v "permission|auth|role"`
* Find hardcoded user IDs: `rg "userId.*=.*['\"][^'\"]+['\"]" -n`
* Find missing ownership checks: `rg "userId" -n | rg -v "verify|check|ownership"`
* Find role assignments without logging: `rg "role.*=" -n | rg -v "log|audit"`

---

## 8) Update changelog

After implementing authorization checks, update `DOCS/ChangeLog.md` with:
- Permission validation patterns implemented
- Role-based access control added
- Resource ownership verification implemented
- Team/organization access controls added
- Document-level security implemented
- Audit logging for authorization decisions
- Any breaking changes to access control
