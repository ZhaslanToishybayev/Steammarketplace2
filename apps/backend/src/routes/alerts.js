const express = require('express');
const router = express.Router();
const telegram = require('../services/telegram-bot.service');

// Webhook for Alertmanager
router.post('/telegram', async (req, res) => {
  try {
    const { alerts } = req.body;
    
    if (!alerts || !Array.isArray(alerts)) {
        return res.status(400).json({ error: 'Invalid payload' });
    }

    for (const alert of alerts) {
      const { status, labels, annotations } = alert;
      
      let emoji = status === 'firing' ? '🚨' : '✅';
      if (labels.severity === 'warning') emoji = '⚠️';
      
      let message = `${emoji} **${labels.alertname}**\n\n`;
      message += `**Status:** ${status.toUpperCase()}\n`;
      message += `**Severity:** ${labels.severity}\n`;
      message += `**Description:** ${annotations.description || 'No description'}\n`;
      
      // Send to Telegram
      // We use 'error' level for firing critical alerts to force notification logic if any
      await telegram.sendMessage(message, status === 'firing' ? 'error' : 'success');
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Alert webhook error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
