# 🤖 Automated Test Plan

This document outlines the roadmap for implementing automated tests for the Steam Trading Platform.

## 1. Unit Tests (Jest)

**Location:** `apps/backend/src/tests/unit/`

### 1.1 Steam Rate Limiter (`steam-rate-limiter.test.js`)
*   [ ] **Test 1:** Verify token bucket allows < 20 req/min.
*   [ ] **Test 2:** Verify `waitForSlot()` sleeps when limit reached.
*   [ ] **Test 3:** Verify window reset logic (TTL).
*   [ ] **Test 4:** Verify Redis failure fallback (fail open/closed logic).

### 1.2 Bot Manager (`bot-manager.test.js`)
*   [ ] **Test 1:** `_loginWithRetry` retries on error.
*   [ ] **Test 2:** Exponential backoff calculation correctness.
*   [ ] **Test 3:** `getAvailableBot` returns only online bots.

## 2. Integration Tests (Jest + Supertest)

**Location:** `apps/backend/src/tests/integration/`

### 2.1 Purchase Flow (`purchase.test.js`)
*   [ ] **Test 1:** POST `/api/escrow/buy/:id` (Happy Path).
    *   Setup: Insert User ($100), Listing ($50).
    *   Action: Buy.
    *   Assert: User Balance=$50, Listing=Sold, Trade=Created.
*   [ ] **Test 2:** POST `/api/escrow/buy/:id` (Insufficient Funds).
    *   Setup: User ($0).
    *   Assert: 400 Bad Request, Balance=$0.
*   [ ] **Test 3:** Concurrent Double Spend.
    *   Action: 2 parallel requests for same item.
    *   Assert: 1 Success, 1 Failure (409 Conflict).

## 3. End-to-End (Playwright)

**Location:** `apps/backend/src/tests/e2e/`

*   [ ] **Spec 1:** Guest user -> Login -> Redirect to Dashboard.
*   [ ] **Spec 2:** Marketplace loads items -> Click Item -> Modal opens.
*   [ ] **Spec 3:** Admin Panel -> Bots status check.

## 4. Implementation Plan

1.  **Install Dependencies:**
    ```bash
    npm install --save-dev jest supertest ioredis-mock pg-mem
    ```

2.  **Configure Jest:**
    Create `jest.config.js` with mapping for `@/` paths.

3.  **Write Unit Tests:**
    Start with Rate Limiter (Highest Risk).

4.  **Write Integration Tests:**
    Focus on Purchase Flow (Highest Business Value).
