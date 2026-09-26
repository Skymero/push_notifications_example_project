---
description: Integration Service Patterns - Third-party API integration, Rate limiting, Circuit breaker, Retry logic, Webhook handling
auto_execution_mode: 3
---

# Junior Dev Checklist — Integration Service Patterns

Comprehensive guide for implementing robust third-party service integrations. Ensures reliability, resilience, and proper error handling when working with external APIs and services.

---

## Quick expectations

* **Third-party API integration**: Use proper error handling, timeouts, and response validation
* **Rate limiting and throttling**: Respect API limits and implement client-side rate limiting
* **Circuit breaker**: Prevent cascading failures by stopping calls to failing services
* **Retry logic with exponential backoff**: Handle transient failures with intelligent retries
* **Webhook handling**: Securely process and validate webhook events
* **Observability**: Log integration events and monitor service health

---

## 1) Third-party API integration patterns

**Location:** Service layer, API client functions, integration modules
**Expected**: External API calls are wrapped with proper error handling and validation

### Steps

1. **Create API client abstraction:**
   * Wrap third-party SDK or HTTP client
   * Implement consistent error handling
   * Add request/response logging
   * Support configuration and credentials

2. **Implement timeout handling:**
   * Set appropriate timeouts for requests
   * Handle timeout errors gracefully
   * Implement retry logic for timeouts
   * Log timeout events

3. **Validate responses:**
   * Validate response structure
   * Check for expected fields
   * Handle unexpected responses
   * Sanitize external data

### Code example (API client abstraction)

```js
// lib/integration/apiClient.js

class APIClient {
  constructor(config) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 30000;
    this.retryConfig = config.retryConfig || {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
    };
  }
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
      timeout: this.timeout,
    };
    
    try {
      const response = await this.executeWithRetry(url, requestOptions);
      return this.validateResponse(response);
    } catch (error) {
      this.logError('API request failed', { endpoint, error });
      throw this.normalizeError(error);
    }
  }
  
  async executeWithRetry(url, options, attempt = 1) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        return this.executeWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }
  
  shouldRetry(error, attempt) {
    if (attempt >= this.retryConfig.maxRetries) {
      return false;
    }
    
    // Retry on network errors and 5xx errors
    if (error.name === 'TypeError' || error.message.includes('5xx')) {
      return true;
    }
    
    return false;
  }
  
  calculateRetryDelay(attempt) {
    const { initialDelay, maxDelay } = this.retryConfig;
    const delay = initialDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, maxDelay);
  }
  
  validateResponse(response) {
    if (!response || typeof response !== 'object') {
      throw new Error('Invalid response structure');
    }
    
    return response;
  }
  
  normalizeError(error) {
    if (error.name === 'AbortError') {
      return new Error('Request timeout');
    }
    
    return error;
  }
  
  logError(message, context) {
    console.error(`[APIClient] ${message}`, context);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { APIClient };
```

### Code example (specific API client)

```js
// lib/integration/googleMapsClient.js

import { APIClient } from './apiClient';

class GoogleMapsClient extends APIClient {
  constructor(config) {
    super({
      baseURL: 'https://maps.googleapis.com/maps/api',
      apiKey: config.apiKey,
      timeout: config.timeout || 10000,
    });
  }
  
  async geocode(address) {
    return this.request('/geocode/json', {
      method: 'GET',
      headers: {},
      body: null,
    }).then(() => {
      // Google Maps uses query params, not body
      const params = new URLSearchParams({
        address,
        key: this.apiKey,
      });
      
      return fetch(`${this.baseURL}/geocode/json?${params}`, {
        timeout: this.timeout,
      }).then(res => res.json());
    });
  }
  
  async getDirections(origin, destination) {
    const params = new URLSearchParams({
      origin,
      destination,
      key: this.apiKey,
    });
    
    return fetch(`${this.baseURL}/directions/json?${params}`, {
      timeout: this.timeout,
    }).then(res => res.json());
  }
}

export { GoogleMapsClient };
```

### Code example (using API client)

```js
// services/location.js

import { GoogleMapsClient } from '../lib/integration/googleMapsClient';

const mapsClient = new GoogleMapsClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  timeout: 10000,
});

const getCoordinates = async (address) => {
  try {
    const response = await mapsClient.geocode(address);
    
    if (response.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.status}`);
    }
    
    const location = response.results[0].geometry.location;
    return {
      latitude: location.lat,
      longitude: location.lng,
    };
  } catch (error) {
    console.error('Failed to get coordinates:', error);
    throw error;
  }
};

