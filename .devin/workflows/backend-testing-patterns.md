---
description: Backend Testing Patterns - Unit testing, Integration testing, Mocking, Test data, CI/CD
auto_execution_mode: 3
---

# Junior Dev Checklist — Backend Testing Patterns

Comprehensive guide for implementing testing strategies for backend code. Ensures code quality, reliability, and maintainability through automated testing.

---

## Quick expectations

* **Unit testing**: Test individual functions in isolation with mocked dependencies
* **Integration testing**: Test interactions with Appwrite and external services
* **Mocking external services**: Isolate tests from external dependencies
* **Test data management**: Use consistent, isolated test data for each test
* **CI/CD integration**: Automate test execution in deployment pipeline
* **Test coverage**: Aim for high coverage of critical paths and error cases

---

## 1) Unit testing for backend functions

**Location:** `tests/unit/` directory, `__tests__/` directories within `lib/`
**Expected:** Pure functions are tested with various inputs and edge cases

### Steps

1. **Identify testable functions:**
   * Pure functions (no side effects)
   * Utility functions
   * Data transformation functions
   * Validation functions

2. **Write test cases:**
   * Happy path (normal operation)
   * Edge cases (boundary values)
   * Error cases (invalid inputs)
   * Null/undefined handling

3. **Use appropriate test framework:**
   * Jest for JavaScript/TypeScript
   * Mocha/Chai for alternative
   * Follow existing project patterns

### Code example (Jest unit test for validation function)

```js
// tests/unit/validation.test.js
import { validateInput, profileSchema } from '../../lib/utils/validation';

describe('validateInput', () => {
  describe('username validation', () => {
    it('should accept valid username', () => {
      const data = {
        username: 'testuser123',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).not.toThrow();
    });
    
    it('should reject username with special characters', () => {
      const data = {
        username: 'test@user',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
    
    it('should reject username that is too short', () => {
      const data = {
        username: 'ab',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
    
    it('should reject username that is too long', () => {
      const data = {
        username: 'a'.repeat(31),
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
  });
  
  describe('email validation', () => {
    it('should accept valid email', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).not.toThrow();
    });
    
    it('should reject invalid email', () => {
      const data = {
        username: 'testuser',
        email: 'invalid-email',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
  });
  
  describe('age validation', () => {
    it('should accept valid age', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).not.toThrow();
    });
    
    it('should reject age below minimum', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 12,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
    
    it('should reject age above maximum', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 121,
      };
      
      expect(() => validateInput(data, profileSchema)).toThrow();
    });
  });
  
  describe('optional fields', () => {
    it('should accept missing optional bio field', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
      };
      
      expect(() => validateInput(data, profileSchema)).not.toThrow();
    });
    
    it('should accept bio field when provided', () => {
      const data = {
        username: 'testuser',
        email: 'test@example.com',
        age: 25,
        bio: 'This is my bio',
      };
      
      expect(() => validateInput(data, profileSchema)).not.toThrow();
    });
  });
});
```

### Code example (unit test for data transformation)

```js
// tests/unit/dataTransformation.test.js
import { buildComponentGeometry } from '../../utils/componentGeometry';

describe('buildComponentGeometry', () => {
  it('should build geometry from valid measurements', () => {
    const measurements = {
      pageX: 100,
      pageY: 200,
      width: 300,
      height: 400,
    };
    
    const geometry = buildComponentGeometry(
      measurements.pageX,
      measurements.pageY,
      measurements.width,
      measurements.height
    );
    
    expect(geometry).toHaveProperty('topLeft');
    expect(geometry).toHaveProperty('topRight');
    expect(geometry).toHaveProperty('bottomLeft');
    expect(geometry).toHaveProperty('bottomRight');
    expect(geometry).toHaveProperty('center');
    expect(geometry).toHaveProperty('dimensions');
    expect(geometry).toHaveProperty('matrix');
  });
  
  it('should calculate correct corner points', () => {
    const geometry = buildComponentGeometry(100, 200, 300, 400);
    
    expect(geometry.topLeft).toEqual({ x: 100, y: 200 });
    expect(geometry.topRight).toEqual({ x: 400, y: 200 });
    expect(geometry.bottomLeft).toEqual({ x: 100, y: 600 });
    expect(geometry.bottomRight).toEqual({ x: 400, y: 600 });
  });
  
  it('should calculate correct center point', () => {
    const geometry = buildComponentGeometry(100, 200, 300, 400);
    
    expect(geometry.center).toEqual({ x: 250, y: 400 });
  });
  
  it('should return correct dimensions', () => {
    const geometry = buildComponentGeometry(100, 200, 300, 400);
    
    expect(geometry.dimensions).toEqual({ width: 300, height: 400 });
  });
  
  it('should handle zero dimensions', () => {
    const geometry = buildComponentGeometry(0, 0, 0, 0);
    
    expect(geometry.topLeft).toEqual({ x: 0, y: 0 });
    expect(geometry.dimensions).toEqual({ width: 0, height: 0 });
  });
});
```

