# 🧪 Testing Strategy: Steam Trading Platform

**Version:** 1.0  
**Date:** 2026-01-25  
**Status:** Approved

---

## 1. Executive Summary
This document defines the testing strategy for the Steam Trading Platform. Our primary goal is to ensure **Production Readiness** with a focus on stability, financial accuracy, and bot reliability.

**Core KPI:** 99.9% uptime for trading operations.

## 2. Testing Levels (The Pyramid)

### 2.1 Unit Testing (Level 1)
*   **Focus:** Individual functions and classes in isolation.
*   **Tools:** `Jest`
*   **Coverage Target:** 80% of business logic.
*   **Critical Components:**
    *   `SteamRateLimiter`: Verify token bucket/window logic.
    *   `BotManager`: Verify state transitions (Offline -> Logging In -> Online).
    *   `PricingEngine`: Verify markup calculations and rounding.
    *   `CryptoService`: Verify shared secret encryption/decryption.

### 2.2 Integration Testing (Level 2)
*   **Focus:** Interaction between modules, Database, and Redis.
*   **Tools:** `Jest`, `Supertest`, `Docker Compose`
*   **Coverage Target:** 100% of API endpoints.
*   **Key Scenarios:**
    *   **Purchase Flow:** API -> DB Transaction -> Balance Deduction -> Trade Queue.
    *   **Inventory Sync:** Worker -> Steam API (Mocked) -> DB Insert/Update.
    *   **Bot Login:** Worker -> Steam User (Mocked) -> Session Storage (Redis).

### 2.3 End-to-End (E2E) Testing (Level 3)
*   **Focus:** Full user journey simulation.
*   **Tools:** `Playwright`
*   **Critical Flows:**
    1.  User Login (Steam OAuth) -> Deposit -> Buy Item -> Receive Trade Offer.
    2.  Bot Startup -> Inventory Sync -> Item appears on Frontend.

### 2.4 Load & Performance Testing (Level 4)
*   **Focus:** System behavior under stress.
*   **Tools:** `k6`
*   **Targets:**
    *   **Marketplace Page:** < 200ms (Cached), < 2s (Uncached).
    *   **Purchase Endpoint:** < 500ms response time.
    *   **Concurrency:** 100 simultaneous users / 10 concurrent purchases per second.

### 2.5 Security Testing (Level 5)
*   **Focus:** Vulnerability assessment.
*   **Tools:** `OWASP ZAP`, `npm audit`
*   **Checks:** SQL Injection, XSS, IDOR (Insecure Direct Object References), Rate Limiting bypass.

---

## 3. Quality Gates (Criteria for Production)

The system is considered "Production Ready" ONLY when:

| Metric | Threshold | Blocking? |
|--------|-----------|-----------|
| **Unit Test Pass Rate** | 100% | ✅ YES |
| **Integration Test Pass Rate** | 100% | ✅ YES |
| **E2E Critical Flows** | 100% Pass | ✅ YES |
| **High Severity Bugs** | 0 Open | ✅ YES |
| **Steam Rate Limit Hits** | 0 (Internal Limiter works) | ✅ YES |
| **Bot Login Reliability** | 95% Success on cold start | ✅ YES |
| **Performance (p95)** | < 500ms | ⚠️ Warn |

---

## 4. Test Environments

| Environment | Description | Data | Deploy Trigger |
|-------------|-------------|------|----------------|
| **Local** | Developer machine | Seed/Mock | Manual |
| **CI (GitHub)** | Ephemeral containers | Mock | PR Creation |
| **Staging** | Replica of Prod | Anonymized Dump | Merge to Main |
| **Production** | Live System | Live Real Data | Manual Release |

---

## 5. Defect Management

All bugs must be categorized:
*   **P0 (Critical):** Data loss, financial discrepancy, bot ban risk. **Fix Immediately.**
*   **P1 (High):** Core flow broken (e.g., cannot login). **Fix before release.**
*   **P2 (Medium):** UX issues, minor visual bugs. **Fix in next sprint.**
*   **P3 (Low):** Typo, nice-to-have. **Backlog.**
