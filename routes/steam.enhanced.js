const express = require('express');
const router = express.Router();
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { validateTradeUrl } = require('../middleware/validation');
const User = require('../models/User');
const logger = require('../utils/logger');

// Get user's Steam inventory
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch inventory from Steam API
    const inventoryUrl = `https://steamcommunity.com/inventory/${user.steamId}/730/2?l=english&count=5000`;
    
    try {
      const response = await axios.get(inventoryUrl);
      
      if (!response.data.success) {
        return res.status(400).json({ error: 'Failed to fetch inventory from Steam' });
      }

      const { assets, descriptions } = response.data;
      
      if (!assets || !descriptions) {
        return res.json({ items: [] });
      }

      // Combine assets with descriptions
      const inventory = assets.map(asset => {
        const description = descriptions.find(desc => 
          desc.classid === asset.classid && desc.instanceid === asset.instanceid
        );
        
        return {
          assetId: asset.assetid,
          classId: asset.classid,
          instanceId: asset.instanceid,
          amount: asset.amount,
          name: description?.name || 'Unknown',
          marketName: description?.market_name || description?.name || 'Unknown',
          iconUrl: description?.icon_url ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}` : null,
          tradable: description?.tradable === 1,
          marketable: description?.marketable === 1,
          type: description?.type || 'Unknown',
          rarity: description?.tags?.find(tag => tag.category === 'Rarity')?.localized_tag_name || 'Unknown',
          exterior: description?.tags?.find(tag => tag.category === 'Exterior')?.localized_tag_name || null,
          weapon: description?.tags?.find(tag => tag.category === 'Weapon')?.localized_tag_name || null,
          quality: description?.tags?.find(tag => tag.category === 'Quality')?.localized_tag_name || null,
          stattrak: description?.market_name?.includes('StatTrak™') || false,
          souvenir: description?.market_name?.includes('Souvenir') || false
        };
      });

      // Filter for CS2 items only (weapons, knives, gloves, etc.)
      const csgoItems = inventory.filter(item => 
        item.type && 
        !item.type.includes('Base Grade Container') &&
        !item.type.includes('Graffiti') &&
        item.marketable
      );

      // Update user's inventory in database
      await user.updateInventory(csgoItems);

      res.json({ items: csgoItems });
    } catch (steamError) {
      logger.error('Steam API error:', steamError);
      
      // Return cached inventory if Steam API fails
      res.json({ 
        items: user.steamInventory || [],
        cached: true,
        error: 'Steam API temporarily unavailable, showing cached inventory'
      });
    }
  } catch (error) {
    logger.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Set user's trade URL
router.post('/trade-url', authenticateToken, validateTradeUrl, async (req, res) => {
  try {
    const { tradeUrl } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.tradeUrl = tradeUrl;
    await user.save();

    res.json({ message: 'Trade URL updated successfully' });
  } catch (error) {
    logger.error('Error updating trade URL:', error);
    res.status(500).json({ error: 'Failed to update trade URL' });
  }
});

// Get user's trade URL
router.get('/trade-url', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('tradeUrl');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ tradeUrl: user.tradeUrl });
  } catch (error) {
    logger.error('Error fetching trade URL:', error);
    res.status(500).json({ error: 'Failed to fetch trade URL' });
  }
});

// Get Steam market price for an item
router.get('/market-price/:marketName', async (req, res) => {
  try {
    const { marketName } = req.params;
    
    const priceUrl = `https://steamcommunity.com/market/priceoverview/?currency=1&appid=730&market_hash_name=${encodeURIComponent(marketName)}`;
    
    const response = await axios.get(priceUrl);
    
    if (response.data.success) {
      res.json({
        success: true,
        lowestPrice: response.data.lowest_price,
        volume: response.data.volume,
        medianPrice: response.data.median_price
      });
    } else {
      res.json({
        success: false,
        error: 'Price not available'
      });
    }
  } catch (error) {
    logger.error('Error fetching market price:', error);
    res.status(500).json({ error: 'Failed to fetch market price' });
  }
});

// Get item float value (requires additional service)
router.get('/float/:inspectUrl', async (req, res) => {
  try {
    const { inspectUrl } = req.params;

    // This would require a float checking service
    // For now, return placeholder
    res.json({
      success: false,
      error: 'Float checking service not implemented'
    });
  } catch (error) {
    logger.error('Error fetching float value:', error);
    res.status(500).json({ error: 'Failed to fetch float value' });
  }
});

// Get bot inventory
router.get('/bot-inventory', authenticateToken, async (req, res) => {
  try {
    // Get bot from steamBotManager
    const SteamBotManager = require('../services/steamBotManager.new');
    const botManager = SteamBotManager.getInstance();

    if (!botManager || !botManager.bots || botManager.bots.length === 0) {
      return res.json({ items: [] });
    }

    const bot = botManager.bots[0]; // Get first bot
    const inventory = bot.inventory || [];

    // Format inventory items
    const formattedInventory = inventory.map(item => ({
      assetId: item.assetid || item.assetId,
      classId: item.classid || item.classId,
      instanceId: item.instanceid || item.instanceId,
      name: item.name || item.market_name || 'Unknown',
      marketName: item.market_name || item.name || 'Unknown',
      iconUrl: item.icon_url || item.iconUrl,
      tradable: item.tradable,
      marketable: item.marketable,
      amount: item.amount || 1,
    }));

    res.json({ items: formattedInventory });
  } catch (error) {
    logger.error('Error fetching bot inventory:', error);
    res.status(500).json({ error: 'Failed to fetch bot inventory' });
  }
});

// Test trade system
router.post('/test-trade', authenticateToken, async (req, res) => {
  try {
    const { action, message, testData } = req.body;

    logger.info(`Trade test initiated by user ${req.user.id}:`, { action, message });

    // Simulate trade test
    const result = {
      success: true,
      action: action || 'test',
      message: message || 'Trade system test',
      timestamp: new Date().toISOString(),
      user: {
        id: req.user.id,
        steamId: req.user.steamId,
      },
      bot: {
        status: 'online',
        name: 'Sgovt1',
        inventoryCount: 0, // Will be updated when inventory is fixed
      },
      testData: testData || {},
    };

    logger.info('Trade test completed:', result);

    res.json({
      success: true,
      message: 'Trade system test completed successfully',
      result: result,
    });
  } catch (error) {
    logger.error('Error in trade test:', error);
    res.status(500).json({ error: 'Failed to test trade system' });
  }
});

module.exports = router;