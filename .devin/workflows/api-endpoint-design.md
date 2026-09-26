---
description: API Endpoint Design - RESTful patterns, Request/response standards, HTTP status codes, Versioning, Rate limiting
auto_execution_mode: 3
---

# Junior Dev Checklist — API Endpoint Design

Comprehensive guide for designing and implementing RESTful API endpoints. Ensures consistency, maintainability, and proper HTTP semantics across all API implementations.

---

## Quick expectations

* **RESTful design**: Use proper HTTP methods, resource-based URLs, and standard patterns
* **Request/response structure**: Consistent JSON structure with proper metadata
* **HTTP status codes**: Appropriate status codes for different scenarios
* **API versioning**: Clear versioning strategy to handle breaking changes
* **Rate limiting**: Protect endpoints from abuse with rate limiting
* **Documentation**: Clear API documentation for all endpoints

---

## 1) RESTful API design patterns

**Location:** API route definitions, Appwrite functions, service layer
**Expected:** Endpoints follow REST principles with proper resource naming and HTTP methods

### Steps

1. **Use resource-based URLs:**
   * Use nouns for resources (not verbs)
   * Use plural nouns for collections
   * Nest resources logically
   * Keep URLs hierarchical

2. **Use appropriate HTTP methods:**
   * GET: Retrieve resources
   * POST: Create resources
   * PUT: Update/replace resources
   * PATCH: Partially update resources
   * DELETE: Remove resources

3. **Use query parameters for filtering:**
   * Filter results with query params
   * Use pagination for large datasets
   * Support sorting with query params
   * Use field selection for partial responses

### Code example (RESTful endpoint patterns)

```js
// lib/api/routes.js

// Resource-based URL patterns
const routes = {
  // Users
  'GET /api/v1/users': 'List all users',
  'GET /api/v1/users/:id': 'Get specific user',
  'POST /api/v1/users': 'Create new user',
  'PUT /api/v1/users/:id': 'Replace user',
  'PATCH /api/v1/users/:id': 'Partially update user',
  'DELETE /api/v1/users/:id': 'Delete user',
  
  // Nested resources
  'GET /api/v1/users/:id/sessions': 'List user sessions',
  'POST /api/v1/users/:id/sessions': 'Create session for user',
  'GET /api/v1/users/:id/sessions/:sessionId': 'Get specific session',
  
  // Sessions (standalone)
  'GET /api/v1/sessions': 'List all sessions',
  'GET /api/v1/sessions/:id': 'Get specific session',
  'POST /api/v1/sessions': 'Create session',
  'PATCH /api/v1/sessions/:id': 'Update session',
  'DELETE /api/v1/sessions/:id': 'Delete session',
  
  // Messages (nested under sessions)
  'GET /api/v1/sessions/:sessionId/messages': 'List session messages',
  'POST /api/v1/sessions/:sessionId/messages': 'Send message',
  'GET /api/v1/sessions/:sessionId/messages/:messageId': 'Get specific message',
};
```

### Code example (Appwrite function with RESTful design)

```js
// functions/api/users/index.js

export default async ({ req, res, log, error }) => {
  const { method } = req;
  const { id } = req.path.split('/').pop();
  
  try {
    switch (method) {
      case 'GET':
        if (id) {
          return await getUser(id);
        } else {
          return await listUsers(req.query);
        }
      case 'POST':
        return await createUser(req.body);
      case 'PUT':
        return await replaceUser(id, req.body);
      case 'PATCH':
        return await updateUser(id, req.body);
      case 'DELETE':
        return await deleteUser(id);
      default:
        return res.json({ error: 'Method not allowed' }, 405);
    }
  } catch (err) {
    error('API error:', err);
    return res.json({ error: 'Internal server error' }, 500);
  }
};

const getUser = async (userId) => {
  const user = await databases.getDocument(
    databaseId,
    userCollectionId,
    userId
  );
  return res.json(user, 200);
};

const listUsers = async (query) => {
  const { limit = 20, offset = 0, search } = query;
  
  const queries = [
    Query.limit(parseInt(limit)),
    Query.offset(parseInt(offset)),
  ];
  
  if (search) {
    queries.push(Query.search('username', search));
  }
  
  const response = await databases.listDocuments(
    databaseId,
    userCollectionId,
    queries
  );
  
  return res.json(response, 200);
};

const createUser = async (userData) => {
  const user = await databases.createDocument(
    databaseId,
    userCollectionId,
    ID.unique(),
    userData
  );
  return res.json(user, 201);
};

const updateUser = async (userId, updates) => {
  const user = await databases.updateDocument(
    databaseId,
    userCollectionId,
    userId,
    updates
  );
  return res.json(user, 200);
};

const deleteUser = async (userId) => {
  await databases.deleteDocument(
    databaseId,
    userCollectionId,
    userId
  );
  return res.json({ success: true }, 204);
};
```