### Code example (unit test for error handling)

```js
// tests/unit/errorHandling.test.js
import { handleError } from '../../lib/utils/errorHandler';

describe('handleError', () => {
  it('should return safe error message for AppwriteException', () => {
    const error = {
      type: 'AppwriteException',
      code: 404,
      message: 'Document not found',
    };
    
    const result = handleError(error);
    
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('code');
    expect(result.error).not.toContain('Document not found'); // Don't expose details
  });
  
  it('should return generic error for unknown errors', () => {
    const error = new Error('Unexpected error');
    
    const result = handleError(error);
    
    expect(result).toEqual({
      error: 'An unexpected error occurred',
      code: 500,
    });
  });
  
  it('should handle null error', () => {
    const result = handleError(null);
    
    expect(result).toHaveProperty('error');
  });
});
```

### Tests

* Run unit tests: `npm test` or `jest`
* Check coverage: `npm test -- --coverage`
* Verify all edge cases are covered
* Ensure tests run quickly (< 5 seconds per file)

---

## 2) Integration testing with Appwrite

**Location:** `tests/integration/` directory
**Expected:** Tests verify real interactions with Appwrite services

### Steps

1. **Set up test environment:**
   * Use separate Appwrite project for testing
   * Configure test environment variables
   * Create test collections and buckets
   * Set up test user accounts

2. **Write integration tests:**
   * Test CRUD operations
   * Test query operations
   * Test permission scenarios
   * Test error handling

3. **Clean up after tests:**
   * Delete test data
   * Reset test environment
   * Handle cleanup failures gracefully

### Code example (Appwrite integration test setup)

```js
// tests/integration/setup.js
import { Client, Databases, Account } from 'appwrite';

// Initialize Appwrite client for testing
const client = new Client()
  .setEndpoint(process.env.APPWRITE_TEST_ENDPOINT)
  .setProject(process.env.APPWRITE_TEST_PROJECT_ID)
  .setKey(process.env.APPWRITE_TEST_API_KEY);

const databases = new Databases(client);
const account = new Account(client);

// Test configuration
const TEST_DATABASE_ID = process.env.APPWRITE_TEST_DATABASE_ID;
const TEST_COLLECTION_ID = 'test_collection';

// Clean up function
export const cleanupTestCollection = async () => {
  try {
    // Delete all documents in test collection
    const documents = await databases.listDocuments(
      TEST_DATABASE_ID,
      TEST_COLLECTION_ID
    );
    
    for (const doc of documents.documents) {
      await databases.deleteDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        doc.$id
      );
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
};

// Setup function
export const setupTestCollection = async () => {
  try {
    // Create test collection if it doesn't exist
    await databases.createCollection(
      TEST_DATABASE_ID,
      TEST_COLLECTION_ID,
      'Test Collection',
      ['read("users")', 'create("users")', 'update("users")', 'delete("users")']
    );
  } catch (error) {
    // Collection might already exist
    if (error.code !== 409) {
      throw error;
    }
  }
};

export { client, databases, account, TEST_DATABASE_ID, TEST_COLLECTION_ID };
```

