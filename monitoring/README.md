# Steam Marketplace Monitoring Setup

Comprehensive monitoring stack for Steam Marketplace application using Prometheus, Grafana, and Alertmanager.

## 🏗️ Architecture

```
┌─────────────────┐
│   Application   │
│   (Node.js)     │
└────────┬────────┘
         │
         │ HTTP Metrics (/metrics)
         │
┌────────▼────────┐
│   Prometheus    │  (Metrics Collection)
│   Port: 9090    │
└────────┬────────┘
         │
         │ Query
         │
┌────────▼────────┐
│     Grafana     │  (Visualization)
│   Port: 3000    │
└────────┬────────┘
         │
         │ Alert Rules
         │
┌────────▼────────┐
│  Alertmanager   │  (Notifications)
│   Port: 9093    │
└────────┬────────┘
         │
         │ Slack/Email
         │
      [ALERTS]
```

## 📊 Components

### Prometheus (`prometheus.yml`)
- **Purpose**: Metrics collection and storage
- **Scrape Targets**: 7 targets including app, database, cache, load balancer
- **Retention**: Configurable (default 15 days)
- **Recording Rules**: 60+ pre-aggregated metrics for faster queries
- **Alert Rules**: 25+ alerts across 6 categories (Critical, Warning, Security, etc.)

### Grafana (`grafana/`)
- **Purpose**: Real-time visualization and dashboards
- **Dashboards**:
  1. **Overview** - HTTP, Database, Cache, Auth, Business metrics
  2. **Business** - Transactions, trade offers, marketplace KPIs
  3. **Infrastructure** - System resources, connections, performance
  4. **Security** - Auth events, security incidents, rate limits

### Alertmanager (`alertmanager.yml`)
- **Purpose**: Alert routing and notifications
- **Channels**: Slack, Email, Webhook
- **Grouping**: By severity and service
- **Inhibition**: Suppress duplicate alerts

## 🚀 Quick Start

### 1. Docker Compose (Recommended)

```bash
# Start monitoring stack
docker-compose -f docker-compose.prod.yml up -d

# Verify services
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f prometheus
```

**Services Available:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)
- Alertmanager: http://localhost:9093

### 2. Manual Setup

#### Prometheus
```bash
# Install Prometheus
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*

# Start Prometheus
./prometheus --config.file=monitoring/prometheus.yml
```

#### Grafana
```bash
# Install Grafana
wget https://dl.grafana.com/oss/release/grafana-10.0.0.linux-amd64.tar.gz
tar -zxvf grafana-*.tar.gz
cd grafana-*

# Start Grafana
./bin/grafana-server
```

Import dashboards from `monitoring/grafana/dashboards/`

## 📈 Dashboard Guide

### 1. Overview Dashboard
**URL**: http://localhost:3000/d/overview

**Key Metrics**:
- **HTTP Request Rate**: Current RPS (Requests Per Second)
- **Error Rate**: Percentage of 5xx errors
- **Response Time (P95)**: 95th percentile latency
- **Active Requests**: Currently processing requests
- **Database Performance**: Query rate and duration
- **Cache Hit Rate**: Redis efficiency

**Thresholds**:
- 🟢 Green: Normal operation
- 🟡 Yellow: Warning (investigate)
- 🔴 Red: Critical (immediate action)

### 2. Business Dashboard
**URL**: http://localhost:3000/d/business

**Business KPIs**:
- Marketplace transactions rate
- Trade offers (sent/received)
- Active listings count
- Success/failure rates
- Inventory update frequency

**Use Cases**:
- Monitor marketplace health
- Track user activity
- Identify transaction issues
- Business growth metrics

### 3. Infrastructure Dashboard
**URL**: http://localhost:3000/d/infrastructure

**System Metrics**:
- Memory usage (heap, RSS, external)
- Event loop lag
- Active connections
- Database connections
- HTTP queue size
- Cache performance

**Use Cases**:
- Capacity planning
- Performance optimization
- Resource allocation
- Scaling decisions

### 4. Security Dashboard
**URL**: http://localhost:3000/d/security

**Security Metrics**:
- Authentication attempts (success/failure)
- Active sessions
- Security events by type and severity
- Rate limit hits
- Token refresh rate
- Active users (1h window)

**Use Cases**:
- Detect security threats
- Monitor authentication health
- Track suspicious activity
- Compliance reporting

## 🔔 Alert Rules

### Critical Alerts
- **ServiceDown**: Application not responding
- **HighErrorRate**: >5% error rate for 5 minutes
- **DatabaseDown**: MongoDB connection lost
- **HighMemoryUsage**: >90% memory for 5 minutes

### Warning Alerts
- **HighCPUUsage**: >80% CPU for 10 minutes
- **HighResponseTime**: P95 >1s for 5 minutes
- **LowCacheHitRate**: <60% hit rate for 5 minutes
- **HighDatabaseLatency**: P95 >500ms for 5 minutes

### Security Alerts
- **HighAuthFailureRate**: >20 failures/minute
- **SuspiciousAPIActivity**: Unusual API patterns
- **RateLimitExceeded**: Frequent rate limit hits
- **MultipleFailedLogins**: Possible brute force

### Business Alerts
- **LowMarketplaceActivity**: <10 transactions/minute
- **TradeOfferFailure**: >50% failure rate
- **SteamAPIUnresponsive**: API timeout errors

## 📦 Pre-Aggregated Metrics (Recording Rules)

### Request Metrics
```promql
steam_marketplace:http_requests_rate_5m
steam_marketplace:http_errors_rate_5m
steam_marketplace:http_errors_percentage_5m
```

