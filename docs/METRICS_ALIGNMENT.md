# Metrics Alignment Documentation

This document describes the alignment between the Grafana dashboards and the metrics exported by the Steam Marketplace backend application.

## Overview

The monitoring stack uses Prometheus for metrics collection and Grafana for visualization. The backend application exports comprehensive metrics using the `prom-client` library, and the Grafana dashboards are configured to display these metrics in meaningful ways.

## Metrics Architecture

```
Backend Application → Prometheus → Grafana Dashboards
       ↓                  ↓              ↓
   prom-client      Scrapes metrics   Visualizes data
   (Node.js)        (every 30s)      (real-time)
```

## Dashboard Files

### 1. Overview Dashboard (`docker/grafana/dashboards/overview.json`)
**Purpose**: System-wide performance and health monitoring

**Key Metrics Used**:
- `http_requests_total` - Total HTTP requests
- `http_request_duration_seconds` - Request response times
- `system_cpu_usage_percent` - CPU utilization
- `system_memory_usage_bytes` - Memory consumption
- `system_uptime_seconds` - Application uptime

### 2. Database Dashboard (`docker/grafana/dashboards/database.json`)
**Purpose**: Database performance and cache efficiency monitoring

**Key Metrics Used**:
- `db_connection_pool_size` - Database connection pool size
- `db_query_duration_seconds` - Database query performance
- `db_active_connections` - Active database connections
- `cache_hits_total` - Cache hit count
- `cache_misses_total` - Cache miss count
- `cache_size_bytes` - Cache memory usage

### 3. Business Dashboard (`docker/grafana/dashboards/business.json`)
**Purpose**: Business metrics and operational monitoring

**Key Metrics Used**:
- `users_total` - Active users
- `inventories_total` - User inventories
- `trades_total` - Trade operations
- `wallet_balance_total` - Wallet balances
- `bots_total` - Bot management
- `queue_jobs_total` - Queue processing

## Backend Metrics Service

### Location
`apps/backend/src/common/modules/metrics.service.ts`

### Metrics Categories

#### HTTP Metrics
```typescript
// HTTP request tracking
http_requests_total: Counter<string>;
http_request_duration_seconds: Histogram<string>;
http_request_size_bytes: Histogram<string>;
http_response_size_bytes: Histogram<string>;
```

**Labels**: `method`, `route`, `status_code`

#### Business Metrics
```typescript
users_total: Gauge<string>;           // Label: status
inventories_total: Gauge<string>;     // Label: app_id
trades_total: Gauge<string>;          // Label: status
wallet_balance_total: Gauge<string>;  // Label: currency
prices_total: Gauge<string>;          // Label: app_id
```

#### Bot Metrics
```typescript
bots_total: Gauge<string>;            // Label: status
bots_online: Gauge<string>;           // Label: bot_id
bots_active: Gauge<string>;           // Label: bot_id
bots_busy: Gauge<string>;             // Label: bot_id
bot_trade_count: Gauge<string>;       // Label: bot_id
bot_uptime_seconds: Gauge<string>;    // Label: bot_id
bot_errors_total: Counter<string>;    // Labels: bot_id, error_type
```

#### Queue Metrics
```typescript
queue_jobs_total: Counter<string>;        // Labels: queue_name, status
queue_jobs_active: Gauge<string>;         // Label: queue_name
queue_jobs_completed: Counter<string>;    // Label: queue_name
queue_jobs_failed: Counter<string>;       // Label: queue_name
queue_failure_rate: Gauge<string>;        // Label: queue_name
queue_processing_duration_seconds: Histogram<string>; // Label: queue_name
```

#### Cache Metrics
```typescript
cache_hits_total: Counter<string>;        // Label: cache_type
cache_misses_total: Counter<string>;      // Label: cache_type
cache_operations_total: Counter<string>;  // Labels: operation, cache_type
cache_size_bytes: Gauge<string>;          // Label: cache_type
```

#### Database Metrics
```typescript
db_connection_pool_size: Gauge<string>;   // Label: db_type
db_query_duration_seconds: Histogram<string>; // Labels: db_type, query_type
db_active_connections: Gauge<string>;     // Label: db_type
```