### Code example (Appwrite integration test)

```js
// tests/integration/appwrite.test.js
import {
  databases,
  setupTestCollection,
  cleanupTestCollection,
  TEST_DATABASE_ID,
  TEST_COLLECTION_ID,
} from './setup';
import { ID } from 'appwrite';

describe('Appwrite Integration Tests', () => {
  beforeAll(async () => {
    await setupTestCollection();
  });
  
  afterAll(async () => {
    await cleanupTestCollection();
  });
  
  afterEach(async () => {
    // Clean up after each test
    await cleanupTestCollection();
  });
  
  describe('Document CRUD operations', () => {
    it('should create a document', async () => {
      const documentData = {
        name: 'Test Document',
        value: 42,
      };
      
      const response = await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        documentData
      );
      
      expect(response).toHaveProperty('$id');
      expect(response.name).toBe(documentData.name);
      expect(response.value).toBe(documentData.value);
    });
    
    it('should read a document', async () => {
      const documentData = {
        name: 'Test Document',
        value: 42,
      };
      
      const created = await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        documentData
      );
      
      const read = await databases.getDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        created.$id
      );
      
      expect(read.$id).toBe(created.$id);
      expect(read.name).toBe(documentData.name);
    });
    
    it('should update a document', async () => {
      const documentData = {
        name: 'Test Document',
        value: 42,
      };
      
      const created = await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        documentData
      );
      
      const updated = await databases.updateDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        created.$id,
        {
          name: 'Updated Document',
          value: 100,
        }
      );
      
      expect(updated.name).toBe('Updated Document');
      expect(updated.value).toBe(100);
    });
    
    it('should delete a document', async () => {
      const documentData = {
        name: 'Test Document',
        value: 42,
      };
      
      const created = await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        documentData
      );
      
      await databases.deleteDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        created.$id
      );
      
      await expect(
        databases.getDocument(TEST_DATABASE_ID, TEST_COLLECTION_ID, created.$id)
      ).rejects.toThrow();
    });
  });
  
  describe('Query operations', () => {
    beforeEach(async () => {
      // Create test documents
      await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        { name: 'Document 1', value: 10 }
      );
      await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        { name: 'Document 2', value: 20 }
      );
      await databases.createDocument(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        ID.unique(),
        { name: 'Document 3', value: 30 }
      );
    });
    
    it('should list documents', async () => {
      const response = await databases.listDocuments(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID
      );
      
      expect(response.documents).toHaveLength(3);
    });
    
    it('should filter documents by value', async () => {
      const { Query } = require('appwrite');
      
      const response = await databases.listDocuments(
        TEST_DATABASE_ID,
        TEST_COLLECTION_ID,
        [Query.greaterThan('value', 15)]
      );
      
      expect(response.documents.length).toBeGreaterThan(0);
      response.documents.forEach(doc => {
        expect(doc.value).toBeGreaterThan(15);
      });
    });
  });
});
```

### Code example (testing with test user)

```js
// tests/integration/auth.test.js
import { account, setupTestCollection, cleanupTestCollection } from './setup';

describe('Authentication Integration Tests', () => {
  let testUserId;
  let testSession;
  
  beforeAll(async () => {
    await setupTestCollection();
    
    // Create test user
    const user = await account.create(
      ID.unique(),
      `test${Date.now()}@example.com`,
      'password123',
      'Test User'
    );
    testUserId = user.$id;
    
    // Create session
    testSession = await account.createEmailPasswordSession(
      user.email,
      'password123'
    );
  });
  
  afterAll(async () => {
    // Delete test user
    await account.deleteSession('current');
    await account.deleteIdentity(testUserId);
    await cleanupTestCollection();
  });
  
  it('should authenticate user', async () => {
    const session = await account.get();
    
    expect(session).toHaveProperty('$id');
    expect(session.userId).toBe(testUserId);
  });
  
  it('should fail with wrong password', async () => {
    await expect(
      account.createEmailPasswordSession(
        `test${Date.now()}@example.com`,
        'wrongpassword'
      )
    ).rejects.toThrow();
  });
});
```

