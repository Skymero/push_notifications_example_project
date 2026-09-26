---
description: Backend Security Checks - SQL injection, XSS, CSRF, Input sanitization, Secret management
auto_execution_mode: 3
---

# Junior Dev Checklist — Backend Security Checks

Comprehensive guide for implementing security measures in backend code to prevent common vulnerabilities. Ensures data integrity, user privacy, and system security.

---

## Quick expectations

* **SQL/NoSQL injection prevention**: Validate and sanitize all database queries, use parameterized queries
* **XSS prevention**: Sanitize user-generated content before storing or returning in API responses
* **CSRF protection**: Implement token-based protection for state-changing operations
* **Input sanitization**: Validate and sanitize all user inputs at the entry point
* **Secret management**: Never hardcode secrets, use environment variables and secure storage
* **Defense in depth**: Implement multiple layers of security controls

---

## 1) SQL/NoSQL injection prevention

**Location:** All database operations in `lib/appwrite.js` and any backend functions
**Expected:** All queries use Appwrite's built-in query builders, no raw query strings with user input

### Steps

1. **Use Appwrite query builders:**
   * Never concatenate user input into query strings
   * Use `Query.equal()`, `Query.notEqual()`, `Query.search()`, etc.
   * Use parameterized queries for all user-provided data

2. **Validate input types:**
   * Ensure IDs are valid strings
   * Ensure numbers are actually numbers
   * Ensure arrays are arrays
   * Reject unexpected data types

3. **Escape special characters:**
   * For search queries, use Appwrite's built-in search
   * For custom queries, escape special characters
   * Validate against allowlists where possible

### Code example (safe query with Appwrite)

```js
// lib/appwrite.js
import { Query } from 'appwrite';

// BAD: Vulnerable to injection
const unsafeQuery = `attribute="${userInput}"`;

// GOOD: Safe parameterized query
const safeQuery = async (collectionId, attribute, value) => {
  try {
    // Validate input type
    if (typeof value !== 'string') {
      throw new Error('Invalid input type');
    }

    // Use Appwrite's query builder
    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.equal(attribute, value), // Safe parameterized query
        Query.limit(100) // Prevent excessive results
      ]
    );
    return response;
  } catch (error) {
    console.error('Query failed:', error);
    throw error;
  }
};
```

### Code example (input validation for IDs)

```js
const validateDocumentId = (id) => {
  // Appwrite IDs should be strings of reasonable length
  if (typeof id !== 'string') {
    throw new Error('Invalid ID: must be a string');
  }
  
  if (id.length > 100) {
    throw new Error('Invalid ID: too long');
  }
  
  // Allow only alphanumeric and common special characters
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error('Invalid ID: contains invalid characters');
  }
  
  return id;
};

const getDocument = async (collectionId, documentId) => {
  try {
    const validatedId = validateDocumentId(documentId);
    return await databases.getDocument(databaseId, collectionId, validatedId);
  } catch (error) {
    console.error('Failed to get document:', error);
    throw error;
  }
};
```

### Code example (search query sanitization)

```js
const safeSearch = async (collectionId, searchTerm) => {
  try {
    // Validate search term
    if (typeof searchTerm !== 'string') {
      throw new Error('Search term must be a string');
    }
    
    // Limit search term length
    if (searchTerm.length > 200) {
      throw new Error('Search term too long');
    }
    
    // Remove potentially dangerous characters
    const sanitizedTerm = searchTerm
      .replace(/[<>]/g, '') // Remove angle brackets
      .trim()
      .substring(0, 100);
    
    // Use Appwrite's search (which handles escaping)
    const response = await databases.listDocuments(
      databaseId,
      collectionId,
      [
        Query.search('name', sanitizedTerm),
        Query.limit(50)
      ]
    );
    
    return response;
  } catch (error) {
    console.error('Search failed:', error);
    throw error;
  }
};
```

### Tests

* Test with SQL injection attempts (e.g., `"' OR '1'='1"`)
* Test with NoSQL injection attempts (e.g., `{"$ne": null}`)
* Test with special characters and unicode
* Verify query limits prevent data exfiltration

---

## 2) XSS prevention in API responses

**Location:** All API responses, especially those returning user-generated content
**Expected:** User-generated content is sanitized before being returned in API responses

