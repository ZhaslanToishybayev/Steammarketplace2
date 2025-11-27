# Admin Module

The Admin Module provides comprehensive administrative functionality for managing the Steam Marketplace platform. It includes user management, trade dispute resolution, system configuration, audit logging, and platform monitoring capabilities.

## Overview

The Admin Module is a centralized administration system that allows administrators and moderators to:

- **Dashboard**: Monitor platform statistics and health metrics
- **User Management**: Ban, suspend, verify, and manage user roles
- **Trade Management**: Force complete/cancel trades, process refunds, and manage disputes
- **System Configuration**: Dynamic configuration management with audit trails
- **Audit Logging**: Comprehensive logging of all admin actions with export capabilities
- **Automated Tasks**: Scheduled cleanup, reporting, and maintenance operations

## Architecture

### Entities

#### AuditLog
Stores comprehensive audit trail of all admin actions:
- `adminId`: ID of the admin who performed the action
- `action`: Type of action performed (e.g., 'user.ban', 'trade.refund')
- `targetType`: Type of entity affected (USER, TRADE, BOT, CONFIG, etc.)
- `targetId`: ID of the affected entity
- `changesBefore/After`: JSON snapshots of entity state
- `metadata`: Additional context and request information
- `ipAddress/userAgent`: Request tracking information

#### TradeDispute
Manages trade disputes and their resolution workflow:
- `tradeId`: Associated trade ID
- `userId`: User who reported the dispute
- `status`: OPEN, IN_PROGRESS, RESOLVED, REJECTED
- `priority`: LOW, MEDIUM, HIGH, CRITICAL
- `category`: SCAM, ITEM_NOT_RECEIVED, WRONG_ITEM, PAYMENT_ISSUE, OTHER
- `resolutionType`: REFUND, CANCEL, FORCE_COMPLETE, NO_ACTION
- `assignedAdminId`: Admin responsible for resolution

#### SystemConfig
Dynamic system configuration with type validation:
- `key`: Configuration key (e.g., 'maintenance_mode')
- `value`: Configuration value (stored as string, parsed based on valueType)
- `valueType`: STRING, NUMBER, BOOLEAN, JSON
- `category`: Organization category (e.g., 'trading', 'payment', 'system')
- `isPublic`: Whether config is visible to non-admins
- `isEditable`: Whether config can be modified

### Services

#### AuditLogService
- `logAction()`: Creates audit log entries for admin actions
- `getAuditLogs()`: Retrieves audit logs with filtering and pagination
- `getAdminActivitySummary()`: Aggregates admin activity statistics
- `exportAuditLogs()`: Exports audit logs in JSON/CSV format

#### AdminUserService
- `getAllUsers()`: Lists users with filtering and search capabilities
- `banUser()/unbanUser()`: Manages user bans with optional duration
- `suspendUser()/activateUser()`: Controls user account activation
- `updateUserRole()`: Changes user roles (USER/MODERATOR/ADMIN)
- `verifyUser()`: Marks users as verified
- `getUserActivityReport()`: Generates comprehensive user activity reports

#### TradeDisputeService
- `createDispute()`: Creates new trade disputes
- `getDisputes()`: Lists disputes with filtering and pagination
- `assignDispute()`: Assigns disputes to specific admins
- `resolveDispute()`: Resolves disputes with specific actions
- `getDisputeStatistics()`: Aggregates dispute metrics

#### SystemConfigService
- `getConfig()`: Retrieves configuration values with caching
- `createConfig()`: Creates new configuration entries
- `updateConfig()`: Updates existing configurations
- `bulkUpdateConfigs()`: Updates multiple configs in transaction
- `getPublicConfigs()`: Returns public configurations for frontend

#### AdminDashboardService
- `getPlatformStatistics()`: Comprehensive platform metrics
- `getUserGrowthMetrics()`: User growth trends over time
- `getTradeMetrics()`: Trade volume and revenue analytics
- `getBotHealthMetrics()`: Bot performance and uptime monitoring
- `getSystemHealth()`: Database, Redis, and queue health status
- `getAlerts()`: System alerts and warnings

### Controllers

#### AdminDashboardController
- `GET /admin/dashboard/statistics` - Platform statistics
- `GET /admin/dashboard/metrics/users` - User growth metrics
- `GET /admin/dashboard/metrics/trades` - Trade analytics
- `GET /admin/dashboard/metrics/bots` - Bot health metrics
- `GET /admin/dashboard/system-health` - System health status
- `GET /admin/dashboard/alerts` - Current system alerts

#### AdminUserController
- `GET /admin/users` - List users with filters
- `GET /admin/users/:id` - Get user details
- `POST /admin/users/:id/ban` - Ban user
- `POST /admin/users/:id/unban` - Unban user
- `POST /admin/users/:id/suspend` - Suspend user
- `POST /admin/users/:id/activate` - Activate user
- `PATCH /admin/users/:id/role` - Update user role
- `POST /admin/users/:id/verify` - Verify user
- `GET /admin/users/:id/activity` - User activity report