### Tests

* Run integration tests: `npm test -- tests/integration`
* Verify tests use test environment
* Ensure cleanup runs after each test
* Check that tests don't affect production data

---

## 3) Mocking external services

**Location:** `tests/unit/` and `tests/integration/` directories
**Expected:** External dependencies are mocked to isolate test behavior

### Steps

1. **Identify external dependencies:**
   * API calls to third-party services
   * Database operations (for unit tests)
   * File system operations
   * Network requests

2. **Create mocks:**
   * Use Jest mocks for functions
   * Use mock service workers for HTTP requests
   * Create mock data factories
   * Mock Appwrite SDK for unit tests

3. **Verify mock behavior:**
   * Ensure mocks are called correctly
   * Verify parameters passed to mocks
   * Test error scenarios with mocked failures

### Code example (mocking Appwrite SDK)

```js
// tests/unit/appwriteMock.test.js
import { databases } from '../../lib/appwrite';

// Mock Appwrite SDK
jest.mock('appwrite', () => ({
  Client: jest.fn().mockImplementation(() => ({
    setEndpoint: jest.fn().mockReturnThis(),
    setProject: jest.fn().mockReturnThis(),
    setKey: jest.fn().mockReturnThis(),
  })),
  Databases: jest.fn().mockImplementation(() => ({
    createDocument: jest.fn(),
    getDocument: jest.fn(),
    updateDocument: jest.fn(),
    deleteDocument: jest.fn(),
    listDocuments: jest.fn(),
  })),
  Query: {
    equal: jest.fn((attr, value) => ({ method: 'equal', attr, value })),
    notEqual: jest.fn((attr, value) => ({ method: 'notEqual', attr, value })),
    greaterThan: jest.fn((attr, value) => ({ method: 'greaterThan', attr, value })),
  },
  ID: {
    unique: jest.fn(() => 'mock-id-123'),
  },
}));

describe('Appwrite Functions with Mocks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should create document with mocked SDK', async () => {
    const mockDocument = {
      $id: 'mock-id-123',
      name: 'Test Document',
      value: 42,
    };
    
    databases.createDocument.mockResolvedValue(mockDocument);
    
    const result = await databases.createDocument(
      'test-db',
      'test-collection',
      'test-id',
      { name: 'Test Document', value: 42 }
    );
    
    expect(databases.createDocument).toHaveBeenCalledWith(
      'test-db',
      'test-collection',
      'test-id',
      { name: 'Test Document', value: 42 }
    );
    expect(result).toEqual(mockDocument);
  });
  
  it('should handle SDK errors', async () => {
    const mockError = new Error('Appwrite error');
    databases.getDocument.mockRejectedValue(mockError);
    
    await expect(
      databases.getDocument('test-db', 'test-collection', 'test-id')
    ).rejects.toThrow('Appwrite error');
  });
});
```

### Code example (mocking HTTP requests with MSW)

```js
// tests/unit/api.test.js
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { fetchExternalData } from '../../lib/api';

// Setup mock server
const server = setupServer(
  rest.get('https://api.example.com/data', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({ data: 'mocked response' })
    );
  }),
  
  rest.get('https://api.example.com/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({ error: 'Internal server error' })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('External API with MSW', () => {
  it('should fetch data successfully', async () => {
    const result = await fetchExternalData('https://api.example.com/data');
    
    expect(result).toEqual({ data: 'mocked response' });
  });
  
  it('should handle API errors', async () => {
    await expect(
      fetchExternalData('https://api.example.com/error')
    ).rejects.toThrow();
  });
});
```

### Code example (mock data factory)