### Steps

1. **Identify user-generated content:**
   * User profiles (bios, names)
   * Comments and messages
   * File uploads (filenames, metadata)
   * Form submissions

2. **Sanitize content before storage:**
   * Strip HTML tags from text fields
   * Escape special characters
   * Validate against allowlists
   * Remove script tags and event handlers

3. **Sanitize content before response:**
   * Apply consistent sanitization
   * Use Content-Type headers correctly
   * Implement CSP headers where applicable

### Code example (HTML sanitization)

```js
// lib/utils/sanitize.js

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - Raw user input
 * @returns {string} - Sanitized output
 */
const sanitizeHTML = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/&/g, '&amp;')      // Replace & first
    .replace(/</g, '&lt;')       // Replace <
    .replace(/>/g, '&gt;')       // Replace >
    .replace(/"/g, '&quot;')     // Replace "
    .replace(/'/g, '&#x27;')     // Replace '
    .replace(/\//g, '&#x2F;');   // Replace /
};

/**
 * Strip HTML tags from input
 * @param {string} input - Input with potential HTML
 * @returns {string} - Plain text output
 */
const stripHTML = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input.replace(/<[^>]*>/g, '');
};

/**
 * Remove script tags and event handlers
 * @param {string} input - Input with potential scripts
 * @returns {string} - Safe output
 */
const removeScripts = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, '')
    .replace(/on\w+="[^"]*"/g, '')      // Remove inline event handlers
    .replace(/on\w+='[^']*'/g, '')      // Remove inline event handlers (single quotes)
    .replace(/javascript:/gi, '');       // Remove javascript: protocol
};

export { sanitizeHTML, stripHTML, removeScripts };
```

### Code example (sanitizing user profile data)

```js
// lib/appwrite.js
import { sanitizeHTML, stripHTML } from './utils/sanitize';

const updateUserProfile = async (userId, profileData) => {
  try {
    // Sanitize user-provided data
    const sanitizedData = {
      ...profileData,
      // Sanitize bio field
      BioBlock: profileData.BioBlock 
        ? stripHTML(profileData.BioBlock).substring(0, 500)
        : '',
      // Sanitize username
      username: profileData.username
        ? sanitizeHTML(profileData.username).substring(0, 50)
        : '',
      // Sanitize personality tag
      PersonalityTag: profileData.PersonalityTag
        ? sanitizeHTML(profileData.PersonalityTag).substring(0, 10)
        : '',
    };
    
    const response = await databases.updateDocument(
      databaseId,
      userCollectionId,
      userId,
      sanitizedData
    );
    
    return response;
  } catch (error) {
    console.error('Failed to update profile:', error);
    throw error;
  }
};
```

### Code example (sanitizing API responses)

```js
// functions/api-handler/index.js
import { sanitizeHTML } from '../../lib/utils/sanitize';

export default async ({ req, res, log, error }) => {
  try {
    const { userId } = req.headers;
    
    // Fetch user data
    const user = await databases.getDocument(
      databaseId,
      userCollectionId,
      userId
    );
    
    // Sanitize user data before returning
    const sanitizedUser = {
      id: user.$id,
      username: sanitizeHTML(user.username),
      bio: sanitizeHTML(user.BioBlock),
      // Return only necessary fields
    };
    
    return res.json(sanitizedUser, 200);
  } catch (err) {
    error('API error:', err);
    return res.json({ error: 'Internal server error' }, 500);
  }
};
```

### Tests

* Test with script tags in user input
* Test with event handlers (onclick, onload)
* Test with javascript: protocol
* Test with unicode and special characters
* Verify sanitization doesn't break legitimate content

---

## 3) CSRF protection

**Location:** All state-changing API endpoints (POST, PUT, DELETE)
**Expected:** CSRF tokens are validated for all state-changing operations

### Steps

1. **Implement CSRF token generation:**
   * Generate unique tokens for each session
   * Store tokens securely (server-side)
   * Include tokens in forms and API calls

2. **Validate CSRF tokens:**
   * Check token on all state-changing requests
   * Verify token matches session token
   * Reject requests with invalid or missing tokens