### Code example (query parameter handling)

```js
// lib/api/queryParser.js

const parseQueryParams = (query) => {
  const params = {
    limit: 20,
    offset: 0,
    sort: 'createdAt',
    order: 'desc',
    fields: null,
    filter: {},
  };
  
  // Parse limit
  if (query.limit) {
    const limit = parseInt(query.limit);
    if (limit > 0 && limit <= 100) {
      params.limit = limit;
    }
  }
  
  // Parse offset
  if (query.offset) {
    const offset = parseInt(query.offset);
    if (offset >= 0) {
      params.offset = offset;
    }
  }
  
  // Parse sort
  if (query.sort) {
    params.sort = query.sort;
  }
  
  // Parse order
  if (query.order && ['asc', 'desc'].includes(query.order.toLowerCase())) {
    params.order = query.order.toLowerCase();
  }
  
  // Parse field selection
  if (query.fields) {
    params.fields = query.fields.split(',');
  }
  
  // Parse filters
  Object.keys(query).forEach(key => {
    if (!['limit', 'offset', 'sort', 'order', 'fields'].includes(key)) {
      params.filter[key] = query[key];
    }
  });
  
  return params;
};

export { parseQueryParams };
```

### Code example (pagination)

```js
// lib/api/pagination.js

const buildPaginationResponse = (documents, total, limit, offset) => {
  return {
    data: documents,
    meta: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    },
    links: {
      self: `/api/v1/resource?limit=${limit}&offset=${offset}`,
      first: `/api/v1/resource?limit=${limit}&offset=0`,
      last: `/api/v1/resource?limit=${limit}&offset=${Math.floor((total - 1) / limit) * limit}`,
      next: offset + limit < total 
        ? `/api/v1/resource?limit=${limit}&offset=${offset + limit}`
        : null,
      prev: offset > 0
        ? `/api/v1/resource?limit=${limit}&offset=${Math.max(0, offset - limit)}`
        : null,
    },
  };
};

export { buildPaginationResponse };
```

### Tests

* Verify HTTP methods are used correctly
* Test URL patterns follow REST conventions
* Check query parameters are parsed correctly
* Verify pagination works as expected

---

## 2) Request/response structure standards

**Location:** All API endpoints
**Expected:** Consistent JSON structure with proper metadata and error handling

### Steps

1. **Define standard request structure:**
   * Use JSON for request bodies
   * Validate request structure
   * Use consistent field names
   * Support content negotiation

2. **Define standard response structure:**
   * Include data and metadata
   * Use consistent field names
   * Include pagination info
   * Provide error details

3. **Handle errors consistently:**
   * Use standard error format
   * Include error codes
   * Provide helpful messages
   * Log errors for debugging

### Code example (standard request structure)

```js
// lib/api/requestValidator.js

const validateRequest = (schema, data) => {
  const errors = [];
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }
    
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be ${rules.type}`);
    }
    
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${field} must be at least ${rules.min}`);
    }
    
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${field} must be at most ${rules.max}`);
    }
    
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} has invalid format`);
    }
  }
  
  return errors;
};

export { validateRequest };
```

