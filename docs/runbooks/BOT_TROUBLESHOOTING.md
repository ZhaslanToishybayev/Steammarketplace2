# 🔧 Runbook: Bot Troubleshooting

**Component:** Steam Bot Worker  
**Severity:** Critical

---

## Symptom 1: Bot is Offline (Log: "Login failed")

**Possible Causes:**
1.  Steam is down.
2.  Credentials changed.
3.  Rate limit (IP Ban).

**Steps:**
1.  **Check Steam Status:** Visit [steamstat.us](https://steamstat.us). If down, wait.
2.  **Check Logs:**
    ```bash
    docker compose logs worker | tail -n 50
    ```
3.  **Validate Credentials:**
    - Try logging into Steam manually with the same credentials.
    - If 2FA fails, check `SHARED_SECRET`.
4.  **Restart Worker:**
    ```bash
    docker compose restart worker
    ```

## Symptom 2: Inventory Not Syncing

**Possible Causes:**
1.  Profile is Private.
2.  Steam Inventory API is lagging.
3.  Database lock.

**Steps:**
1.  **Check Profile Privacy:** Ensure Inventory is "Public" in Steam Privacy Settings.
2.  **Manual Trigger:**
    - Restarting the worker forces a sync.
3.  **Check DB:**
    ```sql
    SELECT * FROM listings WHERE status='active';
    ```

## Symptom 3: Rate Limit Hits (429)

**Steps:**
1.  **Check Rate Limiter Metrics:** Is the internal limiter working?
2.  **Rotate IP (Advanced):** If IP is banned, switch VPN/Proxy in `docker-compose.yml`.
3.  **Increase Backoff:** Edit `src/config/bots.config.js` and increase retry delays.

## Symptom 4: "Session Expired" Loop

**Steps:**
1.  **Clear Redis Session:**
    ```bash
    docker compose exec redis redis-cli DEL "bot:session:Sgovt1"
    ```
2.  **Restart Worker:** This forces a fresh login with username/password/2FA.