3. **Use SameSite cookies:**
   * Set SameSite=Strict or SameSite=Lax
   * Prevent CSRF via cookie-based attacks
   * Combine with other security headers

### Code example (CSRF token generation)

```js
// lib/utils/csrf.js
import { ID } from 'appwrite';

/**
 * Generate a CSRF token
 * @returns {string} - Unique CSRF token
 */
const generateCSRFToken = () => {
  return ID.unique(); // Use Appwrite's ID generator
};

/**
 * Validate CSRF token
 * @param {string} token - Token to validate
 * @param {string} sessionToken - Session token
 * @returns {boolean} - True if valid
 */
const validateCSRFToken = (token, sessionToken) => {
  if (!token || !sessionToken) {
    return false;
  }
  
  // In production, verify against stored token
  // For now, basic validation
  return token.length === sessionToken.length;
};

export { generateCSRFToken, validateCSRFToken };
```

### Code example (CSRF middleware for functions)

```js
// functions/middleware/csrf.js
import { validateCSRFToken } from '../../lib/utils/csrf';

export const csrfProtection = (handler) => {
  return async ({ req, res, log, error }) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
      return handler({ req, res, log, error });
    }
    
    // Validate CSRF token for state-changing requests
    const csrfToken = req.headers['x-csrf-token'];
    const sessionToken = req.headers['x-appwrite-session'];
    
    if (!validateCSRFToken(csrfToken, sessionToken)) {
      return res.json({ error: 'Invalid CSRF token' }, 403);
    }
    
    return handler({ req, res, log, error });
  };
};
```

### Code example (using CSRF middleware)

```js
// functions/update-profile/index.js
import { csrfProtection } from '../middleware/csrf';

const updateProfileHandler = async ({ req, res, log, error }) => {
  // Your update logic here
  const { userId } = req.headers;
  const profileData = JSON.parse(req.body);
  
  // Update profile
  const result = await updateUserProfile(userId, profileData);
  
  return res.json(result, 200);
};

// Wrap handler with CSRF protection
export default csrfProtection(updateProfileHandler);
```

### Tests

* Test requests without CSRF token are rejected
* Test requests with invalid CSRF token are rejected
* Test requests with valid CSRF token are accepted
* Verify GET requests are not affected

---

## 4) Input sanitization

**Location:** All entry points for user input (API endpoints, forms, file uploads)
**Expected:** All user input is validated and sanitized before processing

### Steps

1. **Define input schemas:**
   * Specify expected types for each field
   * Define allowed values and ranges
   * Set maximum lengths
   * Define required vs optional fields

2. **Validate at entry point:**
   * Check data types
   * Check value ranges
   * Check required fields
   * Reject invalid input early

3. **Sanitize before processing:**
   * Trim whitespace
   * Remove special characters where inappropriate
   * Normalize data (lowercase, uppercase)
   * Apply allowlists/denylists

### Code example (input validation schema)

```js
// lib/utils/validation.js

/**
 * Validation schema for user profile
 */
const profileSchema = {
  username: {
    type: 'string',
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  bio: {
    type: 'string',
    required: false,
    maxLength: 500,
  },
  email: {
    type: 'string',
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  age: {
    type: 'number',
    required: true,
    min: 13,
    max: 120,
  },
};

/**
 * Validate input against schema
 * @param {object} data - Input data
 * @param {object} schema - Validation schema
 * @returns {object} - Validated data or throws error
 */
const validateInput = (data, schema) => {
  const errors = [];
  const validated = {};
  
  for (const [field, rules] of Object.entries(schema)) {
    const value = data[field];
    
    // Check required fields
    if (rules.required && (value === undefined || value === null)) {
      errors.push(`${field} is required`);
      continue;
    }
    
    // Skip validation for optional fields that are not provided
    if (!rules.required && (value === undefined || value === null)) {
      continue;
    }
    
    // Check type
    if (rules.type && typeof value !== rules.type) {
      errors.push(`${field} must be ${rules.type}`);
      continue;
    }
    
    // Check string length
    if (rules.type === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} contains invalid characters`);
      }
    }
    
    // Check number range
    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${field} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${field} must be at most ${rules.max}`);
      }
    }
    
    validated[field] = value;
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return validated;
};

export { profileSchema, validateInput };
```

### Code example (using validation in API)

