# 🚀 Production Checklist

**System:** Steam Trading Platform  
**Target:** Production Environment

---

## 1. Security
- [ ] **Secrets:** All passwords/tokens moved from `docker-compose.yml` to `.env`.
- [ ] **HTTPS:** SSL Certificates active (LetsEncrypt/Certbot).
- [ ] **Firewall:** Only ports 80/443 exposed. DB/Redis ports closed to public.
- [ ] **Admin:** Default admin password changed.

## 2. Data & Stability
- [ ] **Backup:** Automated daily backup of PostgreSQL active.
- [ ] **Redis:** Persistence enabled (AOF/RDB).
- [ ] **Migrations:** All SQL migrations applied successfully.
- [ ] **Rate Limiter:** Verified working (max 20 req/min).

## 3. Bot Configuration
- [ ] **Steam Guard:** Shared Secret verified and generating valid codes.
- [ ] **Inventory:** Bot inventory is public on Steam.
- [ ] **API Key:** Valid Steam Web API Key configured.
- [ ] **Session:** Session persisted in Redis (survives restart).

## 4. Monitoring
- [ ] **Logs:** Aggregation active (e.g., Loki or retained locally).
- [ ] **Alerts:** Telegram alerts verified (received test message).
- [ ] **Metrics:** Prometheus scraping `/metrics` successfully.

## 5. Performance
- [ ] **Caching:** Redis cache hits verified for `/api/analytics`.
- [ ] **Static Assets:** Nginx serving cached static files.
- [ ] **Node.js:** Running in `NODE_ENV=production`.

---

**Sign-off:**
*   **DevOps:** ____________________
*   **Lead Dev:** ____________________