export { getCoordinates };
```

### Tests

* Verify API client handles errors correctly
* Test retry logic with mock failures
* Check timeout handling works
* Verify response validation

---

## 2) Rate limiting and throttling

**Location:** API client middleware, service layer
**Expected**: External API calls respect rate limits and implement client-side throttling

### Steps

1. **Implement rate limiting:**
   * Track request counts per time window
   * Queue requests when limit is reached
   * Implement backoff strategies
   * Handle rate limit errors from APIs

2. **Implement throttling:**
   * Limit concurrent requests
   * Use request queues
   * Implement priority queues
   * Handle queue overflow

3. **Monitor rate limits:**
   * Track API usage
   * Log rate limit events
   * Alert on approaching limits
   * Implement adaptive throttling

### Code example (rate limiter)

```js
// lib/integration/rateLimiter.js

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100;
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.requests = [];
  }
  
  async acquire() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Remove old requests
    this.requests = this.requests.filter(time => time > windowStart);
    
    // Check if limit reached
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = oldestRequest + this.windowMs - now;
      
      if (waitTime > 0) {
        await this.sleep(waitTime);
        return this.acquire();
      }
    }
    
    // Add current request
    this.requests.push(now);
    return true;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getRemaining() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    this.requests = this.requests.filter(time => time > windowStart);
    return this.maxRequests - this.requests.length;
  }
}

export { RateLimiter };
```

### Code example (API client with rate limiting)

```js
// lib/integration/rateLimitedClient.js

import { APIClient } from './apiClient';
import { RateLimiter } from './rateLimiter';

class RateLimitedAPIClient extends APIClient {
  constructor(config) {
    super(config);
    this.rateLimiter = new RateLimiter(config.rateLimit || {
      maxRequests: 100,
      windowMs: 60000,
    });
  }
  
  async request(endpoint, options = {}) {
    await this.rateLimiter.acquire();
    return super.request(endpoint, options);
  }
  
  getRateLimitStatus() {
    return {
      remaining: this.rateLimiter.getRemaining(),
      max: this.rateLimiter.maxRequests,
    };
  }
}

export { RateLimitedAPIClient };
```

### Code example (handling API rate limit errors)

```js
// lib/integration/rateLimitHandler.js

class RateLimitHandler {
  constructor() {
    this.rateLimitInfo = {};
  }
  
  handleRateLimitError(error, apiName) {
    const retryAfter = error.headers?.['retry-after'];
    const resetTime = error.headers?.['x-ratelimit-reset'];
    
    if (retryAfter) {
      const waitTime = parseInt(retryAfter) * 1000;
      this.scheduleRetry(apiName, waitTime);
      return waitTime;
    }
    
    if (resetTime) {
      const waitTime = (parseInt(resetTime) * 1000) - Date.now();
      this.scheduleRetry(apiName, waitTime);
      return waitTime;
    }
    
    // Default backoff
    const waitTime = 60000; // 1 minute
    this.scheduleRetry(apiName, waitTime);
    return waitTime;
  }
  
  scheduleRetry(apiName, waitTime) {
    console.log(`Rate limit hit for ${apiName}, retrying in ${waitTime}ms`);
    // Implement retry scheduling
  }
  
  updateRateLimitInfo(apiName, headers) {
    this.rateLimitInfo[apiName] = {
      limit: headers['x-ratelimit-limit'],
      remaining: headers['x-ratelimit-remaining'],
      reset: headers['x-ratelimit-reset'],
    };
  }
  
  getRateLimitInfo(apiName) {
    return this.rateLimitInfo[apiName];
  }
}

export { RateLimitHandler };
```

### Code example (request queue for throttling)

```js
// lib/integration/requestQueue.js

class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.queue = [];
    this.active = 0;
  }
  
  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }
  
  async process() {
    if (this.active >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.active++;
    const { requestFn, resolve, reject } = this.queue.shift();
    
    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.active--;
      this.process();
    }
  }
  
  getQueueLength() {
    return this.queue.length;
  }
  
  getActiveCount() {
    return this.active;
  }
}

