/**
 * Enhanced Steam Integration Routes
 * Расширенная интеграция с Steam API для marketplace
 */

const express = require('express');
const axios = require('axios');
const { authenticateToken } = require('../middleware/auth');
const { validateTradeUrl } = require('../middleware/validation');
const User = require('../models/User');
const MarketListing = require('../models/MarketListing');
const steamIntegration = require('../services/steamIntegrationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get user's Steam inventory (Enhanced)
 * GET /api/steam/inventory
 */
router.get('/inventory', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Fetching inventory for user: ${user.username}`);

    // Get fresh inventory from Steam
    const result = await steamIntegration.getInventory(user.steamId);

    // Update user's inventory in database
    if (result.items && result.items.length > 0) {
      user.steamInventory = result.items;
      user.steamInventoryUpdated = new Date();
      await user.save();
    }

    res.json({
      items: result.items || [],
      cached: result.cached || false,
      count: result.items ? result.items.length : 0
    });
  } catch (error) {
    logger.error('Error fetching inventory:', error);

    // Return cached inventory if available
    const user = await User.findById(req.user._id || req.user.id);
    if (user && user.steamInventory && user.steamInventory.length > 0) {
      return res.json({
        items: user.steamInventory,
        cached: true,
        error: 'Steam API unavailable, showing cached inventory',
        count: user.steamInventory.length
      });
    }

    res.status(500).json({
      error: 'Failed to fetch inventory',
      details: error.message
    });
  }
});

/**
 * Verify item ownership
 * GET /api/steam/verify-item/:assetId
 */
router.get('/verify-item/:assetId', authenticateToken, async (req, res) => {
  try {
    const { assetId } = req.params;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info(`Verifying ownership of asset ${assetId} for user ${user.username}`);

    // Verify using Steam API
    const item = await steamIntegration.verifyItemOwnership(user.steamId, assetId);

    if (!item) {
      return res.json({
        verified: false,
        message: 'Item not found in your Steam inventory or not tradable'
      });
    }

    res.json({
      verified: true,
      item: {
        assetId: item.assetId,
        name: item.name,
        marketName: item.marketName,
        tradable: item.tradable,
        marketable: item.marketable,
        exterior: item.exterior,
        rarity: item.rarity,
        iconUrl: item.iconUrl
      },
      canList: item.tradable && item.marketable
    });
  } catch (error) {
    logger.error('Error verifying item:', error);
    res.status(500).json({
      error: 'Failed to verify item',
      details: error.message
    });
  }
});

/**
 * Get item float value
 * GET /api/steam/float/:inspectUrl
 */
router.get('/float/:inspectUrl', authenticateToken, async (req, res) => {
  try {
    const { inspectUrl } = req.params;

    if (!inspectUrl) {
      return res.status(400).json({ error: 'Inspect URL is required' });
    }

    logger.info(`Fetching float value for: ${inspectUrl}`);

    // Get float value using multiple services
    const result = await steamIntegration.getFloatValue(inspectUrl);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching float value:', error);
    res.status(500).json({
      error: 'Failed to fetch float value',
      details: error.message
    });
  }
});

/**
 * Get market price with history
 * GET /api/steam/price/:marketName
 */
router.get('/price/:marketName', async (req, res) => {
  try {
    const { marketName } = req.params;
    const { currency = 'USD' } = req.query;

    logger.info(`Fetching market price for: ${marketName}`);

    const result = await steamIntegration.getMarketPrice(marketName, currency);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching market price:', error);
    res.status(500).json({
      error: 'Failed to fetch market price',
      details: error.message
    });
  }
});

/**
 * Get price history
 * GET /api/steam/price-history/:marketName
 */
router.get('/price-history/:marketName', async (req, res) => {
  try {
    const { marketName } = req.params;

    logger.info(`Fetching price history for: ${marketName}`);

    const result = await steamIntegration.getPriceHistory(marketName);

    res.json(result);
  } catch (error) {
    logger.error('Error fetching price history:', error);
    res.status(500).json({
      error: 'Failed to fetch price history',
      details: error.message
    });
  }
});

/**
 * Set user's trade URL
 * POST /api/steam/trade-url
 */
router.post('/trade-url', authenticateToken, validateTradeUrl, async (req, res) => {
  try {
    const { tradeUrl } = req.body;

    const user = await User.findById(req.user._id || req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.tradeUrl = tradeUrl;
    await user.save();

    logger.info(`Updated trade URL for user: ${user.username}`);

    res.json({
      message: 'Trade URL updated successfully',
      tradeUrl: user.tradeUrl
    });
  } catch (error) {
    logger.error('Error updating trade URL:', error);
    res.status(500).json({
      error: 'Failed to update trade URL',
      details: error.message
    });
  }
});

/**
 * Get user's trade URL
 * GET /api/steam/trade-url
 */
router.get('/trade-url', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('tradeUrl');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      tradeUrl: user.tradeUrl || null
    });
  } catch (error) {
    logger.error('Error fetching trade URL:', error);
    res.status(500).json({
      error: 'Failed to fetch trade URL',
      details: error.message
    });
  }
});

/**
 * Validate trade URL format
 * POST /api/steam/validate-trade-url
 */
router.post('/validate-trade-url', authenticateToken, async (req, res) => {
  try {
    const { tradeUrl } = req.body;

    if (!tradeUrl) {
      return res.status(400).json({ error: 'Trade URL is required' });
    }

    // Steam trade URL format: https://steamcommunity.com/tradeoffer/new/?partner=STEAMID32&token=TOKEN
    const steamTradeUrlPattern = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+(&token=[a-zA-Z0-9_-]+)?$/;

    const isValid = steamTradeUrlPattern.test(tradeUrl);

    // Extract partner ID if valid
    let partnerId = null;
    if (isValid) {
      const match = tradeUrl.match(/partner=(\d+)/);
      if (match) {
        partnerId = match[1];
      }
    }

    res.json({
      valid: isValid,
      partnerId: partnerId,
      message: isValid
        ? 'Trade URL is valid'
        : 'Trade URL format is invalid'
    });
  } catch (error) {
    logger.error('Error validating trade URL:', error);
    res.status(500).json({
      error: 'Failed to validate trade URL',
      details: error.message
    });
  }
});

/**
 * Get listing statistics
 * GET /api/steam/listing-stats/:listingId
 */
router.get('/listing-stats/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;

    const listing = await MarketListing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get current market price
    const priceData = await steamIntegration.getMarketPrice(listing.item.marketName);

    // Get price history
    const historyData = await steamIntegration.getPriceHistory(listing.item.marketName);

    res.json({
      listing: {
        id: listing._id,
        price: listing.price,
        marketName: listing.item.marketName
      },
      marketPrice: priceData,
      priceHistory: historyData,
      priceVsMarket: priceData.success
        ? {
            listingPrice: listing.price,
            lowestPrice: parseFloat(priceData.lowestPrice.replace('$', '')),
            difference: listing.price - parseFloat(priceData.lowestPrice.replace('$', '')),
            percentage: ((listing.price / parseFloat(priceData.lowestPrice.replace('$', ''))) - 1) * 100
          }
        : null
    });
  } catch (error) {
    logger.error('Error fetching listing stats:', error);
    res.status(500).json({
      error: 'Failed to fetch listing stats',
      details: error.message
    });
  }
});

/**
 * Get cache statistics
 * GET /api/steam/cache/stats
 */
router.get('/cache/stats', authenticateToken, async (req, res) => {
  try {
    const stats = steamIntegration.getCacheStats();

    res.json({
      cache: {
        size: stats.size,
        entries: stats.entries.map(entry => ({
          key: entry.key,
          timestamp: entry.timestamp,
          itemsCount: entry.items
        }))
      }
    });
  } catch (error) {
    logger.error('Error fetching cache stats:', error);
    res.status(500).json({
      error: 'Failed to fetch cache stats',
      details: error.message
    });
  }
});

/**
 * Clear cache
 * POST /api/steam/cache/clear
 */
router.post('/cache/clear', authenticateToken, async (req, res) => {
  try {
    steamIntegration.clearCache();

    logger.info('Steam integration cache cleared by user');

    res.json({
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Error clearing cache:', error);
    res.status(500).json({
      error: 'Failed to clear cache',
      details: error.message
    });
  }
});

module.exports = router;
