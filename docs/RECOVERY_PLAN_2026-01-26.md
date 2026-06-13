# Recovery Plan - January 26, 2026

## Problem
After computer shutdown, PostgreSQL and Redis containers did not restart automatically.
Backend and Worker are in infinite restart loop due to missing database connections.

## Diagnosis Summary
- **PostgreSQL:** Exited (0) at 2026-01-25T18:17:36 - graceful shutdown
- **Redis:** Exited (0) at 2026-01-25T18:17:36 - graceful shutdown
- **Volumes:** Intact (`steammarketplace2_postgres_data`, `steammarketplace2_redis_data`)
- **Ports:** Free (5435, 6385)
- **Data Risk:** NONE - graceful shutdown means data is safe

## Execution Plan

### PHASE 1: Stop All Services
```bash
docker compose down
```
**Expected:** All containers stopped, network removed, volumes preserved.

### PHASE 2: Start All Services
```bash
docker compose up -d
```
**Expected:** All 9 services start in correct order (databases first).

### PHASE 3: Database Health Checks

#### PostgreSQL
```bash
docker compose exec postgres pg_isready -U steam_user -d steam_marketplace
docker compose exec postgres psql -U steam_user -d steam_marketplace -c "SELECT version();"
docker compose exec postgres psql -U steam_user -d steam_marketplace -c "\dt"
docker compose exec postgres psql -U steam_user -d steam_marketplace -c "SELECT COUNT(*) FROM users;"
docker compose exec postgres psql -U steam_user -d steam_marketplace -c "SELECT id, trade_uuid, status FROM escrow_trades ORDER BY created_at DESC LIMIT 5;"
```

#### Redis
```bash
docker compose exec redis redis-cli ping
docker compose exec redis redis-cli DBSIZE
docker compose exec redis redis-cli INFO memory | grep used_memory_human
docker compose exec redis redis-cli LASTSAVE
```

### PHASE 4: Application Health Checks

#### Backend API
```bash
curl -f http://localhost:3001/api/health
curl -s http://localhost:3001/metrics | head -20
curl -s http://localhost:3001/api/escrow/listings?limit=5
```

#### Worker
```bash
docker compose logs worker --tail=30
docker compose logs worker | grep -E "(logged in|online|ready)"
```

#### Frontend/Nginx
```bash
curl -f -s http://localhost:3000 | grep -q "Steam" && echo "Frontend OK"
curl -f -s http://localhost/ | grep -q "Steam" && echo "Nginx OK"
```

### PHASE 5: Monitoring Health Checks

#### Prometheus
```bash
curl -f http://localhost:9090/-/healthy
curl -s http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | {job: .labels.job, health: .health}'
```

#### Grafana
```bash
curl -f http://localhost:3300/api/health
curl -s http://admin:admin@localhost:3300/api/datasources | jq '.[] | {name: .name}'
```

### PHASE 6: Data Integrity Verification
```bash
docker compose exec -T postgres psql -U steam_user -d steam_marketplace -c "SELECT COUNT(*) as total_users, SUM(balance) as total_balance FROM users;"
docker compose exec -T postgres psql -U steam_user -d steam_marketplace -c "SELECT status, COUNT(*) FROM escrow_trades GROUP BY status;"
docker compose exec -T postgres psql -U steam_user -d steam_marketplace -c "SELECT status, COUNT(*) FROM listings GROUP BY status;"
docker compose exec -T postgres psql -U steam_user -d steam_marketplace -c "SELECT account_name, status FROM bots;"
```

### PHASE 7: Functional Test
- Open http://localhost/marketplace
- Open http://localhost:3300/d/steam-enhanced (Grafana Dashboard)
- Verify all panels show data

## Rollback Procedures

### If PostgreSQL fails to start
```bash
docker compose down
docker volume inspect steammarketplace2_postgres_data
docker run -it --rm -v steammarketplace2_postgres_data:/data alpine ls -lh /data
```

### If networking issues
```bash
docker compose down
docker network prune -f
docker compose up -d
```

## Expected Total Time
- Optimistic: 5-7 minutes
- Realistic: 8-10 minutes
- Worst case: 15 minutes

## Status
- [x] Phase 1: Stop All Services
- [x] Phase 2: Start All Services
- [x] Phase 3: Database Health Checks
- [x] Phase 4: Application Health Checks
- [x] Phase 5: Monitoring Health Checks
- [x] Phase 6: Data Integrity Verification
- [x] Phase 7: Functional Test
