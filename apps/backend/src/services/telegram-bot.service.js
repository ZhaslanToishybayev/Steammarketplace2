const axios = require('axios');

class TelegramBotService {
    constructor() {
        this.token = process.env.TELEGRAM_BOT_TOKEN;
        this.chatId = process.env.TELEGRAM_CHAT_ID;
        this.enabled = !!(this.token && this.chatId);
        
        if (!this.enabled) {
            console.warn('[Telegram] Notifications disabled (TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing)');
        }
    }

    async sendMessage(text, level = 'info') {
        if (!this.enabled) return;

        let icon = 'ℹ️';
        if (level === 'error') icon = 'RX';
        if (level === 'warning') icon = '⚠️';
        if (level === 'success') icon = '✅';
        if (level === 'money') icon = '💰';

        const message = `${icon} **[SteamMarket Bot]**\n\n${text}`;

        try {
            await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: this.chatId,
                text: message,
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error('[Telegram] Failed to send message:', err.message);
        }
    }

    // Specific Alerts

    async sendStartupNotification(env) {
        await this.sendMessage(`Worker started in **${env}** mode. Monitoring active.`, 'success');
    }

    async sendTradeFailure(tradeId, reason, refundAmount) {
        await this.sendMessage(
            `Trade **${tradeId}** failed!\n` +
            `Reason: _${reason}_\n` +
            `Action: Auto-refunded **$${refundAmount}** to buyer.`, 
            'error'
        );
    }

    async sendP2PCompletion(tradeId, amount, seller) {
        await this.sendMessage(
            `P2P Trade **${tradeId}** completed.\n` +
            `Seller: \`${seller}\`\n` +
            `Payout: **$${amount}**`, 
            'money'
        );
    }

    async sendCriticalError(context, error) {
        await this.sendMessage(
            `Critical Error in **${context}**:\n` +
            `\`${error}\``, 
            'error'
        );
    }
}

module.exports = new TelegramBotService();