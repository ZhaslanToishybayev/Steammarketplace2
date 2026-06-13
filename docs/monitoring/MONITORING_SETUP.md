# 📊 Monitoring Setup Guide

**Version:** 1.0
**Date:** 2026-01-25

---

## 1. Overview
We use the **TIG Stack** (Telegraf/Prometheus, InfluxDB/Prometheus, Grafana) + **Alertmanager** for monitoring.

*   **Prometheus:** Scrapes metrics from Backend and Worker.
*   **Grafana:** Visualizes metrics (Dashboards).
*   **Alertmanager:** Sends notifications to Telegram.

## 2. Infrastructure Setup (Docker Compose)

Add the following services to your `docker-compose.yml` (or `monitoring.yml`):

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3300:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  alertmanager:
    image: prom/alertmanager:latest
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - "9093:9093"
```

## 3. Configuration Files

### `prometheus.yml`
```yaml
global:
  scrape_interval: 15s

rule_files:
  - "alert_rules.yml"

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['backend:3001']
  - job_name: 'worker'
    static_configs:
      - targets: ['worker:3001']
```

### `alertmanager.yml`
Configures where alerts go (Telegram). See `TELEGRAM_INTEGRATION.md` for details.

## 4. Key Metrics to Watch

1.  **Bot Status:** `steam_bot_online` (Gauge) - Must be 1.
2.  **Rate Limit:** `steam_rate_limit_hits` (Counter) - Should be low/steady.
3.  **Inventory Sync:** `inventory_sync_duration_seconds` (Histogram) - Should be < 60s.
4.  **Error Rate:** `http_requests_total{status=~"5.."}` - Should be 0.

## 5. Dashboards

### "Steam Operations" Dashboard
*   **Panel 1:** Active Bots (Single Stat)
*   **Panel 2:** Trade Success Rate (Graph)
*   **Panel 3:** Steam API Latency (Graph)
*   **Panel 4:** Recent Errors (Table)
