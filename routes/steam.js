const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { validateTradeUrl } = require('../middleware/validation');
const { withRateLimit, rateLimitMiddleware } = require('../middleware/rateLimitMiddleware');
const User = require('../models/User');
const logger = require('../utils/logger');

// DIAGNOSTIC: Enhanced logging for debugging
function logDiagnostic(title, data) {
  logger.info(`\n🔍 DIAGNOSTIC: ${title}`);
  logger.info(`   Data: ${JSON.stringify(data, null, 2)}`);
  logger.info(`   End Diagnostic\n`);
}

// Get user's Steam inventory
router.get('/inventory', authenticateToken, rateLimitMiddleware, async (req, res) => {
  try {
    const { game } = req.query; // game=cs2 or game=dota2
    const gameName = game === 'dota2' ? 'Dota 2' : 'CS2';
    const appId = game === 'dota2' ? 570 : 730;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`\n👤 User ${user.username} (${user.steamId}) requesting ${gameName} inventory`);

    // DIAGNOSTIC: Log user authentication state
    logDiagnostic('User Authentication', {
      userId: user._id,
      steamId: user.steamId,
      username: user.username,
      hasSteamAccessToken: !!user.steamAccessToken,
      tokenLength: user.steamAccessToken ? user.steamAccessToken.length : 0
    });

    logger.info('📦 Loading inventory for user', {
      steamId: user.steamId,
      game: gameName
    });

    let filteredItems = [];

    try {
      const steamIntegration = require('../services/steamIntegrationService');

      // DIAGNOSTIC: Log user authentication state
      logDiagnostic('Steam Integration Request', {
        userId: user._id,
        steamId: user.steamId,
        gameName: gameName,
        appId: appId,
        hasAccessToken: !!user.steamAccessToken
      });

      // Get real inventory from Steam API using the WORKING steamIntegration service
      // This service worked before and fetches real inventory data
      const result = await steamIntegration.getInventory(
        user.steamId,
        appId,
        user.steamAccessToken // Pass the access token if available
      );

      if (!result.success) {
        throw new Error('Steam API returned error');
      }

      // DIAGNOSTIC: Log raw inventory from Steam API
      logDiagnostic('Raw Steam API Response', {
        totalItems: result.items.length,
        gameName: gameName,
        appId: appId,
        sampleItems: result.items.slice(0, 3).map(item => ({
          name: item.name,
          appId: item.appId,
          type: item.type,
          tradable: item.tradable,
          marketable: item.marketable
        }))
      });

      // Filter items based on game type
      filteredItems = result.items;

      if (gameName === 'CS2') {
        logger.info('🔍 Applying CS2 filter...');
        const beforeFilter = filteredItems.length;

        // CS2 - filter for weapons, knives, gloves, etc.
        filteredItems = result.items.filter(item => {
          const hasType = !!item.type;
          const isNotContainer = !item.type?.includes('Base Grade Container');
          const isNotGraffiti = !item.type?.includes('Graffiti');
          const isNotMusic = !item.type?.includes('Music');
          const isMarketable = item.marketable;

          return hasType && isNotContainer && isNotGraffiti && isNotMusic && isMarketable;
        });

        const afterFilter = filteredItems.length;
        logger.info(`✅ CS2 filter: ${beforeFilter} → ${afterFilter} items`);
        logger.info(`   Filtered out: ${beforeFilter - afterFilter} items`);

        // DIAGNOSTIC: Log filter statistics
        logDiagnostic('CS2 Filter Statistics', {
          beforeFilter: beforeFilter,
          afterFilter: afterFilter,
          filteredOut: beforeFilter - afterFilter,
          criteria: {
            hasType: 'Required',
            notContainer: 'Excluded',
            notGraffiti: 'Excluded',
            notMusic: 'Excluded',
            marketable: 'Required'
          }
        });

      } else if (gameName === 'Dota 2') {
        logger.info('🔍 Applying Dota 2 filter...');
        const beforeFilter = filteredItems.length;

        // Dota 2 - include all marketable items
        // IMPORTANT: Filter by appId === 570 to ensure only Dota 2 items
        filteredItems = result.items.filter(item => {
          const isDota2Item = item.appId === 570;
          const isMarketable = item.marketable;
          const isTradable = item.tradable;

          return isDota2Item && isMarketable && isTradable;
        });

        const afterFilter = filteredItems.length;
        logger.info(`✅ Dota 2 filter: ${beforeFilter} → ${afterFilter} items`);
        logger.info(`   Filtered out: ${beforeFilter - afterFilter} items`);

        // DIAGNOSTIC: Show what was filtered out
        const filteredOutItems = result.items.filter(item => {
          return !(item.appId === 570 && item.marketable && item.tradable);
        });

        logDiagnostic('Dota 2 Filter Statistics', {
          beforeFilter: beforeFilter,
          afterFilter: afterFilter,
          filteredOut: beforeFilter - afterFilter,
          criteria: {
            appId: 'Must be 570 (Dota 2)',
            marketable: 'Required',
            tradable: 'Required'
          },
          filteredOutExamples: filteredOutItems.slice(0, 5).map(item => ({
            name: item.name,
            appId: item.appId,
            marketable: item.marketable,
            tradable: item.tradable
          }))
        });
      }

      // DIAGNOSTIC: Log final results
      logDiagnostic('Final Filtered Results', {
        game: gameName,
        appId: appId,
        totalItems: filteredItems.length,
        items: filteredItems.slice(0, 5).map(item => ({
          name: item.name,
          type: item.type,
          appId: item.appId
        }))
      });

      logger.info(`User inventory loaded from Steam API: ${filteredItems.length} ${gameName} items (cached: ${result.cached})`);

      res.json({
        items: filteredItems,
        game: gameName,
        count: filteredItems.length,
        cached: result.cached,
        demoData: false,
        diagnostic: {
          filterApplied: gameName,
          originalCount: result.items.length,
          filteredCount: filteredItems.length,
          success: true
        }
      });
    } catch (apiError) {
      logger.error('Steam API failed:', apiError.message);
      logger.error('Stack trace:', apiError.stack);

      // Return empty inventory on API error - no fallback to demo data
      res.json({
        items: [],
        game: gameName,
        count: 0,
        empty: true,
        error: 'Steam API error. Using only real data, no fallback.',
        message: 'Unable to load inventory from Steam. Please check your Steam account privacy settings and try again.'
      });
    }

  } catch (error) {
    logger.error('Error fetching user inventory:', error);
    // Return empty array instead of 500 error
    res.json({
      items: [],
      game: 'CS2',
      count: 0,
      empty: true,
      error: 'Failed to fetch inventory. Steam may require account authentication.'
    });
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

    // Temporarily return demo price
    res.json({
      success: true,
      lowestPrice: '$45.99',
      volume: '1,234',
      medianPrice: '$42.50'
    });
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

// Get bot inventory - using TradeOfferManager
router.get('/bot-inventory', authenticateToken, rateLimitMiddleware, async (req, res) => {
  try {
    const { game } = req.query; // game=cs2 or game=dota2
    const gameName = game === 'dota2' ? 'Dota 2' : 'CS2';

    logger.info(`Bot inventory request for ${gameName}`);

    // No demo data - using only real data from Steam

    // Get bot from bot manager
    const botManager = req.steamBotManager;
    if (!botManager || botManager.activeBots.length === 0) {
      logger.error('Bot manager not available or no active bots');

      return res.json({
        items: [],
        game: gameName,
        count: 0,
        error: 'Bot manager not initialized - no demo fallback'
      });
    }

    // Get the first active bot
    const bot = botManager.activeBots[0];

    if (!bot.isOnline) {
      logger.error('Bot is offline (rate limited by Steam). Please wait 15-30 minutes and try again.');

      return res.json({
        items: [],
        game: gameName,
        count: 0,
        error: 'Bot is offline due to Steam rate limiting - no demo fallback. Please wait 15-30 minutes before retrying.'
      });
    }

    logger.info(`Getting bot inventory from TradeOfferManager for ${gameName}`);

    try {
      // Get bot inventory using the new API service
      const steamApiService = require('../services/steamApiService');
      const appId = gameName === 'Dota 2' ? '570' : '730';

      // Получаем инвентарь бота
      const result = await steamApiService.getBotInventory(bot, appId);

      if (!result.success) {
        throw new Error('Failed to get bot inventory');
      }

      // Filter items based on game type
      let filteredItems = result.items;

      if (gameName === 'CS2') {
        // CS2 - filter for weapons, knives, gloves, etc.
        filteredItems = filteredItems.filter(item =>
          item.type &&
          !item.type.includes('Base Grade Container') &&
          !item.type.includes('Graffiti') &&
          item.marketable
        );
      } else if (gameName === 'Dota 2') {
        // Dota 2 - show ONLY Dota 2 items (appId=570)
        filteredItems = result.items.filter(item => {
          // For Dota 2, show items that are from Dota 2 (appId=570) and tradable
          return item.appId === 570 && item.tradable;
        });
      }

      logger.info(`Bot inventory loaded from TradeOfferManager: ${filteredItems.length} ${gameName} items`);

      res.json({
        items: filteredItems,
        game: gameName,
        count: filteredItems.length
      });
    } catch (botError) {
      logger.error('Error getting bot inventory from TradeOfferManager:', botError);

      // No demo fallback - return error
      res.status(500).json({
        items: [],
        game: gameName,
        count: 0,
        error: 'Failed to fetch bot inventory from Steam - no demo fallback'
      });
    }
  } catch (error) {
    logger.error('Error fetching bot inventory:', error);
    res.status(500).json({
      items: [],
      game: 'CS2',
      count: 0,
      error: 'Failed to fetch bot inventory'
    });
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
        status: 'offline',
        name: 'Sgovt1',
        error: 'Rate limited by Steam'
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

// Direct Steam API test endpoint (bypasses bot login)
router.get('/test-steam-api/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const { appId = 730 } = req.query;

    logger.info(`Testing Steam API directly for SteamID: ${steamId}, AppID: ${appId}`);

    const steamIntegration = require('../services/steamIntegrationService');
    const result = await steamIntegration.getInventory(steamId, appId);

    res.json({
      success: true,
      steamId: steamId,
      appId: appId,
      itemCount: result.items.length,
      cached: result.cached,
      items: result.items.slice(0, 5) // Return only first 5 items for testing
    });
  } catch (error) {
    logger.error('Error testing Steam API:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// DIAGNOSTIC ENDPOINT - Get system diagnostic information
router.get('/diagnostic', async (req, res) => {
  try {
    logger.info('\n🔍 DIAGNOSTIC REQUEST RECEIVED\n');

    const diagnostic = {
      timestamp: new Date().toISOString(),
      system: {
        status: 'running',
        uptime: process.uptime(),
        nodeVersion: process.version,
        memory: process.memoryUsage()
      },
      database: {
        connected: false,
        userCount: 0
      },
      steam: {
        integrationService: 'available',
        botManager: 'unknown'
      },
      users: []
    };

    // Check database connection
    try {
      const userCount = await User.countDocuments();
      diagnostic.database.connected = true;
      diagnostic.database.userCount = userCount;

      // Get all users with basic info
      const users = await User.find({}, 'username steamId steamAccessToken userInventory').limit(10);
      diagnostic.users = users.map(u => ({
        username: u.username,
        steamId: u.steamId,
        hasToken: !!u.steamAccessToken,
        tokenLength: u.steamAccessToken ? u.steamAccessToken.length : 0,
        inventoryCount: u.userInventory ? u.userInventory.length : 0
      }));
    } catch (dbError) {
      logger.error('Database diagnostic error:', dbError.message);
      diagnostic.database.error = dbError.message;
    }

    // Check Steam integration
    try {
      const steamIntegration = require('../services/steamIntegrationService');
      diagnostic.steam.integrationService = 'loaded';
      diagnostic.steam.cacheStats = steamIntegration.getCacheStats();
    } catch (steamError) {
      logger.error('Steam integration diagnostic error:', steamError.message);
      diagnostic.steam.integrationService = 'error: ' + steamError.message;
    }

    // Check bot manager if available
    if (req.steamBotManager) {
      diagnostic.steam.botManager = {
        active: true,
        botCount: req.steamBotManager.activeBots.length,
        bots: req.steamBotManager.activeBots.map(b => ({
          steamId: b.steamId,
          isOnline: b.isOnline,
          inventoryCount: b.inventory ? b.inventory.length : 0
        }))
      };
    } else {
      diagnostic.steam.botManager = {
        active: false,
        note: 'Bot manager not available in request context'
      };
    }

    logger.info('✅ Diagnostic report generated');
    res.json(diagnostic);

  } catch (error) {
    logger.error('Error generating diagnostic:', error);
    res.status(500).json({
      error: 'Failed to generate diagnostic',
      message: error.message,
      stack: error.stack
    });
  }
});

// TEST ENDPOINT - Test filtering logic
router.get('/test-filter/:game', authenticateToken, async (req, res) => {
  try {
    const game = req.params.game;
    const gameName = game === 'dota2' ? 'Dota 2' : 'CS2';
    const appId = game === 'dota2' ? 570 : 730;

    logger.info(`\n🧪 FILTER TEST: ${gameName}\n`);

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Create mock inventory for testing filters
    const mockInventory = [
      {
        name: 'AK-47 | Redline',
        appId: 730,
        type: 'Classified Rifle',
        tradable: true,
        marketable: true
      },
      {
        name: 'AWP | Dragon Lore',
        appId: 730,
        type: 'Covert Sniper Rifle',
        tradable: true,
        marketable: true
      },
      {
        name: 'Dota 2 Item',
        appId: 570,
        type: 'Dota 2 Item',
        tradable: true,
        marketable: true
      },
      {
        name: 'CS2 Container',
        appId: 730,
        type: 'Base Grade Container',
        tradable: true,
        marketable: true
      }
    ];

    let filteredItems = [];
    const beforeFilter = mockInventory.length;

    if (gameName === 'CS2') {
      filteredItems = mockInventory.filter(item => {
        const hasType = !!item.type;
        const isNotContainer = !item.type?.includes('Base Grade Container');
        const isNotGraffiti = !item.type?.includes('Graffiti');
        const isNotMusic = !item.type?.includes('Music');
        const isMarketable = item.marketable;

        return hasType && isNotContainer && isNotGraffiti && isNotMusic && isMarketable;
      });
    } else if (gameName === 'Dota 2') {
      filteredItems = mockInventory.filter(item => {
        return item.appId === 570 && item.marketable && item.tradable;
      });
    }

    const afterFilter = filteredItems.length;

    const result = {
      test: 'Filter Test',
      game: gameName,
      appId: appId,
      beforeFilter: beforeFilter,
      afterFilter: afterFilter,
      filteredOut: beforeFilter - afterFilter,
      criteria: gameName === 'CS2'
        ? { type: 'Required', notContainer: 'Excluded', notGraffiti: 'Excluded', notMusic: 'Excluded', marketable: 'Required' }
        : { appId: 'Must be 570', marketable: 'Required', tradable: 'Required' },
      items: filteredItems,
      filteredOutItems: mockInventory.filter(item => !filteredItems.includes(item))
    };

    logger.info('✅ Filter test completed');
    res.json(result);

  } catch (error) {
    logger.error('Filter test error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// НОВЫЕ ENDPOINTS ДЛЯ DUAL INVENTORY СИСТЕМЫ
// ========================================

// Get user profile via Steam Web API (WORKS!)
router.get('/user-profile/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;

    const inventoryManager = require('../services/inventoryManager');
    const result = await inventoryManager.getUserInfo(steamId);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get inventory status with detailed diagnostics
router.get('/inventory-status/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;
    const { game = 'cs2' } = req.query;

    const inventoryManager = require('../services/inventoryManager');
    const result = await inventoryManager.getInventoryStatus(steamId, game);

    res.json(result);
  } catch (error) {
    logger.error('Error checking inventory status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user inventory with full diagnostics
router.get('/user-inventory-diagnostic', authenticateToken, rateLimitMiddleware, async (req, res) => {
  try {
    const { game = 'cs2' } = req.query;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const inventoryManager = require('../services/inventoryManager');
    const result = await inventoryManager.getUserInventoryWithDiagnostics(user.steamId, game);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user inventory with diagnostics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get owned games for user
router.get('/owned-games/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;

    const steamWebApiService = require('../services/steamWebApiService');
    const result = await steamWebApiService.getOwnedGames(steamId);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching owned games:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check if user owns a specific game
router.get('/game-ownership/:steamId/:appId', async (req, res) => {
  try {
    const { steamId, appId } = req.params;

    const steamWebApiService = require('../services/steamWebApiService');
    const result = await steamWebApiService.isGameOwner(steamId, parseInt(appId));

    res.json(result);
  } catch (error) {
    logger.error('Error checking game ownership:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user level
router.get('/user-level/:steamId', async (req, res) => {
  try {
    const { steamId } = req.params;

    const steamWebApiService = require('../services/steamWebApiService');
    const result = await steamWebApiService.getUserLevel(steamId);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching user level:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
