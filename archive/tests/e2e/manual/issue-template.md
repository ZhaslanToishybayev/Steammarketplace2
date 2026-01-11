# Issue Template for E2E Testing

Use this template to document and track issues found during E2E testing.

## Issue Summary

**One-line description:**
<!-- Brief description of the issue -->

## Severity

<!-- Choose one -->
- [ ] **Critical** - Blocks core user flow, system unusable
- [ ] **High** - Major feature broken, significant impact
- [ ] **Medium** - Minor feature issue, workaround available
- [ ] **Low** - Cosmetic issue or enhancement

## Module

<!-- Choose one or more -->
- [ ] Auth (Steam OAuth, Trade URL, Session Management)
- [ ] Inventory (Sync, Filtering, Search, Pagination)
- [ ] Market (Listings, Pricing, Trends, Search)
- [ ] Trading (Creation, Bot Assignment, Status Updates)
- [ ] Wallet (Balance, Deposits, Withdrawals, Transactions)
- [ ] Admin (Dashboard, User Management, Bot Management)
- [ ] Frontend (UI/UX, Responsiveness, Accessibility)
- [ ] Backend (API, Database, Authentication)
- [ ] Infrastructure (Docker, Monitoring, Performance)

## Steps to Reproduce

<!-- Numbered list of exact steps to reproduce the issue -->
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Prerequisites:**
<!-- Any setup required before reproducing the issue -->
- Logged in as: [User/Admin]
- Browser/Device: [Specific browser or device]
- Test data: [Specific test data or user account needed]

## Expected Behavior

<!-- What should have happened -->

## Actual Behavior

<!-- What actually happened -->

## Environment

**System Information:**
- OS: [e.g. Windows 11, macOS 14.0, Ubuntu 22.04]
- Browser: [e.g. Chrome 120, Firefox 119, Safari 17]
- Browser Version: [e.g. 120.0.6093.134]
- Node.js Version: [e.g. 18.19.0]
- Docker Version: [e.g. 24.0.6]

**Application Information:**
- Backend Version: [e.g. v1.0.0]
- Frontend Version: [e.g. v1.0.0]
- Database Version: [e.g. PostgreSQL 15.5, MongoDB 6.0]
- Test Environment: [Development/Staging/Production]

**Network Information:**
- Network Type: [e.g. WiFi, Ethernet, Mobile]
- Connection Speed: [e.g. 100Mbps, 4G, Slow 3G]

## Logs/Screenshots

<!-- Attach relevant logs, screenshots, or network traces -->

### Browser Console Logs
```
<!-- Copy and paste browser console logs here -->
```

### Network Traces
```
<!-- Copy and paste relevant network request/response details -->
```

### Backend Logs
```
<!-- Copy and paste relevant backend logs from apps/backend/logs/ -->
```

### Screenshots
<!-- Attach screenshots showing the issue -->

### Video Recording
<!-- Link to video recording if applicable -->

## Database State

<!-- Document relevant database records at time of issue -->

### User Information
```sql
SELECT * FROM users WHERE steam_id = 'USER_STEAM_ID';
```

### Trade Information (if applicable)
```sql
SELECT * FROM trades WHERE user_id = USER_ID ORDER BY created_at DESC LIMIT 5;
```

### Bot Information (if applicable)
```sql
SELECT * FROM bots WHERE status = 'ERROR' OR status = 'OFFLINE';
```

### Balance Information (if applicable)
```sql
SELECT * FROM balances WHERE user_id = USER_ID;
```

### Transaction Information (if applicable)
```sql
SELECT * FROM transactions WHERE user_id = USER_ID ORDER BY created_at DESC LIMIT 10;
```

## Metrics

<!-- Include relevant metrics if available -->

### Performance Metrics
- Page Load Time: _____ seconds
- API Response Time: _____ milliseconds
- Database Query Time: _____ milliseconds

### Error Rate
- Error Rate: _____%
- Total Requests: _____
- Failed Requests: _____

### System Metrics
- CPU Usage: _____%
- Memory Usage: _____MB
- Disk Usage: _____%

### Prometheus Metrics (if available)
```
<!-- Include relevant Prometheus metric queries and results -->
```

## Workaround

<!-- Describe any temporary workaround if known -->

- **Workaround:** [Description of temporary fix]
- **Impact:** [Impact of using workaround]
- **Duration:** [How long workaround can be used]

## Root Cause Analysis

<!-- Analysis of underlying cause -->

### Initial Investigation
<!-- Initial thoughts on what might be causing the issue -->

### Investigation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Root Cause
<!-- Detailed explanation of the root cause -->

### Contributing Factors
- [Factor 1]
- [Factor 2]
- [Factor 3]

## Proposed Fix

### Solution Description
<!-- Detailed description of the proposed fix -->

### Implementation Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Files to Modify
- `apps/backend/src/modules/[module]/[file].ts`
- `apps/frontend/src/app/[page]/[file].tsx`
- `docker-compose.yml`
- `package.json`

### Code Changes
```typescript
// Before
// [Current problematic code]

// After
// [Fixed code]
```

### Database Changes
<!-- Any database migrations or changes needed -->

### Configuration Changes
<!-- Any configuration updates needed -->

## Testing Plan

### Test Cases
- [ ] Unit tests for affected components
- [ ] Integration tests for API endpoints
- [ ] E2E tests for user workflows
- [ ] Regression tests for related features

### Test Environment
- [ ] Local development
- [ ] Staging environment
- [ ] Production (if safe)

### Verification Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Related Issues

<!-- Links to related issues or pull requests -->
- Issue #XXX: [Related issue title]
- PR #XXX: [Related pull request title]
- [External link to related documentation]

## Approval

**Reported by:** [Name]
**Reported on:** [Date]
**Assigned to:** [Developer name]
**Priority:** [P0/P1/P2/P3]
**Estimated effort:** [Time estimate]

**Approval Status:**
- [ ] Reported
- [ ] Investigating
- [ ] In Progress
- [ ] Ready for Testing
- [ ] Ready for Review
- [ ] Completed
- [ ] Closed

## Follow-up Actions

### Immediate Actions
- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

### Long-term Actions
- [ ] [Action 1]
- [ ] [Action 2]
- [ ] [Action 3]

### Preventive Measures
- [ ] [Measure 1]
- [ ] [Measure 2]
- [ ] [Measure 3]

---

**Note:** This template should be filled out completely for proper issue tracking and resolution. Incomplete issue reports may be returned for additional information.