#### AdminTradeController
- `GET /admin/trades` - List trades
- `GET /admin/trades/:id` - Get trade details
- `POST /admin/trades/:id/force-complete` - Force complete trade
- `POST /admin/trades/:id/force-cancel` - Force cancel trade
- `POST /admin/trades/:id/refund` - Process trade refund
- `GET /admin/trades/disputes` - List trade disputes
- `POST /admin/trades/disputes/:id/assign` - Assign dispute to admin
- `POST /admin/trades/disputes/:id/resolve` - Resolve dispute
- `GET /admin/trades/disputes/statistics` - Dispute statistics

#### AdminConfigController
- `GET /admin/config` - List configurations
- `GET /admin/config/public` - Get public configurations (no auth required)
- `POST /admin/config` - Create new configuration
- `PATCH /admin/config/:key` - Update configuration
- `DELETE /admin/config/:key` - Delete configuration
- `POST /admin/config/bulk` - Bulk update configurations

#### AdminAuditController
- `GET /admin/audit-logs` - List audit logs with filters
- `GET /admin/audit-logs/:id` - Get specific audit log
- `GET /admin/audit-logs/admin/:id/summary` - Admin activity summary
- `GET /admin/audit-logs/export` - Export audit logs (JSON/CSV)

### Interceptors

#### AuditLogInterceptor
Automatically logs all admin actions:
- Extracts action type from HTTP method and route
- Captures before/after state for modifications
- Records IP address and user agent
- Skips GET requests for data viewing (configurable with `@SkipAuditLog()` decorator)
- Handles both successful actions and errors

### Processors

#### AdminOperationsProcessor
Background job processing:
- `unban-user`: Automatically unbans users when temporary bans expire
- `cleanup-old-audit-logs`: Removes audit logs older than retention period
- `generate-report`: Creates periodic reports (daily/weekly/monthly)

### Schedulers

#### AdminCleanupScheduler
Automated maintenance tasks:
- Daily audit log cleanup at 2 AM
- Daily report generation at 6 AM
- Weekly report generation every Monday
- Monthly report generation on 1st of month
- Hourly expired ban checking
- Annual maintenance tasks

## Authentication & Authorization

All admin endpoints require:
1. **JWT Authentication**: Valid JWT token from authenticated user
2. **Admin Guard**: User must have ADMIN or MODERATOR role
3. **Role-based Access Control**:
   - ADMIN: Full access to all admin functionality
   - MODERATOR: Limited access (cannot manage other admins, view all audit logs)

### Permission System
The module uses a role-based permission system:
- **Admin Only**: User role management, system configuration, audit log management
- **Moderator + Admin**: User banning/suspension, trade management, dispute resolution
- **Public**: System configuration values marked as `isPublic = true`

## Audit Logging

### Automatic Logging
The `AuditLogInterceptor` automatically captures:
- All admin route requests (POST, PUT, PATCH, DELETE)
- Request metadata (IP, user agent, timestamp)
- Entity state changes (before/after snapshots)
- Error conditions and failed operations

### Manual Logging
Services can manually log actions using `AuditLogService.logAction()`:
```typescript
await this.auditLogService.logAction(
  adminId,
  'user.update_role',
  AuditTargetType.USER,
  userId,
  { role: oldRole },
  { role: newRole },
  { reason: 'Performance review' },
  request
);
```

### Log Export
Audit logs can be exported in multiple formats:
- **JSON**: Structured data for programmatic processing
- **CSV**: Spreadsheet-compatible format for analysis
- **Filters**: Export specific admin actions, date ranges, or target types

## Dispute Resolution Workflow

### 1. Dispute Creation
Users can report trade issues through the frontend, creating disputes with:
- Category (SCAM, ITEM_NOT_RECEIVED, etc.)
- Detailed reason and evidence
- Automatic status: OPEN

### 2. Assignment
Admins can assign disputes to specific team members:
- Load balancing based on current workload
- Skill-based assignment for complex cases
- Status changes to: IN_PROGRESS

### 3. Investigation
Admins review evidence and communicate:
- Add internal notes for team reference
- Update priority based on severity
- Escalate to higher priority if needed

### 4. Resolution
Final resolution with appropriate action:
- **REFUND**: Credit user's balance or original payment method
- **CANCEL**: Cancel trade and return items
- **FORCE_COMPLETE**: Complete trade as successful
- **NO_ACTION**: No action required

### 5. Audit Trail
All actions are logged with full transparency:
- Who handled the dispute
- What evidence was reviewed
- Final decision and reasoning

## System Configuration

### Dynamic Configuration
The system supports runtime configuration changes:
- **Type Safety**: Strong typing with validation (STRING, NUMBER, BOOLEAN, JSON)
- **Caching**: Redis-based caching with 1-hour TTL
- **Audit Trail**: All changes logged with before/after values
- **Public Access**: Select configurations visible to frontend

