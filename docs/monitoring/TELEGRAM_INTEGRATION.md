# 📱 Telegram Integration Guide

This guide explains how to configure Telegram alerts for the Steam Marketplace.

## 1. Bot Configuration

We use a custom Telegram bot for notifications.

*   **Bot Name:** Sgomarket_bot
*   **Username:** @Sgomarket_bot
*   **Token:** `8062945491:AAEEqdCc2YeT07bRKbHAJBanpIi_GIgyqTk`

## 2. Getting the Chat ID

The bot needs to know **where** to send messages (Chat ID). The Token identifies the *sender*, the Chat ID identifies the *recipient*.

**Steps to get your Chat ID:**

1.  Open Telegram and search for **@Sgomarket_bot**.
2.  Click **Start** (or send `/start`).
3.  Run the helper script provided in this repo:
    ```bash
    node scripts/get-telegram-id.js
    ```
4.  The script will output your Chat ID (e.g., `123456789`).

## 3. Environment Configuration

Update your `.env` file (and `docker-compose.yml`):

```env
TELEGRAM_BOT_TOKEN=8062945491:AAEEqdCc2YeT07bRKbHAJBanpIi_GIgyqTk
TELEGRAM_CHAT_ID=<YOUR_CHAT_ID_FROM_STEP_2>
```

## 4. Testing Alerts

To verify the integration works:

1.  **Restart Backend:** `docker compose restart backend`
2.  **Check Telegram:** You should receive a "Backend Started" notification.
3.  **Manual Test:**
    ```bash
    curl -X POST http://localhost:3001/api/admin/test-alert \
      -H "Content-Type: application/json" \
      -d '{"message": "Test alert from documentation setup"}'
    ```

## 5. Alert Types

| Icon | Severity | Meaning |
|------|----------|---------|
| ✅ | Info | System startup, Sync success |
| ⚠️ | Warning | Rate limit hit, 409 Conflict |
| 🚨 | Critical | Bot offline, DB disconnect, 500 Errors |
| 💰 | Money | Successful trade/purchase |