```js
// tests/helpers/mockData.js

export const createMockUser = (overrides = {}) => ({
  $id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  BioBlock: 'Test bio',
  PersonalityTag: 'ENFJ',
  HobbyList: ['coding', 'reading'],
  ...overrides,
});

export const createMockSession = (overrides = {}) => ({
  $id: 'session-123',
  title: 'Test Session',
  description: 'Test description',
  creatorId: 'user-123',
  participantsList: ['user-123', 'user-456'],
  ...overrides,
});

export const createMockMessage = (overrides = {}) => ({
  $id: 'message-123',
  roomId: 'session-123',
  senderId: 'user-123',
  content: 'Test message',
  timestamp: new Date().toISOString(),
  ...overrides,
});
```

### Code example (using mock data in tests)

```js
// tests/unit/sessionProcessor.test.js
import { createMockSession, createMockUser } from '../helpers/mockData';
import { processSessionData } from '../../lib/sessionProcessor';

describe('Session Data Processing', () => {
  it('should process session with mock data', () => {
    const mockSession = createMockSession({
      title: 'Special Session',
      participantsList: ['user-1', 'user-2', 'user-3'],
    });
    
    const mockUsers = [
      createMockUser({ $id: 'user-1', username: 'Alice' }),
      createMockUser({ $id: 'user-2', username: 'Bob' }),
      createMockUser({ $id: 'user-3', username: 'Charlie' }),
    ];
    
    const result = processSessionData(mockSession, mockUsers);
    
    expect(result).toHaveProperty('title', 'Special Session');
    expect(result).toHaveProperty('participantCount', 3);
    expect(result.participants).toEqual(['Alice', 'Bob', 'Charlie']);
  });
});
```

### Tests

* Verify mocks are called with correct parameters
* Test both success and error scenarios
* Ensure mocks are reset between tests
* Check that tests don't depend on external services

---

## 4) Test data management

**Location:** `tests/fixtures/` directory, `tests/helpers/` directory
**Expected:** Test data is consistent, isolated, and easy to maintain

### Steps

1. **Create test data fixtures:**
   * JSON files with sample data
   * Mock data factories
   * Test data builders
   * Seed scripts for integration tests

2. **Isolate test data:**
   * Use unique IDs for each test
   * Clean up data after tests
   * Use transactions where possible
   * Avoid shared state between tests

3. **Maintain test data:**
   * Keep fixtures up to date
   * Document fixture structure
   * Version fixtures with schema changes
   * Use realistic but anonymized data

### Code example (test data fixtures)

```json
// tests/fixtures/users.json
{
  "validUser": {
    "username": "testuser",
    "email": "test@example.com",
    "age": 25,
    "bio": "Test bio"
  },
  "invalidUser": {
    "username": "",
    "email": "invalid-email",
    "age": 12
  },
  "adminUser": {
    "username": "admin",
    "email": "admin@example.com",
    "age": 30,
    "role": "admin"
  }
}
```

```json
// tests/fixtures/sessions.json
{
  "publicSession": {
    "title": "Public Session",
    "description": "Open to everyone",
    "isPrivate": false
  },
  "privateSession": {
    "title": "Private Session",
    "description": "Invite only",
    "isPrivate": true
  },
  "fullSession": {
    "title": "Full Session",
    "description": "Capacity reached",
    "maxParticipants": 10,
    "currentParticipants": 10
  }
}
```

### Code example (test data builder)

```js
// tests/helpers/dataBuilder.js

export class TestDataBuilder {
  constructor() {
    this.data = {};
  }
  
  withId(id) {
    this.data.$id = id;
    return this;
  }
  
  withUsername(username) {
    this.data.username = username;
    return this;
  }
  
  withEmail(email) {
    this.data.email = email;
    return this;
  }
  
  withAge(age) {
    this.data.age = age;
    return this;
  }
  
  withBio(bio) {
    this.data.BioBlock = bio;
    return this;
  }
  
  build() {
    return { ...this.data };
  }
}

export const aUser = () => new TestDataBuilder();
```

### Code example (using data builder in tests)

