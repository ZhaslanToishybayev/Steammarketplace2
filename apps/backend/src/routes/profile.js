const express = require('express');
const axios = require('axios');
const { query } = require('../config/database');
const router = express.Router();

// Get user profile
router.get('/', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    success: true,
    user: req.user
  });
});

/**
 * POST /api/profile/update
 * Update user settings (Trade URL)
 */
router.post('/update', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }

  try {
    const steamId = req.user.steamId;
    const rawTradeUrl = req.body.tradeUrl || '';
    const tradeUrl = rawTradeUrl.trim();

    // Strict Validations
    const tradeUrlRegex = /^https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
    
    if (!tradeUrl || !tradeUrlRegex.test(tradeUrl)) {
      return res.status(400).json({ 
          success: false, 
          error: 'Invalid Trade URL format. It should look like: https://steamcommunity.com/tradeoffer/new/?partner=...&token=...' 
      });
    }

    await query(
      'UPDATE users SET trade_url = $1 WHERE steam_id = $2',
      [tradeUrl, steamId]
    );

    // Update session user object if needed (optional, passort deserializes from DB anyway usually? 
    // No, usually deserializeUser query DB. Let's assume deserializeUser does lookup).

    res.json({
      success: true,
      message: 'Profile updated successfully'
    });
  } catch (err) {
    console.error('[Profile] Update failed:', err);
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

// Test inventory endpoint
router.get('/inventory/test', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const steamId = req.user.steamId;

    // Пробуем получить инвентарь CS2
    const response = await axios.get(
      `https://steamcommunity.com/inventory/${steamId}/730/2?l=english&count=100`,
      { timeout: 10000 }
    ).catch(err => ({
      data: {
        success: false,
        error: err.message,
        code: err.code
      }
    }));

    res.json({
      steamId,
      success: response.data.success,
      total_count: response.data.total_inventory_count || 0,
      assets_count: response.data.assets?.length || 0,
      descriptions_count: response.data.descriptions?.length || 0,
      error: response.data.error,
      accessible: response.data.success ? '✅ Public' : '❌ Private or error'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Failed to fetch inventory',
      message: error.message
    });
  }
});

module.exports = router;
