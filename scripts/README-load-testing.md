# Load Testing Documentation

This document describes how to run load tests for the Steam Marketplace application using Artillery.js with different traffic profiles.

## Overview

The load testing suite supports multiple traffic profiles to simulate different real-world scenarios:

- **Smoke Test**: Quick validation of basic functionality
- **Load Test**: Normal expected load patterns
- **Stress Test**: Beyond normal load to find breaking points
- **Spike Test**: Sudden load changes and recovery
- **Endurance Test**: Long duration at moderate load
- **Development**: Original configuration for development testing

## Prerequisites

- Node.js and npm installed
- Artillery.js installed globally: `npm install -g artillery`
- Backend application running
- Optional: Authentication token for authenticated scenarios

## Quick Start

### Basic Usage

```bash
# Run development profile (default)
artillery run scripts/load-test.js

# Run specific profile
artillery run scripts/load-test.js --config-profile=load

# Run with environment variables
CONFIG_PROFILE=stress API_URL=https://your-api-url.com artillery run scripts/load-test.js
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CONFIG_PROFILE` | Traffic profile to use | `development` |
| `API_URL` | Target API URL | `http://localhost:3001` |
| `AUTH_TOKEN` | JWT token for authenticated scenarios | None |

### Available Profiles

#### 1. Smoke Test (`smoke`)
- **Duration**: 1 minute
- **Purpose**: Quick validation of basic functionality
- **Load Pattern**: Low and steady traffic
- **Use Case**: CI/CD pipelines, deployment validation

#### 2. Load Test (`load`)
- **Duration**: 10 minutes
- **Purpose**: Normal expected load patterns
- **Load Pattern**: Warm-up → Normal load → Peak load → Cool-down
- **Use Case**: Performance validation, capacity planning

#### 3. Stress Test (`stress`)
- **Duration**: 12 minutes
- **Purpose**: Find breaking points and system limits
- **Load Pattern**: Progressive overload beyond normal capacity
- **Use Case**: System limits discovery, performance tuning

#### 4. Spike Test (`spike`)
- **Duration**: 6 minutes
- **Purpose**: Test sudden load changes and recovery
- **Load Pattern**: Baseline → Rapid spike → Peak → Rapid decline → Recovery
- **Use Case**: Flash sale scenarios, viral traffic spikes

#### 5. Endurance Test (`endurance`)
- **Duration**: 35 minutes
- **Purpose**: Long-duration stability testing
- **Load Pattern**: Warm-up → Sustained moderate load → Cool-down
- **Use Case**: Memory leak detection, long-term stability

#### 6. Development (`development`)
- **Duration**: 11 minutes
- **Purpose**: Original development configuration
- **Load Pattern**: Traditional ramp-up and spike pattern
- **Use Case**: Development and debugging

## Test Scenarios

### Authenticated User Flows

1. **Inventory Sync Flow**
   - Steam OAuth authentication
   - Inventory synchronization
   - Statistics retrieval
   - **Weight**: 25-30% depending on profile

2. **Trade Operations Flow**
   - Trade history retrieval
   - Trade statistics
   - Trade offer creation
   - Trade management
   - **Weight**: 20-25% depending on profile

3. **Wallet Operations Flow**
   - Balance checking
   - Transaction history
   - Deposit processing
   - **Weight**: 15-20% depending on profile

4. **Market Operations Flow**
   - Market browsing
   - Price recommendations
   - Market statistics
   - Activity monitoring
   - **Weight**: 15-20% depending on profile

### Anonymous Scenarios

1. **Inventory API Load Test**
   - Public inventory access
   - Pagination testing
   - Filtering capabilities
   - **Weight**: 5-10% depending on profile

2. **Pricing API Load Test**
   - Price lookups
   - Historical data
   - Trend analysis
   - **Weight**: 3-10% depending on profile

3. **Public Trade Statistics**
   - Leaderboard access
   - Public statistics
   - **Weight**: 2-5% depending on profile

4. **Market Browse**
   - Public market listings
   - Basic market stats
   - **Weight**: 2% depending on profile

## Metrics Collection

The load test collects comprehensive metrics:

### Authentication Metrics
- `auth_attempts`: Total authentication attempts
- `auth_failures`: Failed authentication attempts
- `auth_success_rate`: Authentication success rate

### User Activity Metrics
- `user_requests`: Total user-specific requests
- `trade_operations`: Number of trade operations
- `wallet_operations`: Number of wallet operations
- `inventory_syncs`: Number of inventory sync operations

### Performance Metrics
- `cache_hits`: Number of cache hits
- `cache_misses`: Number of cache misses
- `db_queries`: Number of database queries
- `api_response_time`: API response time distribution
- `rate_limited_requests`: Number of rate-limited requests

## Reports and Artifacts

After running load tests, artifacts are generated in the `./artifacts/` directory:

- `metrics-{profile}.json`: Raw metrics data
- `load-test-report-{profile}.html`: HTML report with charts and analysis

### Example: Running a Load Test

```bash
# Set environment variables
export API_URL=https://api.yourdomain.com
export AUTH_TOKEN=your-jwt-token-here

# Run a production load test
CONFIG_PROFILE=load artillery run scripts/load-test.js

# Check results
open artifacts/load-test-report-load.html
```

### Example: Stress Testing

```bash
# Run stress test to find system limits
CONFIG_PROFILE=stress artillery run scripts/load-test.js

# Monitor system resources during test
htop  # or other monitoring tools
```

## Best Practices

### 1. Environment Setup
- Use dedicated test environments
- Ensure sufficient system resources
- Monitor system metrics during tests
- Use realistic test data

### 2. Test Execution
- Start with smoke tests for validation
- Progress to load tests for performance validation
- Use stress tests to understand system limits
- Run endurance tests for long-term stability

### 3. Result Analysis
- Compare metrics across different profiles
- Identify performance bottlenecks
- Monitor error rates and response times
- Validate system behavior under stress

### 4. Continuous Testing
- Integrate smoke tests into CI/CD pipelines
- Run load tests after major changes
- Schedule regular stress and endurance tests
- Track performance trends over time

## Troubleshooting

### Common Issues

1. **High Error Rates**
   - Check system resource utilization
   - Verify database connection limits
   - Review application logs for errors

2. **Poor Performance**
   - Monitor CPU, memory, and disk usage
   - Check database query performance
   - Review cache hit rates

3. **Authentication Failures**
   - Verify JWT token validity
   - Check Steam API key configuration
   - Review authentication rate limits

### Debug Mode

Run with verbose output for debugging:

```bash
DEBUG=artillery* artillery run scripts/load-test.js
```

### Custom Configuration

You can override any configuration by editing the profile definitions in `scripts/load-test.js` or by creating custom profiles.

## Integration with Monitoring

The load test metrics integrate with the application's monitoring stack:

- **Prometheus**: Metrics exported to `/api/metrics`
- **Grafana**: Dashboards for real-time monitoring
- **Application Logs**: Detailed request/response logging

Set up alerts based on load test results to catch performance regressions early.

## Performance Benchmarks

Use these as baseline metrics for comparison:

### Target Response Times
- API endpoints: < 200ms (p95)
- Database queries: < 100ms (p95)
- Cache operations: < 10ms (p95)

### Target Throughput
- Concurrent users: 100-500 (depending on infrastructure)
- Requests per second: 1000-5000 (depending on profile)

### Target Error Rates
- Overall error rate: < 1%
- Authentication error rate: < 0.1%
- Rate limiting: < 5% (intentional throttling)

Regular load testing helps maintain these performance standards and identify issues before they impact users.