```js
// tests/unit/userValidation.test.js
import { aUser } from '../helpers/dataBuilder';
import { validateUser } from '../../lib/userValidation';

describe('User Validation with Data Builder', () => {
  it('should validate valid user', () => {
    const user = aUser()
      .withId('user-123')
      .withUsername('testuser')
      .withEmail('test@example.com')
      .withAge(25)
      .withBio('Test bio')
      .build();
    
    const result = validateUser(user);
    
    expect(result.isValid).toBe(true);
  });
  
  it('should reject user without username', () => {
    const user = aUser()
      .withId('user-123')
      .withEmail('test@example.com')
      .withAge(25)
      .build();
    
    const result = validateUser(user);
    
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Username is required');
  });
});
```

### Code example (seed script for integration tests)

```js
// scripts/seedTestData.js
import { Client, Databases, ID } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_TEST_ENDPOINT)
  .setProject(process.env.APPWRITE_TEST_PROJECT_ID)
  .setKey(process.env.APPWRITE_TEST_API_KEY);

const databases = new Databases(client);

const seedTestData = async () => {
  try {
    // Create test users
    const user1 = await databases.createDocument(
      process.env.APPWRITE_TEST_DATABASE_ID,
      'users',
      ID.unique(),
      {
        username: 'testuser1',
        email: 'test1@example.com',
        age: 25,
      }
    );
    
    const user2 = await databases.createDocument(
      process.env.APPWRITE_TEST_DATABASE_ID,
      'users',
      ID.unique(),
      {
        username: 'testuser2',
        email: 'test2@example.com',
        age: 30,
      }
    );
    
    // Create test sessions
    const session1 = await databases.createDocument(
      process.env.APPWRITE_TEST_DATABASE_ID,
      'sessions',
      ID.unique(),
      {
        title: 'Test Session 1',
        creatorId: user1.$id,
        participantsList: [user1.$id, user2.$id],
      }
    );
    
    console.log('Test data seeded successfully');
    console.log('User IDs:', user1.$id, user2.$id);
    console.log('Session ID:', session1.$id);
  } catch (error) {
    console.error('Failed to seed test data:', error);
    process.exit(1);
  }
};

seedTestData();
```

### Code example (test data cleanup)

```js
// tests/helpers/cleanup.js
import { databases } from '../integration/setup';

export const cleanupAllTestData = async () => {
  const collections = ['users', 'sessions', 'messages'];
  
  for (const collectionId of collections) {
    try {
      const documents = await databases.listDocuments(
        process.env.APPWRITE_TEST_DATABASE_ID,
        collectionId
      );
      
      for (const doc of documents.documents) {
        await databases.deleteDocument(
          process.env.APPWRITE_TEST_DATABASE_ID,
          collectionId,
          doc.$id
        );
      }
    } catch (error) {
      console.error(`Failed to cleanup ${collectionId}:`, error);
    }
  }
};
```

### Tests

* Verify test data is isolated between tests
* Check that cleanup removes all test data
* Ensure fixtures match current schema
* Test with various data scenarios

---

## 5) CI/CD integration

**Location:** `.github/workflows/`, `.gitlab-ci.yml`, or other CI configuration
**Expected:** Tests run automatically on every commit and pull request

### Steps

1. **Configure CI pipeline:**
   * Set up test runner in CI
   * Configure environment variables
   * Set up test database
   * Configure test reporting

2. **Define test stages:**
   * Unit tests (fast, run on every commit)
   * Integration tests (slower, run on PRs)
   * E2E tests (slowest, run on main branch)
   * Coverage reporting

3. **Handle test failures:**
   * Block merges on test failures
   * Report test results
   * Store test artifacts
   * Notify team of failures

### Code example (GitHub Actions workflow)

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- tests/unit
      
      - name: Generate coverage
        run: npm test -- tests/unit -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        env:
          APPWRITE_TEST_ENDPOINT: ${{ secrets.APPWRITE_TEST_ENDPOINT }}
          APPWRITE_TEST_PROJECT_ID: ${{ secrets.APPWRITE_TEST_PROJECT_ID }}
          APPWRITE_TEST_API_KEY: ${{ secrets.APPWRITE_TEST_API_KEY }}
          APPWRITE_TEST_DATABASE_ID: ${{ secrets.APPWRITE_TEST_DATABASE_ID }}
        run: npm test -- tests/integration
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: integration-test-results
          path: test-results/

  lint:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
