// Enhanced Steam Inventory API with Multi-Game Support
const express = require('express');
const EnhancedSteamInventory = require('./enhanced-inventory-system');

const router = express.Router();
const inventorySystem = new EnhancedSteamInventory();

// Demo inventory data for testing
const demoInventory = {
  success: true,
  game: "Counter-Strike 2 (Demo)",
  appId: "730",
  items: [
    {
      "assetid": "1502345678901234567",
      "classid": "123456789",
      "instanceid": "0",
      "amount": 1,
      "name": "AK-47 | Redline (Field-Tested)",
      "market_name": "AK-47 | Redline (Field-Tested)",
      "market_hash_name": "AK-47%20Redline%20Field-Tested",
      "appid": "730",
      "contextid": "2",
      "tradable": true,
      "marketable": true,
      "commodity": false,
      "type": "Covert Rifle",
      "description": "Color: Red-Tinted",
      "icon_url": "ak47_redline_ft.png",
      "icon_url_large": "ak47_redline_ft_large.png",
      "background_color": "eb4b4b",
      "name_color": "eb4b4b",
      "fraudwarnings": [],
      "tags": [
        {"name": "Rifle", "category": "Type", "internal_name": "weapon_rifle"},
        {"name": "Covert", "category": "Rarity", "internal_name": "Rarity_Ancient_Weapon"},
        {"name": "AK-47", "category": "Weapon", "internal_name": "weapon_ak47"}
      ]
    }
  ],
  totalCount: 1,
  isDemo: true,
  message: "This is demo inventory data for testing purposes"
};

// Get all available games
router.get('/games', (req, res) => {
  try {
    const games = inventorySystem.games.map(game => ({
      appId: game.appId,
      name: game.name,
      short: game.short,
      category: game.category
    }));

    res.json({
      success: true,
      games: games,
      total: games.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get games list',
      message: error.message
    });
  }
});

// Get demo inventory
router.get('/demo', (req, res) => {
  try {
    res.json({
      success: true,
      data: demoInventory,
      message: 'Demo inventory data for testing purposes'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get demo inventory',
      message: error.message
    });
  }
});

module.exports = router;
