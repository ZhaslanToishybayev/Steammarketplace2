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
        if (level === 'error') icon = '❌';
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

    // Alert Severity Levels (Phase 3)
    async sendAlert(message, severity = 'medium', context = '') {
        if (!this.enabled) return;

        const icons = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🔵',
            info: 'ℹ️'
        };

        const severityLabels = {
            critical: 'CRITICAL',
            high: 'HIGH',
            medium: 'MEDIUM',
            low: 'LOW',
            info: 'INFO'
        };

        const icon = icons[severity] || icons.medium;
        const label = severityLabels[severity] || 'MEDIUM';
        
        const contextText = context ? ` **[${context}]**` : '';
        const fullMessage = `${icon} **${label}**${contextText}\n\n${message}`;

        try {
            await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: this.chatId,
                text: fullMessage,
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error('[Telegram] Failed to send alert:', err.message);
        }
    }

    async sendRecoveryNotification(message, context = '') {
        if (!this.enabled) return;

        const contextText = context ? ` **[${context}]**` : '';
        const fullMessage = `✅ **RECOVERED**${contextText}\n\n${message}`;

        try {
            await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: this.chatId,
                text: fullMessage,
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error('[Telegram] Failed to send recovery notification:', err.message);
        }
    }

    async sendAlertDigest(alerts) {
        if (!this.enabled || alerts.length === 0) return;

        const criticalCount = alerts.filter(a => a.severity === 'critical').length;
        const highCount = alerts.filter(a => a.severity === 'high').length;
        const mediumCount = alerts.filter(a => a.severity === 'medium').length;
        const lowCount = alerts.filter(a => a.severity === 'low').length;

        let summary = '📊 **Alert Digest** (last 5 min)\n\n';
        
        if (criticalCount > 0) summary += `🔴 Critical: ${criticalCount}\n`;
        if (highCount > 0) summary += `🟠 High: ${highCount}\n`;
        if (mediumCount > 0) summary += `🟡 Medium: ${mediumCount}\n`;
        if (lowCount > 0) summary += `🔵 Low: ${lowCount}\n`;

        summary += `\n**Total:** ${alerts.length} alerts\n\n`;

        const importantAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high');
        if (importantAlerts.length > 0) {
            summary += '*Important details:*\n';
            importantAlerts.slice(0, 3).forEach(alert => {
                summary += `- ${alert.message.substring(0, 50)}${alert.message.length > 50 ? '...' : ''}\n`;
            });
        }

        try {
            await axios.post(`https://api.telegram.org/bot${this.token}/sendMessage`, {
                chat_id: this.chatId,
                text: summary,
                parse_mode: 'Markdown'
            });
        } catch (err) {
            console.error('[Telegram] Failed to send alert digest:', err.message);
        }
    }
}

module.exports = new TelegramBotService();