### Latency Metrics
```promql
steam_marketplace:http_request_duration:p95_5m
steam_marketplace:http_request_duration:p99_5m
steam_marketplace:http_request_duration:mean_5m
```

### Database Metrics
```promql
steam_marketplace:db_queries_rate_5m
steam_marketplace:db_query_duration:p95_5m
steam_marketplace:db_connections_utilization
```

### Cache Metrics
```promql
steam_marketplace:cache_hit_rate_5m
steam_marketplace:cache_operations_rate_5m
```

### Authentication Metrics
```promql
steam_marketplace:auth_success_rate_5m
steam_marketplace:auth_failure_rate_5m
steam_marketplace:active_sessions
steam_marketplace:token_refresh_rate_5m
```

### SLO Metrics
```promql
steam_marketplace:availability_5m          # Target: 99.9%
steam_marketplace:latency_slo_5m           # Target: P95 < 500ms
steam_marketplace:error_rate_slo_5m        # Target: < 0.1%
```

## 🔧 Configuration

### Environment Variables

```bash
# Prometheus
PROMETHEUS_RETENTION=15d
PROMETHEUS_SCRAPE_INTERVAL=15s
PROMETHEUS_STORAGE_TSDB_RETENTION=240h

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=your-secure-password
GRAFANA_DS_URL=http://prometheus:9090

# Alertmanager
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_USER=alerts@yourdomain.com
```

### Custom Metrics

Add custom metrics in your application:

```javascript
// HTTP Request
metricsService.recordHttpRequest('GET', '/api/marketplace', 200, 0.145);

// Database Query
metricsService.recordDbQuery('find', 'users', 0.023, 'success');

// Cache Operation
metricsService.recordCacheOperation('get', 'success');
metricsService.setCacheHitRate(85.5);

// Authentication
metricsService.recordAuthAttempt('steam', 'success');
metricsService.setActiveSessions(124);

// Business Metrics
metricsService.recordMarketplaceTransaction('buy', 'success');
metricsService.recordTradeOffer('sent', 'success');

// Security Event
metricsService.recordSecurityEvent('rate_limit', 'warning', 'api');

// Rate Limit
metricsService.recordRateLimitHit('/api/marketplace', 'user');
```

## 🔍 Query Examples

### Top 5 Slowest Endpoints
```promql
topk(5,
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket[5m])
  )
)
```

### Error Rate by Endpoint
```promql
sum(rate(http_requests_total{status=~"5.."}[5m]))
by (route)
/
sum(rate(http_requests_total[5m]))
by (route)
```

### Cache Efficiency
```promql
sum(rate(redis_operations_total{operation="get",status="hit"}[5m]))
/
sum(rate(redis_operations_total{operation="get"}[5m]))
* 100
```

### Active Users (1h window)
```promql
avg_over_time(auth_active_users[1h])
```

## 📧 Alertmanager Configuration

### Slack Integration
```yaml
route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
    - match:
        severity: warning
      receiver: 'slack-warning'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'
        channel: '#alerts'
        title: 'Steam Marketplace Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

### Email Integration
```yaml
receivers:
  - name: 'email-notifications'
    email_configs:
      - to: 'admin@yourdomain.com'
        from: 'alerts@yourdomain.com'
        subject: '[Steam Marketplace] {{ .GroupLabels.alertname }}'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
```

## 🛠️ Troubleshooting

### Prometheus Not Scraping
```bash
# Check targets
curl http://localhost:9090/api/v1/targets

# Verify metrics endpoint
curl http://localhost:3001/metrics

# Check logs
docker logs prometheus
```

### Grafana Dashboards Not Loading
```bash
# Check datasource
curl http://admin:admin@localhost:3000/api/datasources

# Import dashboard manually
# Go to http://localhost:3000/dashboard/import
```

### Alerts Not Firing
```bash
# Check alert rules
curl http://localhost:9090/api/v1/rules

# Check Alertmanager
curl http://localhost:9093/api/v1/alerts

# Test notification
amtool config routes test
```

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [Node.js Metrics Best Practices](https://prometheus.io/docs/guides/node-application/)

## 🔒 Security Considerations

1. **Restrict Access**:
   - Use firewall rules for Prometheus (port 9090)
   - Secure Grafana with authentication
   - Limit Alertmanager access (port 9093)

2. **SSL/TLS**:
   - Enable HTTPS in production
   - Use Let's Encrypt certificates
   - Configure secure communication between components

3. **Sensitive Data**:
   - Don't expose secrets in dashboard titles
   - Use environment variables for credentials
   - Rotate API keys regularly

## 📊 Monitoring Best Practices

1. **Dashboards**:
   - Keep dashboards focused and actionable
   - Use consistent color coding
   - Include SLA targets as reference lines
   - Document dashboard purpose

2. **Alerts**:
   - Set appropriate thresholds
   - Avoid alert fatigue
   - Test alert routes regularly
   - Include context in alert messages

3. **Metrics**:
   - Use appropriate metric types (Counter, Gauge, Histogram)
   - Add meaningful labels
   - Avoid high cardinality labels
   - Document custom metrics

## 🎯 Next Steps

1. **Set up Slack integration** (Phase 5 Task 5)
2. **Configure email notifications** for critical alerts
3. **Create runbooks** for each alert type
4. **Set up log aggregation** (ELK stack)
5. **Implement distributed tracing** (Jaeger/Zipkin)
6. **Add custom business metrics** based on your needs
7. **Set up automated backup** of Grafana dashboards

## 📞 Support

For issues or questions:
- Check logs: `docker-compose logs -f`
- Verify config: `promtool check config monitoring/prometheus.yml`
- Test rules: `promtool check rules monitoring/alert_rules.yml`