```

### Code example (GitLab CI configuration)

```yaml
# .gitlab-ci.yml
stages:
  - test
  - integration
  - report

variables:
  NODE_ENV: test

unit-tests:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm test -- tests/unit
    - npm test -- tests/unit -- --coverage
  coverage: '/All files[^|]*\|[^|]*\s+([\d\.]+)/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
  only:
    - branches

integration-tests:
  stage: integration
  image: node:18
  services:
    - name: appwrite/appwrite:latest
      alias: appwrite
  variables:
    APPWRITE_TEST_ENDPOINT: http://appwrite:80
    APPWRITE_TEST_PROJECT_ID: $APPWRITE_TEST_PROJECT_ID
    APPWRITE_TEST_API_KEY: $APPWRITE_TEST_API_KEY
    APPWRITE_TEST_DATABASE_ID: $APPWRITE_TEST_DATABASE_ID
  script:
    - npm ci
    - npm test -- tests/integration
  only:
    - merge_requests
    - main

lint:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm run lint
    - npm run type-check
  only:
    - branches
```

### Code example (package.json test scripts)

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "type-check": "tsc --noEmit",
    "test:ci": "npm run lint && npm run type-check && npm test"
  }
}
```

### Code example (Jest configuration)

```js
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  collectCoverageFrom: [
    'lib/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 10000,
};
```

### Code example (test setup file)

```js
// tests/setup.js
// Global test setup

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup global test timeout
jest.setTimeout(10000);
```

### Tests

* Verify CI pipeline runs on commits
* Check that tests pass in CI environment
* Ensure environment variables are configured
* Verify coverage reports are generated
* Test that failed tests block merges

---

## 6) Testing best practices

### Code example (test organization)

```
tests/
├── unit/
│   ├── validation.test.js
│   ├── dataTransformation.test.js
│   └── errorHandling.test.js
├── integration/
│   ├── appwrite.test.js
│   ├── auth.test.js
│   └── setup.js
├── fixtures/
│   ├── users.json
│   └── sessions.json
├── helpers/
│   ├── mockData.js
│   ├── dataBuilder.js
│   └── cleanup.js
└── setup.js
```

### Code example (test naming conventions)

```js
// Good: Descriptive test names
describe('User validation', () => {
  it('should accept valid username', () => {});
  it('should reject username with special characters', () => {});
  it('should reject username that is too short', () => {});
});

// Bad: Vague test names
describe('User validation', () => {
  it('works', () => {});
  it('fails', () => {});
  it('also fails', () => {});
});
```

### Code example (arrange-act-assert pattern)

```js
// Good: Clear AAA pattern
it('should calculate total price', () => {
  // Arrange
  const cart = new Cart();
  cart.addItem({ price: 10, quantity: 2 });
  cart.addItem({ price: 5, quantity: 1 });
  
  // Act
  const total = cart.calculateTotal();
  
  // Assert
  expect(total).toBe(25);
});

// Bad: Mixed pattern
it('should calculate total price', () => {
  const cart = new Cart();
  expect(cart.calculateTotal()).toBe(0);
  cart.addItem({ price: 10, quantity: 2 });
  expect(cart.calculateTotal()).toBe(20);
});
```

---

## 7) Grep / codemod hints

* Find untested functions: `rg "export (const|function)" lib -n | rg -v "test"`
* Find hardcoded test data: `rg "('test'|'mock'|'dummy')" tests -n`
* Find missing cleanup: `rg "beforeEach|beforeAll" tests -n | rg -v "afterEach|afterAll"`
* Find test files without coverage: `rg "\.test\.js" tests -n`

---

## 8) Update changelog

After implementing testing patterns, update `DOCS/ChangeLog.md` with:
- Unit test suites added
- Integration test suites added
- Mock implementations created
- Test data fixtures added
- CI/CD pipeline configuration
- Coverage thresholds established
- Any breaking changes to test structure