### Code example (standard response structure)

```js
// lib/api/responseBuilder.js

const buildSuccessResponse = (data, meta = {}) => {
  return {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
};

const buildErrorResponse = (error, statusCode = 500) => {
  return {
    success: false,
    error: {
      code: error.code || 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
      details: error.details || null,
    },
    timestamp: new Date().toISOString(),
  };
};

const buildPaginatedResponse = (data, pagination) => {
  return {
    success: true,
    data: data.documents,
    meta: {
      total: data.total,
      limit: pagination.limit,
      offset: pagination.offset,
      hasMore: pagination.hasMore,
    },
    links: pagination.links,
    timestamp: new Date().toISOString(),
  };
};

export { buildSuccessResponse, buildErrorResponse, buildPaginatedResponse };
```

### Code example (using response builders)

```js
// functions/api/sessions/index.js
import { buildSuccessResponse, buildErrorResponse, buildPaginatedResponse } from '../../../lib/api/responseBuilder';
import { parseQueryParams } from '../../../lib/api/queryParser';

export default async ({ req, res, log, error }) => {
  try {
    const params = parseQueryParams(req.query);
    
    const queries = [
      Query.limit(params.limit),
      Query.offset(params.offset),
    ];
    
    const response = await databases.listDocuments(
      databaseId,
      sessionCollectionId,
      queries
    );
    
    const pagination = {
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + params.limit < response.total,
      links: {
        self: `/api/v1/sessions?limit=${params.limit}&offset=${params.offset}`,
        next: params.offset + params.limit < response.total
          ? `/api/v1/sessions?limit=${params.limit}&offset=${params.offset + params.limit}`
          : null,
      },
    };
    
    return res.json(buildPaginatedResponse(response, pagination), 200);
  } catch (err) {
    error('Failed to list sessions:', err);
    return res.json(buildErrorResponse(err), 500);
  }
};
```

### Code example (error response structure)

```js
// lib/api/errors.js

class APIError extends Error {
  constructor(code, message, details = null, statusCode = 500) {
    super(message);
    this.code = code;
    this.details = details;
    this.statusCode = statusCode;
  }
}

const errors = {
  VALIDATION_ERROR: (details) => new APIError('VALIDATION_ERROR', 'Invalid request data', details, 400),
  NOT_FOUND: (resource) => new APIError('NOT_FOUND', `${resource} not found`, null, 404),
  UNAUTHORIZED: () => new APIError('UNAUTHORIZED', 'Authentication required', null, 401),
  FORBIDDEN: () => new APIError('FORBIDDEN', 'Access denied', null, 403),
  CONFLICT: (details) => new APIError('CONFLICT', 'Resource conflict', details, 409),
  RATE_LIMIT_EXCEEDED: () => new APIError('RATE_LIMIT_EXCEEDED', 'Too many requests', null, 429),
  INTERNAL_ERROR: () => new APIError('INTERNAL_ERROR', 'Internal server error', null, 500),
};

export { APIError, errors };
```

### Code example (using error classes)

```js
// functions/api/users/create.js
import { errors } from '../../../lib/api/errors';
import { buildErrorResponse } from '../../../lib/api/responseBuilder';

export default async ({ req, res, log, error }) => {
  try {
    const userData = JSON.parse(req.body);
    
    // Validate input
    if (!userData.email || !userData.username) {
      throw errors.VALIDATION_ERROR({ missing: ['email', 'username'] });
    }
    
    // Check if user already exists
    const existing = await databases.listDocuments(
      databaseId,
      userCollectionId,
      [Query.equal('email', userData.email)]
    );
    
    if (existing.total > 0) {
      throw errors.CONFLICT({ field: 'email', message: 'Email already exists' });
    }
    
    // Create user
    const user = await databases.createDocument(
      databaseId,
      userCollectionId,
      ID.unique(),
      userData
    );
    
    return res.json({ success: true, data: user }, 201);
  } catch (err) {
    error('User creation failed:', err);
    return res.json(buildErrorResponse(err), err.statusCode || 500);
  }
};
```