#### System Metrics
```typescript
system_cpu_usage_percent: Gauge<string>;
system_memory_usage_bytes: Gauge<string>;  // Label: type
system_uptime_seconds: Gauge<string>;
```

## Prometheus Configuration

### Location
`docker/prometheus/prometheus.yml`

### Scraping Configuration
```yaml
scrape_configs:
  # Backend services
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
    metrics_path: '/api/metrics'
    scrape_interval: 30s
    scrape_timeout: 10s

  # Database exporters
  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']
    scrape_interval: 30s

  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']
    scrape_interval: 30s
```

## Verification Process

### Automated Verification
Run the verification script to check metrics alignment:

```bash
./scripts/verify-metrics.sh
```

This script:
1. Checks that all metrics referenced in dashboards are exported by the backend
2. Verifies that required labels are present
3. Tests the metrics endpoint accessibility
4. Provides a summary of findings

### Manual Verification Steps

1. **Start the Backend Application**
   ```bash
   cd apps/backend
   npm run start:dev
   ```

2. **Access Metrics Endpoint**
   ```bash
   curl http://localhost:3001/api/metrics
   ```

3. **Start Monitoring Stack**
   ```bash
   docker-compose up monitoring
   ```

4. **Access Grafana**
   - URL: http://localhost:3002
   - Default credentials: admin/admin

5. **Verify Dashboard Data**
   - Check that panels are showing data
   - Verify no "No data" or "Metric not found" errors
   - Confirm metric values are reasonable

## Load Testing Integration

The load testing suite (`scripts/load-test.js`) generates meaningful metrics data:

```bash
# Run load test to generate metrics
CONFIG_PROFILE=load artillery run scripts/load-test.js

# Monitor metrics during test
./scripts/verify-metrics.sh
```

This helps validate:
- Metrics are being collected correctly
- Dashboard panels show real-time data
- Alerting thresholds are appropriate
- Performance baselines are established

## Alerting Configuration

### Location
`docker/prometheus/alerts.yml`

### Alert Rules
- High error rate (>5%)
- Slow response times (95th percentile >1s)
- Database connection pool exhaustion
- Cache hit rate degradation
- Bot error rate spikes

## Troubleshooting

### Common Issues

1. **"Metric not found" in Grafana**
   - Verify backend is running and exporting metrics
   - Check Prometheus targets status
   - Ensure metric names match exactly

2. **No data in dashboard panels**
   - Check time range selection
   - Verify metric labels are being populated
   - Check Prometheus query syntax

3. **High cardinality warnings**
   - Review route normalization in MetricsInterceptor
   - Ensure dynamic IDs are parameterized
   - Monitor label value explosion

### Debug Commands

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Query specific metrics
curl -G http://localhost:9090/api/v1/query \
  --data-urlencode 'query=http_requests_total'

# Check Grafana datasource
curl http://admin:admin@localhost:3002/api/datasources
```

## Best Practices

1. **Metric Naming**
   - Use snake_case for metric names
   - Include units in names (e.g., `_seconds`, `_bytes`)
   - Use descriptive, consistent names

2. **Label Management**
   - Limit label cardinality
   - Use consistent label names
   - Avoid high-cardinality labels like user IDs

3. **Dashboard Design**
   - Use appropriate visualization types
   - Set meaningful thresholds
   - Include context and annotations

4. **Alerting**
   - Set actionable alert conditions
   - Include runbooks and escalation paths
   - Test alert notifications

## Performance Considerations

- Metrics collection adds minimal overhead
- Histogram buckets should be carefully chosen
- High-frequency metrics should be sampled
- Regular cleanup of old metric data

## Security Considerations

- Metrics endpoint accessible to monitoring systems only
- Sensitive data excluded from metric labels
- Authentication/authorization for Grafana access
- Network isolation for monitoring stack

This alignment ensures that the monitoring infrastructure provides comprehensive visibility into the Steam Marketplace application's performance, health, and business metrics.