### Common Configuration Keys
```typescript
// Trading
'max_trade_value': '10000'
'min_trade_value': '1'
'trading_fee_percentage': '2.5'

// System
'maintenance_mode': 'false'
'audit_log_retention_days': '365'

// Bots
'bot_max_concurrent_trades': '10'
'dispute_resolution_days': '30'
```

### Bulk Updates
Multiple configurations can be updated atomically:
```typescript
await this.systemConfigService.bulkUpdateConfigs(adminId, [
  { key: 'maintenance_mode', value: 'true' },
  { key: 'max_trade_value', value: '5000' }
]);
```

## Scheduled Jobs

### Daily Tasks (2 AM)
- **Audit Log Cleanup**: Remove logs older than retention period
- **Expired Ban Check**: Process users with expired temporary bans
- **Daily Report Generation**: Create daily platform statistics

### Weekly Tasks (Monday 12 AM)
- **Weekly Report Generation**: Aggregate weekly metrics
- **System Health Report**: Comprehensive system status

### Monthly Tasks (1st of Month 12 AM)
- **Monthly Report Generation**: Monthly business metrics
- **Data Archival**: Archive old data to cold storage

### Continuous Tasks
- **Expired Ban Monitoring**: Every hour check for expired bans
- **System Health Checks**: Continuous monitoring of critical systems

## Environment Variables

```bash
# Admin Module Configuration
AUDIT_LOG_RETENTION_DAYS=365                    # How long to keep audit logs
ADMIN_REPORT_EMAIL=admin@steam-marketplace.com  # Email for automated reports
ENABLE_AUTO_AUDIT_LOGGING=true                  # Toggle automatic audit logging
MAX_DISPUTE_RESOLUTION_DAYS=30                  # Auto-close disputes after X days
SYSTEM_MAINTENANCE_MODE=false                   # Global maintenance mode
```

## Usage Examples

### Creating a User Ban
```bash
POST /admin/users/123e4567-e89b-12d3-a456-426614174000/ban
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "reason": "Violation of terms of service",
  "duration": 24
}
```

### Resolving a Trade Dispute
```bash
POST /admin/trades/disputes/456e7890-e89b-12d3-a456-426614174001/resolve
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "resolutionType": "REFUND",
  "resolution": "After reviewing the evidence, the user will receive a full refund."
}
```

### Exporting Audit Logs
```bash
GET /admin/audit-logs/export?format=csv&dateFrom=2023-01-01&dateTo=2023-12-31
Authorization: Bearer <jwt_token>
```

### Updating System Configuration
```bash
PATCH /admin/config/maintenance_mode
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "value": "true"
}
```

## Development Notes

### Extending the Module

#### Adding New Admin Actions
1. Create appropriate DTO for validation
2. Add controller endpoint with proper guards
3. Implement service method with audit logging
4. Add interceptor skip decorator if action should not be logged
5. Update documentation

#### Adding New Configuration Keys
1. Define configuration in `SystemConfigService` constants
2. Add validation logic for the specific configuration
3. Implement any side effects (e.g., cache invalidation)
4. Add to documentation with appropriate category

#### Adding New Dispute Categories
1. Extend `DisputeCategory` enum
2. Update frontend to support new category
3. Add category-specific handling logic if needed
4. Update dispute statistics aggregation

### Best Practices

#### Audit Logging
- Always log significant admin actions
- Include relevant context in metadata
- Use structured data for better analysis
- Consider performance impact of logging

#### Error Handling
- Use custom exceptions for admin operations
- Provide clear error messages for debugging
- Log errors for monitoring and alerting
- Gracefully handle database connection issues

#### Performance Considerations
- Use pagination for large datasets
- Implement caching for frequently accessed data
- Optimize database queries with proper indexing
- Consider background processing for heavy operations

#### Security
- Validate all user inputs with DTOs
- Use parameterized queries to prevent SQL injection
- Implement proper authorization checks
- Sanitize data before logging or display

### Testing

#### Unit Tests
Test individual service methods with mocked dependencies:
```typescript
describe('AdminUserService', () => {
  it('should ban user successfully', async () => {
    const result = await service.banUser('admin-id', 'user-id', 'Test reason', 24);
    expect(result.isBanned).toBe(true);
  });
});
```

#### Integration Tests
Test complete workflows with real database:
```typescript
describe('Admin Module Integration', () => {
  it('should create dispute and resolve it', async () => {
    const dispute = await disputeService.createDispute(userId, tradeId, category, reason);
    const resolved = await disputeService.resolveDispute(adminId, dispute.id, 'REFUND', 'Test resolution');
    expect(resolved.status).toBe('RESOLVED');
  });
});
```

#### E2E Tests
Test complete admin workflows:
```typescript
describe('Admin E2E', () => {
  it('should handle complete user ban workflow', async () => {
    // Login as admin
    // Ban user
    // Verify audit log created
    // Verify user status updated
    // Unban user after duration
  });
});
```