### Tests

* Verify success responses have correct structure
* Test error responses include proper error codes
* Check pagination metadata is correct
* Verify timestamps are included in responses

---

## 3) HTTP status code conventions

**Location:** All API endpoints
**Expected:** Appropriate HTTP status codes for different scenarios

### Steps

1. **Use standard status codes:**
   * 2xx: Success
   * 3xx: Redirection
   * 4xx: Client errors
   * 5xx: Server errors

2. **Choose specific codes:**
   * 200: OK (successful GET, PUT, PATCH)
   * 201: Created (successful POST)
   * 204: No Content (successful DELETE)
   * 400: Bad Request (invalid input)
   * 401: Unauthorized (authentication required)
   * 403: Forbidden (authorization failed)
   * 404: Not Found (resource doesn't exist)
   * 409: Conflict (resource already exists)
   * 429: Too Many Requests (rate limit exceeded)
   * 500: Internal Server Error (unexpected error)

### Code example (status code mapping)

```js
// lib/api/statusCodes.js

const statusCodes = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Redirection
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  NOT_MODIFIED: 304,
  
  // Client errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
};

const getStatusCodeForError = (error) => {
  if (error.code === 'VALIDATION_ERROR') return statusCodes.BAD_REQUEST;
  if (error.code === 'NOT_FOUND') return statusCodes.NOT_FOUND;
  if (error.code === 'UNAUTHORIZED') return statusCodes.UNAUTHORIZED;
  if (error.code === 'FORBIDDEN') return statusCodes.FORBIDDEN;
  if (error.code === 'CONFLICT') return statusCodes.CONFLICT;
  if (error.code === 'RATE_LIMIT_EXCEEDED') return statusCodes.TOO_MANY_REQUESTS;
  return statusCodes.INTERNAL_SERVER_ERROR;
};

export { statusCodes, getStatusCodeForError };
```

### Code example (using status codes)

```js
// functions/api/sessions/[id].js
import { statusCodes, getStatusCodeForError } from '../../../lib/api/statusCodes';

export default async ({ req, res, log, error }) => {
  const sessionId = req.path.split('/').pop();
  
  try {
    const session = await databases.getDocument(
      databaseId,
      sessionCollectionId,
      sessionId
    );
    
    return res.json(session, statusCodes.OK);
  } catch (err) {
    if (err.code === 404) {
      return res.json(
        { error: 'Session not found' },
        statusCodes.NOT_FOUND
      );
    }
    
    error('Failed to get session:', err);
    return res.json(
      { error: 'Internal server error' },
      statusCodes.INTERNAL_SERVER_ERROR
    );
  }
};
```

### Code example (status code decision tree)

```js
// lib/api/responseHandler.js

const handleResponse = (result, res) => {
  if (result.success) {
    const statusCode = result.created ? 201 : 200;
    return res.json(result, statusCode);
  }
  
  const statusCode = getStatusCodeForError(result.error);
  return res.json(result, statusCode);
};

// Usage
const result = await someOperation();
handleResponse(result, res);
```

### Tests

* Verify correct status codes for success scenarios
* Test status codes for different error types
* Check 404 for missing resources
* Verify 401 for unauthenticated requests
* Test 403 for unauthorized requests

---

## 4) API versioning strategy

**Location:** API route definitions, documentation
**Expected:** Clear versioning strategy to handle breaking changes

### Steps

1. **Choose versioning approach:**
   * URL-based versioning (/api/v1/)
   * Header-based versioning (Accept: application/vnd.api.v1+json)
   * Query parameter versioning (?version=1)

2. **Version early:**
   * Start with v1 from the beginning
   * Document version changes
   * Maintain backward compatibility when possible
   * Deprecate old versions gracefully

3. **Handle version transitions:**
   * Support multiple versions simultaneously
   * Provide migration guides
   * Communicate deprecation timelines
   * Monitor usage of old versions

### Code example (URL-based versioning)

```js
// lib/api/versionRouter.js

const versionRoutes = {
  'v1': {
    users: '/api/v1/users',
    sessions: '/api/v1/sessions',
    messages: '/api/v1/messages',
  },
  'v2': {
    users: '/api/v2/users',
    sessions: '/api/v2/sessions',
    messages: '/api/v2/messages',
  },
};

const getRoute = (resource, version = 'v1') => {
  return versionRoutes[version]?.[resource] || null;
};

export { versionRoutes, getRoute };
```

### Code example (version-specific handlers)

```js
// functions/api/v1/users/index.js
export default async ({ req, res, log, error }) => {
  // v1 implementation
  const users = await databases.listDocuments(databaseId, userCollectionId);
  return res.json(users, 200);
};

// functions/api/v2/users/index.js
export default async ({ req, res, log, error }) => {
  // v2 implementation with enhanced features
  const params = parseQueryParams(req.query);
  const users = await databases.listDocuments(
    databaseId,
    userCollectionId,
    buildQueries(params)
  );
  return res.json(buildPaginatedResponse(users, params), 200);
};
```

### Code example (header-based versioning)

```js
// lib/api/versionDetector.js

const detectVersion = (headers) => {
  const accept = headers['accept'] || '';
  
  // Check for Accept header with version
  const versionMatch = accept.match(/application\/vnd\.api\.v(\d+)\+json/);
  if (versionMatch) {
    return `v${versionMatch[1]}`;
  }
  
  // Check for custom version header
  const versionHeader = headers['api-version'];
  if (versionHeader) {
    return versionHeader.startsWith('v') ? versionHeader : `v${versionHeader}`;
  }
  
  // Default to latest version
  return 'v1';
};

export { detectVersion };
```

### Code example (version middleware)

```js
// functions/middleware/version.js

export const versionMiddleware = (handler) => {
  return async ({ req, res, log, error }) => {
    const version = detectVersion(req.headers);
    
    // Add version to request context
    req.version = version;
    
    // Check if version is supported
    const supportedVersions = ['v1', 'v2'];
    if (!supportedVersions.includes(version)) {
      return res.json(
        { error: 'Unsupported API version', supportedVersions },
        400
      );
    }
    
    return handler({ req, res, log, error });
  };
};
```

### Code example (deprecation headers)

```js
// functions/api/v1/users/index.js

export default async ({ req, res, log, error }) => {
  // Add deprecation headers
  res.headers['Deprecation'] = 'true';
  res.headers['Sunset'] = '2026-12-31T00:00:00Z';
  res.headers['Link'] = '</api/v2/users>; rel="successor-version"';
  
  // v1 implementation
  const users = await databases.listDocuments(databaseId, userCollectionId);
  return res.json(users, 200);
};
```

### Tests

* Verify version detection works correctly
* Test version-specific route handling
* Check deprecation headers are set
* Verify unsupported versions return error

---

## 5) Rate limiting implementation

**Location:** API middleware, Appwrite functions
**Expected:** Endpoints are protected from abuse with rate limiting

### Steps

1. **Choose rate limiting strategy:**
   * Token bucket algorithm
   * Sliding window log
   * Fixed window counter
   * Leaky bucket algorithm

2. **Implement rate limiting:**
   * Use Redis for distributed rate limiting
   * Use in-memory for single-instance
   * Set appropriate limits per endpoint
   * Handle rate limit exceeded scenarios

3. **Configure rate limits:**
   * Different limits for different endpoints
   * Higher limits for authenticated users
   * Burst vs sustained rate limits
   * Whitelist trusted clients

### Code example (in-memory rate limiter)

```js
// lib/api/rateLimiter.js

class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.requests = new Map();
  }
  
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request record
    let record = this.requests.get(identifier);
    
    if (!record || record.windowStart < windowStart) {
      record = {
        windowStart: now,
        count: 0,
      };
      this.requests.set(identifier, record);
    }
    
    // Check if limit exceeded
    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        reset: record.windowStart + this.windowMs,
      };
    }
    
    // Increment count
    record.count++;
    this.requests.set(identifier, record);
    
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      reset: record.windowStart + this.windowMs,
    };
  }
  
  reset(identifier) {
    this.requests.delete(identifier);
  }
}

// Create rate limiters for different endpoints
const rateLimiters = {
  default: new RateLimiter({ windowMs: 60000, maxRequests: 100 }),
  strict: new RateLimiter({ windowMs: 60000, maxRequests: 10 }),
  upload: new RateLimiter({ windowMs: 3600000, maxRequests: 5 }),
};

export { RateLimiter, rateLimiters };
```

### Code example (rate limiting middleware)

```js
// functions/middleware/rateLimit.js

import { rateLimiters } from '../../lib/api/rateLimiter';

export const rateLimitMiddleware = (limiter = rateLimiters.default) => {
  return async ({ req, res, log, error }) => {
    // Get identifier (IP address or user ID)
    const identifier = req.headers['x-forwarded-for'] || 
                       req.headers['x-real-ip'] || 
                       req.connection.remoteAddress;
    
    // Check rate limit
    const result = limiter.isAllowed(identifier);
    
    if (!result.allowed) {
      res.headers['X-RateLimit-Limit'] = limiter.maxRequests;
      res.headers['X-RateLimit-Remaining'] = result.remaining;
      res.headers['X-RateLimit-Reset'] = new Date(result.reset).toISOString();
      res.headers['Retry-After'] = Math.ceil((result.reset - Date.now()) / 1000);
      
      return res.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        },
        429
      );
    }
    
    // Add rate limit headers
    res.headers['X-RateLimit-Limit'] = limiter.maxRequests;
    res.headers['X-RateLimit-Remaining'] = result.remaining;
    res.headers['X-RateLimit-Reset'] = new Date(result.reset).toISOString();
    
    return handler({ req, res, log, error });
  };
};
```

### Code example (using rate limiting middleware)

```js
// functions/api/users/create.js
import { rateLimitMiddleware, rateLimiters } from '../../../functions/middleware/rateLimit';

const createUserHandler = async ({ req, res, log, error }) => {
  // Create user logic
  const userData = JSON.parse(req.body);
  const user = await databases.createDocument(
    databaseId,
    userCollectionId,
    ID.unique(),
    userData
  );
  return res.json(user, 201);
};

// Apply strict rate limiting to user creation
export default rateLimitMiddleware(rateLimiters.strict)(createUserHandler);
```

### Code example (Redis-based rate limiter for production)

```js
// lib/api/redisRateLimiter.js

import Redis from 'ioredis';

class RedisRateLimiter {
  constructor(redisClient, options = {}) {
    this.redis = redisClient;
    this.windowMs = options.windowMs || 60000;
    this.maxRequests = options.maxRequests || 100;
  }
  
  async isAllowed(identifier) {
    const key = `ratelimit:${identifier}`;
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Use Redis pipeline for atomic operations
    const pipeline = this.redis.pipeline();
    
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, now, now);
    
    // Set expiration
    pipeline.expire(key, Math.ceil(this.windowMs / 1000));
    
    const results = await pipeline.exec();
    const count = results[1][1];
    
    return {
      allowed: count < this.maxRequests,
      remaining: Math.max(0, this.maxRequests - count),
      reset: now + this.windowMs,
    };
  }
}

export { RedisRateLimiter };
```

### Code example (rate limit configuration)

```js
// lib/api/rateLimitConfig.js

const rateLimitConfig = {
  '/api/v1/users': {
    GET: { windowMs: 60000, maxRequests: 100 },
    POST: { windowMs: 60000, maxRequests: 10 },
    PUT: { windowMs: 60000, maxRequests: 50 },
    DELETE: { windowMs: 60000, maxRequests: 20 },
  },
  '/api/v1/sessions': {
    GET: { windowMs: 60000, maxRequests: 200 },
    POST: { windowMs: 60000, maxRequests: 50 },
  },
  '/api/v1/upload': {
    POST: { windowMs: 3600000, maxRequests: 5 },
  },
};

export { rateLimitConfig };
```

### Tests

* Verify rate limiting blocks excessive requests
* Test rate limit headers are set correctly
* Check rate limit resets after window expires
* Verify different endpoints have different limits
* Test authenticated users have higher limits

---

## 6) API documentation

**Location:** API documentation files, inline code comments
**Expected:** Clear documentation for all API endpoints

### Code example (OpenAPI/Swagger documentation)

```yaml
# api-docs/openapi.yaml
openapi: 3.0.0
info:
  title: MyApp API
  version: 1.0.0
  description: API for MyApp application

servers:
  - url: https://api.example.com/v1
    description: Production server
  - url: https://staging-api.example.com/v1
    description: Staging server

paths:
  /users:
    get:
      summary: List all users
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            minimum: 1
            maximum: 100
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
            minimum: 0
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  success:
                    type: boolean
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  meta:
                    type: object
                    properties:
                      total:
                        type: integer
                      limit:
                        type: integer
                      offset:
                        type: integer
    post:
      summary: Create a new user
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/UserCreate'
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          description: Invalid request
        '409':
          description: User already exists

  /users/{id}:
    get:
      summary: Get a specific user
      operationId: getUser
      tags:
        - Users
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '404':
          description: User not found

components:
  schemas:
    User:
      type: object
      properties:
        $id:
          type: string
        username:
          type: string
        email:
          type: string
          format: email
        BioBlock:
          type: string
        PersonalityTag:
          type: string
        HobbyList:
          type: array
          items:
            type: string
    
    UserCreate:
      type: object
      required:
        - username
        - email
      properties:
        username:
          type: string
          minLength: 3
          maxLength: 30
        email:
          type: string
          format: email
        BioBlock:
          type: string
          maxLength: 500
```

### Code example (inline documentation)

```js
/**
 * @api {get} /api/v1/users List all users
 * @apiName ListUsers
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiParam {Number} [limit=20] Maximum number of results (1-100)
 * @apiParam {Number} [offset=0] Number of results to skip
 * @apiParam {String} [search] Search term for username
 *
 * @apiSuccess {Object[]} data Array of users
 * @apiSuccess {String} data.$id User ID
 * @apiSuccess {String} data.username Username
 * @apiSuccess {String} data.email Email address
 * @apiSuccess {Object} meta Pagination metadata
 * @apiSuccess {Number} meta.total Total number of users
 * @apiSuccess {Number} meta.limit Current limit
 * @apiSuccess {Number} meta.offset Current offset
 *
 * @apiSuccessExample Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "data": [...],
 *       "meta": {
 *         "total": 100,
 *         "limit": 20,
 *         "offset": 0
 *       }
 *     }
 *
 * @apiError (400) BadRequest Invalid parameters
 * @apiError (500) InternalError Server error
 */
export default async ({ req, res, log, error }) => {
  // Implementation
};
```

### Tests

* Verify documentation matches implementation
* Test examples in documentation work correctly
* Check all endpoints are documented
* Verify error responses are documented

---

## 7) Grep / codemod hints

* Find non-RESTful URLs: `rg "(get|create|update|delete)/" -n`
* Find missing status codes: `rg "res\.json\(" -n | rg -v "200|201|204|400|401|403|404|409|429|500"`
* Find inconsistent response structures: `rg "res\.json\(" -n`
* Find unversioned API routes: `rg "/api/" -n | rg -v "/api/v[0-9]"`

---

## 8) Update changelog

After implementing API design patterns, update `DOCS/ChangeLog.md` with:
- RESTful endpoint patterns implemented
- Request/response structure standards established
- HTTP status code conventions adopted
- API versioning strategy implemented
- Rate limiting middleware added
- API documentation created
- Any breaking changes to existing APIs