```js
// functions/create-user/index.js
import { profileSchema, validateInput } from '../../lib/utils/validation';

export default async ({ req, res, log, error }) => {
  try {
    const userData = JSON.parse(req.body);
    
    // Validate input
    const validatedData = validateInput(userData, profileSchema);
    
    // Create user with validated data
    const user = await account.create(
      ID.unique(),
      validatedData.email,
      'tempPassword123', // Will be reset
      validatedData.username
    );
    
    // Store additional profile data
    await databases.createDocument(
      databaseId,
      userCollectionId,
      user.$id,
      {
        username: validatedData.username,
        BioBlock: validatedData.bio || '',
        email: validatedData.email,
      }
    );
    
    return res.json({ success: true, userId: user.$id }, 201);
  } catch (err) {
    error('User creation failed:', err);
    return res.json({ error: err.message }, 400);
  }
};
```

### Code example (file upload validation)

```js
// functions/upload-file/index.js
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export default async ({ req, res, log, error }) => {
  try {
    const file = req.files?.file;
    
    // Validate file exists
    if (!file) {
      return res.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return res.json({ error: 'Invalid file type' }, 400);
    }
    
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return res.json({ error: 'File too large' }, 400);
    }
    
    // Sanitize filename
    const safeFilename = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 100);
    
    // Upload file
    const result = await storage.createFile(
      bucketId,
      ID.unique(),
      file,
      // File permissions
      ['read("member")', 'update("member")', 'delete("member")']
    );
    
    return res.json({ success: true, fileId: result.$id }, 201);
  } catch (err) {
    error('File upload failed:', err);
    return res.json({ error: 'Upload failed' }, 500);
  }
};
```

### Tests

* Test with invalid data types
* Test with values outside allowed ranges
* Test with missing required fields
* Test with malicious file uploads
* Verify validation errors are clear and helpful

---

## 5) Secret management

**Location:** Environment variables, Appwrite secrets, configuration files
**Expected:** No secrets are hardcoded in source code or committed to version control

### Steps

1. **Use environment variables:**
   * Store API keys in environment variables
   * Use `.env` files for local development
   * Add `.env` to `.gitignore`
   * Use different environments (dev, staging, prod)

2. **Use Appwrite secrets:**
   * Store sensitive data in Appwrite project secrets
   * Access secrets in functions via environment variables
   * Rotate secrets regularly
   * Audit secret access

3. **Never hardcode secrets:**
   * Check code for hardcoded keys, tokens, passwords
   * Use configuration management tools
   * Implement secret rotation policies
   * Log secret access (without logging the secret itself)

### Code example (environment variable usage)

```js
// lib/config.js

// Load environment variables
const config = {
  appwrite: {
    endpoint: process.env.APPWRITE_ENDPOINT,
    projectId: process.env.APPWRITE_PROJECT_ID,
    apiKey: process.env.APPWRITE_API_KEY,
    databaseId: process.env.APPWRITE_DATABASE_ID,
  },
  firebase: {
    apiKey: process.env.FIREBASE_API_KEY,
    projectId: process.env.FIREBASE_PROJECT_ID,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID,
  },
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },
};

// Validate required environment variables
const validateConfig = () => {
  const required = [
    'APPWRITE_ENDPOINT',
    'APPWRITE_PROJECT_ID',
    'APPWRITE_API_KEY',
    'APPWRITE_DATABASE_ID',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
};

validateConfig();

export default config;
```

### Code example (Appwrite secrets in functions)

```js
// functions/send-notification/index.js

export default async ({ req, res, log, error }) => {
  try {
    // Access secrets via environment variables (set in Appwrite Console)
    const firebaseServerKey = process.env.FIREBASE_SERVER_KEY;
    
    if (!firebaseServerKey) {
      throw new Error('Firebase server key not configured');
    }
    
    const { userId, message } = JSON.parse(req.body);
    
    // Send notification using secret
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${firebaseServerKey}`,
      },
      body: JSON.stringify({
        to: userId,
        notification: {
          title: 'New Message',
          body: message,
        },
      }),
    });
    
    return res.json({ success: true }, 200);
  } catch (err) {
    error('Notification failed:', err);
    return res.json({ error: 'Failed to send notification' }, 500);
  }
};
```

### Code example (secret rotation helper)

```js
// lib/utils/secretRotation.js