export { RequestQueue };
```

### Tests

* Verify rate limiting blocks excessive requests
* Test rate limit error handling
* Check request queue throttles correctly
* Verify concurrent request limits

---

## 3) Circuit breaker implementation

**Location:** Service layer, API client middleware
**Expected**: Failing services are temporarily disabled to prevent cascading failures

### Steps

1. **Implement circuit breaker states:**
   * Closed: Normal operation
   * Open: Service is failing, requests are blocked
   * Half-open: Testing if service has recovered

2. **Define failure thresholds:**
   * Failure count threshold
   * Failure percentage threshold
   * Timeout duration
   * Success threshold for recovery

3. **Implement state transitions:**
   * Closed → Open when threshold reached
   * Open → Half-open after timeout
   * Half-open → Closed on success
   * Half-open → Open on failure

### Code example (circuit breaker)

```js
// lib/integration/circuitBreaker.js

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.failureTimeout = options.failureTimeout || 60000; // 1 minute
    this.successThreshold = options.successThreshold || 2;
    
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
  
  async execute(requestFn) {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
        this.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }
    
    try {
      const result = await requestFn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    
    if (this.state === 'half-open') {
      this.successCount++;
      
      if (this.successCount >= this.successThreshold) {
        this.state = 'closed';
        this.successCount = 0;
      }
    }
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }
  
  shouldAttemptReset() {
    if (!this.lastFailureTime) {
      return true;
    }
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime;
    return timeSinceLastFailure >= this.failureTimeout;
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }
  
  reset() {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
  }
}

export { CircuitBreaker };
```

### Code example (API client with circuit breaker)

```js
// lib/integration/circuitBreakerClient.js

import { APIClient } from './apiClient';
import { CircuitBreaker } from './circuitBreaker';

class CircuitBreakerClient extends APIClient {
  constructor(config) {
    super(config);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker || {});
  }
  
  async request(endpoint, options = {}) {
    return this.circuitBreaker.execute(() => super.request(endpoint, options));
  }
  
  getCircuitBreakerState() {
    return this.circuitBreaker.getState();
  }
  
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
}

export { CircuitBreakerClient };
```

### Code example (multiple circuit breakers)

```js
// lib/integration/circuitBreakerRegistry.js

class CircuitBreakerRegistry {
  constructor() {
    this.circuitBreakers = new Map();
  }
  
  get(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    
    return this.circuitBreakers.get(serviceName);
  }
  
  execute(serviceName, requestFn) {
    const circuitBreaker = this.get(serviceName);
    return circuitBreaker.execute(requestFn);
  }
  
  getState(serviceName) {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    return circuitBreaker ? circuitBreaker.getState() : null;
  }
  
  getAllStates() {
    const states = {};
    this.circuitBreakers.forEach((cb, name) => {
      states[name] = cb.getState();
    });
    return states;
  }
}

export { CircuitBreakerRegistry };
```

### Tests

* Verify circuit breaker opens on failures
* Test circuit breaker closes on recovery
* Check half-open state behavior
* Verify circuit breaker prevents cascading failures

---

## 4) Retry logic with exponential backoff

**Location:** API client, service layer
**Expected**: Transient failures are handled with intelligent retry logic

### Steps

1. **Implement retry logic:**
   * Define retryable errors
   * Implement exponential backoff
   * Set maximum retry attempts
   * Add jitter to avoid thundering herd

2. **Handle retryable errors:**
   * Network errors
   * Timeout errors
   * 5xx server errors
   * Rate limit errors

3. **Implement backoff strategies:**
   * Exponential backoff
   * Linear backoff
   * Fixed delay
   * Jitter for randomness

### Code example (retry with exponential backoff)

```js
// lib/integration/retryHandler.js

class RetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000;
    this.maxDelay = options.maxDelay || 10000;
    this.retryableErrors = options.retryableErrors || [
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'EAI_AGAIN',
    ];
  }
  
  async execute(requestFn, attempt = 1) {
    try {
      return await requestFn();
    } catch (error) {
      if (this.shouldRetry(error, attempt)) {
        const delay = this.calculateDelay(attempt);
        await this.sleep(delay);
        return this.execute(requestFn, attempt + 1);
      }
      throw error;
    }
  }
  
  shouldRetry(error, attempt) {
    if (attempt >= this.maxRetries) {
      return false;
    }
    
    // Retry on network errors
    if (this.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Retry on timeout
    if (error.name === 'AbortError') {
      return true;
    }
    
    // Retry on 5xx errors
    if (error.message && error.message.includes('5')) {
      return true;
    }
    
    // Retry on rate limit errors
    if (error.message && error.message.includes('429')) {
      return true;
    }
    
    return false;
  }
  
  calculateDelay(attempt) {
    const delay = this.initialDelay * Math.pow(2, attempt - 1);
    const maxDelay = Math.min(delay, this.maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.1 * maxDelay;
    return maxDelay + jitter;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { RetryHandler };
```

### Code example (API client with retry)

```js
// lib/integration/retryClient.js

import { APIClient } from './apiClient';
import { RetryHandler } from './retryHandler';

class RetryClient extends APIClient {
  constructor(config) {
    super(config);
    this.retryHandler = new RetryHandler(config.retry || {});
  }
  
  async request(endpoint, options = {}) {
    return this.retryHandler.execute(() => super.request(endpoint, options));
  }
}

export { RetryClient };
```

### Code example (custom retry conditions)

```js
// lib/integration/customRetryHandler.js

class CustomRetryHandler extends RetryHandler {
  constructor(options = {}) {
    super(options);
    this.customRetryConditions = options.customRetryConditions || [];
  }
  
  shouldRetry(error, attempt) {
    // Check custom conditions
    for (const condition of this.customRetryConditions) {
      if (condition(error)) {
        return true;
      }
    }
    
    // Use default retry logic
    return super.shouldRetry(error, attempt);
  }
}

export { CustomRetryHandler };
```

### Code example (retry with context)

```js
// lib/integration/contextualRetry.js

class ContextualRetryHandler {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.retryContexts = new Map();
  }
  
  async execute(requestFn, context = {}) {
    const contextKey = this.getContextKey(context);
    
    if (!this.retryContexts.has(contextKey)) {
      this.retryContexts.set(contextKey, { attempts: 0 });
    }
    
    const retryContext = this.retryContexts.get(contextKey);
    
    try {
      const result = await requestFn();
      this.retryContexts.delete(contextKey);
      return result;
    } catch (error) {
      retryContext.attempts++;
      
      if (retryContext.attempts < this.maxRetries) {
        const delay = this.calculateDelay(retryContext.attempts);
        await this.sleep(delay);
        return this.execute(requestFn, context);
      }
      
      this.retryContexts.delete(contextKey);
      throw error;
    }
  }
  
  getContextKey(context) {
    return JSON.stringify(context);
  }
  
  calculateDelay(attempt) {
    return 1000 * Math.pow(2, attempt - 1);
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export { ContextualRetryHandler };
```

### Tests

* Verify retry logic works for retryable errors
* Test exponential backoff calculation
* Check max retry limit is respected
* Verify jitter is applied to delays

---

## 5) Webhook handling

**Location**: Webhook endpoints, event processing functions
**Expected**: Webhooks are securely received, validated, and processed reliably

### Steps

1. **Implement webhook security:**
   * Verify webhook signatures
   * Validate webhook source
   * Use HTTPS only
   * Implement IP whitelisting

2. **Validate webhook payload:**
   * Validate payload structure
   * Check required fields
   * Sanitize webhook data
   * Handle malformed payloads

3. **Process webhooks reliably:**
   * Acknowledge receipt immediately
   * Process asynchronously
   * Implement idempotency
   * Handle processing failures

### Code example (webhook signature verification)

```js
// lib/webhook/signatureVerifier.js

const crypto = require('crypto');

class WebhookSignatureVerifier {
  constructor(secret) {
    this.secret = secret;
  }
  
  verify(payload, signature, timestamp) {
    // Check timestamp to prevent replay attacks
    const now = Date.now();
    const webhookTime = parseInt(timestamp) * 1000;
    
    if (now - webhookTime > 300000) { // 5 minutes
      throw new Error('Webhook timestamp too old');
    }
    
    // Verify signature
    const expectedSignature = this.generateSignature(payload, timestamp);
    
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      throw new Error('Invalid webhook signature');
    }
    
    return true;
  }
  
  generateSignature(payload, timestamp) {
    const data = `${timestamp}.${payload}`;
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
  }
}

export { WebhookSignatureVerifier };
```

### Code example (webhook handler)

```js
// functions/webhooks/stripe/index.js

import { WebhookSignatureVerifier } from '../../../lib/webhook/signatureVerifier';

const verifier = new WebhookSignatureVerifier(process.env.STRIPE_WEBHOOK_SECRET);

export default async ({ req, res, log, error }) => {
  try {
    const signature = req.headers['stripe-signature'];
    const timestamp = req.headers['stripe-signature'].split(',')[1].split('=')[1];
    const payload = req.body;
    
    // Verify signature
    verifier.verify(payload, signature, timestamp);
    
    // Parse webhook event
    const event = JSON.parse(payload);
    
    // Acknowledge immediately
    res.json({ received: true }, 200);
    
    // Process asynchronously
    processWebhookEvent(event).catch(err => {
      error('Webhook processing failed:', err);
    });
    
  } catch (err) {
    error('Webhook verification failed:', err);
    return res.json({ error: 'Invalid signature' }, 401);
  }
};

async function processWebhookEvent(event) {
  const eventType = event.type;
  
  switch (eventType) {
    case 'payment_intent.succeeded':
      await handlePaymentSucceeded(event.data.object);
      break;
    case 'payment_intent.failed':
      await handlePaymentFailed(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${eventType}`);
  }
}

async function handlePaymentSucceeded(paymentIntent) {
  // Update order status
  await databases.updateDocument(
    databaseId,
    ordersCollectionId,
    paymentIntent.metadata.orderId,
    {
      status: 'paid',
      paymentId: paymentIntent.id,
      paidAt: new Date().toISOString(),
    }
  );
}

async function handlePaymentFailed(paymentIntent) {
  // Update order status
  await databases.updateDocument(
    databaseId,
    ordersCollectionId,
    paymentIntent.metadata.orderId,
    {
      status: 'payment_failed',
      paymentError: paymentIntent.last_payment_error?.message,
    }
  );
}
```

### Code example (idempotent webhook processing)

```js
// lib/webhook/idempotentProcessor.js

class IdempotentWebhookProcessor {
  constructor() {
    this.processedEvents = new Map();
  }
  
  async process(eventId, processorFn) {
    // Check if already processed
    if (this.processedEvents.has(eventId)) {
      console.log(`Event ${eventId} already processed, skipping`);
      return this.processedEvents.get(eventId);
    }
    
    // Process event
    const result = await processorFn();
    
    // Store result
    this.processedEvents.set(eventId, result);
    
    return result;
  }
  
  isProcessed(eventId) {
    return this.processedEvents.has(eventId);
  }
  
  clear() {
    this.processedEvents.clear();
  }
}

export { IdempotentWebhookProcessor };
```

### Code example (webhook queue for reliable processing)

```js
// lib/webhook/webhookQueue.js

class WebhookQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
  }
  
  async add(event) {
    this.queue.push(event);
    this.process();
  }
  
  async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      
      try {
        await this.processEvent(event);
      } catch (error) {
        console.error('Webhook processing failed:', error);
        
        // Requeue with backoff
        setTimeout(() => {
          this.queue.push(event);
          this.process();
        }, 5000);
      }
    }
    
    this.processing = false;
  }
  
  async processEvent(event) {
    // Process webhook event
    console.log('Processing webhook event:', event.id);
    // Implementation specific to your use case
  }
}

export { WebhookQueue };
```

### Code example (IP whitelisting)

```js
// lib/webhook/ipWhitelist.js

class IPWhitelist {
  constructor(allowedIPs) {
    this.allowedIPs = new Set(allowedIPs);
  }
  
  isAllowed(ip) {
    return this.allowedIPs.has(ip);
  }
  
  addIP(ip) {
    this.allowedIPs.add(ip);
  }
  
  removeIP(ip) {
    this.allowedIPs.delete(ip);
  }
}

// Usage in webhook handler
const webhookWhitelist = new IPWhitelist([
  '192.168.1.1',
  '10.0.0.1',
]);

export { IPWhitelist, webhookWhitelist };
```

### Tests

* Verify webhook signature validation works
* Test webhook payload validation
* Check idempotent processing
* Verify webhook queue handles failures

---

## 6) Integration monitoring and observability

**Location**: Logging functions, monitoring dashboards
**Expected**: Integration events are logged and monitored for health

### Code example (integration logger)

```js
// lib/integration/integrationLogger.js

class IntegrationLogger {
  constructor(serviceName) {
    this.serviceName = serviceName;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
    };
  }
  
  logRequest(request) {
    this.metrics.totalRequests++;
    console.log(`[${this.serviceName}] Request:`, {
      endpoint: request.endpoint,
      method: request.method,
      timestamp: new Date().toISOString(),
    });
  }
  
  logSuccess(response, duration) {
    this.metrics.successfulRequests++;
    this.metrics.totalTime += duration;
    
    console.log(`[${this.serviceName}] Success:`, {
      status: response.status,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
  
  logError(error, duration) {
    this.metrics.failedRequests++;
    this.metrics.totalTime += duration;
    
    console.error(`[${this.serviceName}] Error:`, {
      error: error.message,
      duration,
      timestamp: new Date().toISOString(),
    });
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0,
      averageDuration: this.metrics.totalRequests > 0
        ? this.metrics.totalTime / this.metrics.totalRequests
        : 0,
    };
  }
  
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTime: 0,
    };
  }
}

export { IntegrationLogger };
```

### Code example (health check)

```js
// lib/integration/healthCheck.js

class IntegrationHealthCheck {
  constructor(serviceName, checkFn) {
    this.serviceName = serviceName;
    this.checkFn = checkFn;
    this.lastCheck = null;
    this.healthy = true;
  }
  
  async check() {
    try {
      const startTime = Date.now();
      await this.checkFn();
      const duration = Date.now() - startTime;
      
      this.lastCheck = {
        status: 'healthy',
        duration,
        timestamp: new Date().toISOString(),
      };
      
      this.healthy = true;
      return this.lastCheck;
    } catch (error) {
      this.lastCheck = {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
      
      this.healthy = false;
      return this.lastCheck;
    }
  }
  
  isHealthy() {
    return this.healthy;
  }
  
  getLastCheck() {
    return this.lastCheck;
  }
}

export { IntegrationHealthCheck };
```

### Code example (combined integration client)

```js
// lib/integration/resilientClient.js

import { APIClient } from './apiClient';
import { RateLimiter } from './rateLimiter';
import { CircuitBreaker } from './circuitBreaker';
import { RetryHandler } from './retryHandler';
import { IntegrationLogger } from './integrationLogger';
import { IntegrationHealthCheck } from './healthCheck';

class ResilientClient {
  constructor(config) {
    this.serviceName = config.serviceName || 'integration';
    
    this.client = new APIClient(config);
    this.rateLimiter = new RateLimiter(config.rateLimit || {});
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker || {});
    this.retryHandler = new RetryHandler(config.retry || {});
    this.logger = new IntegrationLogger(this.serviceName);
    
    this.healthCheck = new IntegrationHealthCheck(
      this.serviceName,
      () => this.client.request('/health')
    );
  }
  
  async request(endpoint, options = {}) {
    const startTime = Date.now();
    
    this.logger.logRequest({ endpoint, method: options.method });
    
    try {
      await this.rateLimiter.acquire();
      
      const result = await this.circuitBreaker.execute(() =>
        this.retryHandler.execute(() =>
          this.client.request(endpoint, options)
        )
      );
      
      const duration = Date.now() - startTime;
      this.logger.logSuccess({ status: 200 }, duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.logError(error, duration);
      throw error;
    }
  }
  
  async healthCheck() {
    return this.healthCheck.check();
  }
  
  getMetrics() {
    return {
      ...this.logger.getMetrics(),
      circuitBreaker: this.circuitBreaker.getState(),
      rateLimit: {
        remaining: this.rateLimiter.getRemaining(),
        max: this.rateLimiter.maxRequests,
      },
    };
  }
}

export { ResilientClient };
```

### Tests

* Verify logging captures all events
* Test health check functionality
* Check metrics are accurate
* Verify combined client works correctly

---

## 7) Grep / codemod hints

* Find unhandled API calls: `rg "fetch\(|axios\(" -n | rg -v "try|catch|error"`
* Find missing rate limiting: `rg "api|integration" -n | rg -v "rate|limit|throttle"`
* Find missing retry logic: `rg "fetch\(|axios\(" -n | rg -v "retry|backoff"`
* Find missing circuit breaker: `rg "api|integration" -n | rg -v "circuit|breaker"`

---

## 8) Update changelog

After implementing integration patterns, update `DOCS/ChangeLog.md` with:
- API client abstractions implemented
- Rate limiting and throttling added
- Circuit breaker patterns implemented
- Retry logic with exponential backoff added
- Webhook handling implemented
- Integration monitoring and observability added
- Any breaking changes to integration layer
