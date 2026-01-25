# ✅ Manual Test Checklist

Use this checklist to manually validate the system before any deployment.

**Version:** 1.0  
**Last Updated:** 2026-01-25

---

## 🤖 1. Bot Lifecycle & Stability

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| **ML-01** | **Cold Start** | 1. `docker compose restart worker`<br>2. Watch logs: `docker compose logs -f worker` | Logs show: `✅ Logged in successfully`. No 429 errors. | [ ] |
| **ML-02** | **Session Restore** | 1. Wait for ML-01 completion.<br>2. Restart worker again.<br>3. Watch logs. | Logs show: `Session restored, no login needed`. No 2FA prompt. | [ ] |
| **ML-03** | **Network Fail** | 1. Disconnect network/VPN.<br>2. Wait 30s.<br>3. Reconnect. | Bot detects disconnect, logs retry, reconnects automatically. | [ ] |
| **ML-04** | **Rate Limit Check** | 1. Check Redis keys.<br>2. Look for `steam:ratelimit:*`. | Keys exist. Values do not exceed 20. | [ ] |

## 📦 2. Inventory Synchronization

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| **IS-01** | **Sync Trigger** | 1. Restart worker.<br>2. Watch for "Starting sync" log. | "Fetched X items from Steam". "Synced X real items to DB". | [ ] |
| **IS-02** | **Data Accuracy** | 1. Check DB: `SELECT count(*) FROM listings`.<br>2. Compare with Bot inventory in Steam. | Counts match exactly. | [ ] |
| **IS-03** | **Pricing** | 1. Check DB prices. | Prices > 0. Prices look realistic (not null). | [ ] |
| **IS-04** | **Duplication** | 1. Force sync twice (restart worker twice). | Asset IDs are unique. No duplicate rows for same item. | [ ] |

## 💰 3. Marketplace & Purchasing

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| **MP-01** | **View Listings** | 1. Open `/marketplace`. | Items load. Images visible. Prices visible. | [ ] |
| **MP-02** | **Buy Item (Success)** | 1. User with balance > price.<br>2. Click Buy.<br>3. Confirm. | Success message. Balance deducted. Trade offer created. | [ ] |
| **MP-03** | **Buy (No Funds)** | 1. User balance = 0.<br>2. Click Buy. | Error message "Insufficient funds". No deduction. | [ ] |
| **MP-04** | **Trade Offer** | 1. Check Steam Mobile App (Seller/Bot account). | Trade offer created for correct item. | [ ] |
| **MP-05** | **Sold Status** | 1. Refresh marketplace after purchase. | Item is gone OR marked as "Sold". | [ ] |

## 🛡️ 4. Error Handling (Destructive Tests)

| ID | Scenario | Steps | Expected Result | Status |
|----|----------|-------|-----------------|--------|
| **EH-01** | **DB Down** | 1. `docker compose stop postgres`<br>2. Try to buy item. | API returns 500 error (handled gracefully). No crash. | [ ] |
| **EH-02** | **Redis Down** | 1. `docker compose stop redis`<br>2. Refresh page. | Page loads (cache miss fallback). | [ ] |
| **EH-03** | **Bot Offline** | 1. `docker compose stop worker`<br>2. Try to buy. | API returns 503 "Bot unavailable". Money NOT deducted. | [ ] |

---

## 📝 Test Sign-off

**Tested By:** ____________________  
**Date:** ____________________  
**Environment:** [ ] Local [ ] Staging [ ] Production  
**Pass Rate:** ______ %  

**Result:** [ ] GO [ ] NO-GO