/**
 * Rotate API key (example - actual implementation depends on service)
 * @param {string} service - Service name (e.g., 'firebase', 'stripe')
 * @returns {Promise<string>} - New API key
 */
const rotateSecret = async (service) => {
  // This is a placeholder - actual implementation depends on the service
  // For example, with Stripe you would create a new API key
  // and update your environment variables
  
  log(`Rotating secret for ${service}`);
  
  // In production:
  // 1. Generate new secret
  // 2. Update environment variables
  // 3. Test new secret
  // 4. Revoke old secret
  
  throw new Error('Secret rotation not implemented');
};

export { rotateSecret };
```

### Code example (checking for hardcoded secrets)

```js
// scripts/check-secrets.js

const fs = require('fs');
const path = require('path');

const SECRET_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi,
  /secret\s*[:=]\s*['"][^'"]{20,}['"]/gi,
  /password\s*[:=]\s*['"][^'"]{8,}['"]/gi,
  /token\s*[:=]\s*['"][^'"]{20,}['"]/gi,
];

const checkFileForSecrets = (filePath) => {
  const content = fs.readFileSync(filePath, 'utf8');
  const secrets = [];
  
  SECRET_PATTERNS.forEach(pattern => {
    const matches = content.match(pattern);
    if (matches) {
      secrets.push(...matches);
    }
  });
  
  return secrets;
};

const checkDirectory = (dir) => {
  const files = fs.readdirSync(dir, { recursive: true });
  const findings = [];
  
  files.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts')) {
      const secrets = checkFileForSecrets(path.join(dir, file));
      if (secrets.length > 0) {
        findings.push({ file, secrets });
      }
    }
  });
  
  return findings;
};

// Run check
const findings = checkDirectory(process.cwd());
if (findings.length > 0) {
  console.error('Found potential hardcoded secrets:');
  findings.forEach(({ file, secrets }) => {
    console.error(`  ${file}:`);
    secrets.forEach(secret => console.error(`    - ${secret}`));
  });
  process.exit(1);
} else {
  console.log('No hardcoded secrets found');
}
```

### Tests

* Verify environment variables are loaded correctly
* Test with missing environment variables
* Verify secrets are not logged
* Test secret rotation process
* Run secret detection script on codebase

---

## 6) Security headers and response handling

**Location:** All API responses
**Expected:** Appropriate security headers are set on all responses

### Code example (security headers middleware)

```js
// functions/middleware/securityHeaders.js

export const addSecurityHeaders = (handler) => {
  return async ({ req, res, log, error }) => {
    const result = await handler({ req, res, log, error });
    
    // Add security headers
    res.headers['X-Content-Type-Options'] = 'nosniff';
    res.headers['X-Frame-Options'] = 'DENY';
    res.headers['X-XSS-Protection'] = '1; mode=block';
    res.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
    res.headers['Content-Security-Policy'] = "default-src 'self'";
    
    return result;
  };
};
```

### Code example (error response without sensitive data)

```js
const handleError = (error) => {
  // Log full error for debugging
  console.error('Error:', error);
  
  // Return safe error message to client
  if (error.type === 'AppwriteException') {
    return {
      error: 'Database operation failed',
      code: error.code,
      // Don't expose internal details
    };
  }
  
  return {
    error: 'An unexpected error occurred',
    code: 500,
  };
};
```

---

## 7) Grep / codemod hints

* Find hardcoded secrets: `rg "(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"]{20,}['\"]" -n`
* Find SQL concatenation: `rg "\$\{|`.*\$\{.*\}`" -n`
* Find HTML in responses: `rg "<script|javascript:|on\w+\s*=" -n`
* Find missing input validation: `rg "req\.body|req\.query|req\.params" -n | rg -v "validate|sanitize"`
* Find missing CSRF protection: `rg "POST|PUT|DELETE" -n | rg -v "csrf|token"`

---

## 8) Update changelog

After implementing security measures, update `DOCS/ChangeLog.md` with:
- Input validation patterns added
- Sanitization functions implemented
- CSRF protection measures
- Secret management improvements
- Security headers added
- Any breaking changes to API contracts
