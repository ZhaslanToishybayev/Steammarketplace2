const express = require('express');
const router = express.Router();

// Use demo marketplace service for MVP (no MongoDB required)
const MarketplaceService = require('../services/marketplaceService.demo');

// Initialize service
const marketplaceService = new MarketplaceService(null);

// GET /api/mvp/listings - Get all active listings
router.get('/listings', async (req, res) => {
  try {
    const { weapon, rarity, search, page = 1, limit = 20 } = req.query;

    let filters = {};
    if (weapon) filters.weaponType = weapon;
    if (rarity) filters.rarity = rarity;
    if (search) {
      const listings = await marketplaceService.searchListings(search);
      return res.json({
        success: true,
        data: listings,
        count: listings.length
      });
    }

    const listings = await marketplaceService.getListings(filters);
    res.json({
      success: true,
      data: listings,
      count: listings.length
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings'
    });
  }
});

// GET /api/mvp/listings/:weapon - Get listings by weapon
router.get('/listings/:weapon', async (req, res) => {
  try {
    const { weapon } = req.params;
    const listings = await marketplaceService.getListingsByWeapon(weapon);
    res.json({
      success: true,
      data: listings,
      count: listings.length
    });
  } catch (error) {
    console.error('Error fetching listings by weapon:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings'
    });
  }
});

// POST /api/mvp/listings - Create new listing
router.post('/listings', async (req, res) => {
  try {
    const {
      itemName,
      skinName,
      weaponType,
      rarity,
      price,
      condition,
      imageUrl,
      sellerId,
      sellerName
    } = req.body;

    // Validate required fields
    if (!itemName || !weaponType || !price || !sellerId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    const listingData = {
      itemId: `mvp_${Date.now()}`,
      itemName,
      skinName: skinName || itemName,
      weaponType,
      rarity: rarity || 'Mil-Spec Grade',
      price: parseFloat(price),
      condition: condition || 'Factory New',
      imageUrl: imageUrl || 'https://community.cloudflare.steamstatic.com/economy/image/class/730/3563296/300x300',
      sellerId,
      sellerName: sellerName || 'Demo User',
      status: 'active'
    };

    const listing = await marketplaceService.createListing(listingData);

    // Emit socket event for real-time update
    if (req.io) {
      req.io.emit('listing:created', listing);
    }

    res.status(201).json({
      success: true,
      data: listing,
      message: 'Listing created successfully'
    });
  } catch (error) {
    console.error('Error creating listing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create listing'
    });
  }
});

// POST /api/mvp/purchase/:listingId - Purchase item (demo)
router.post('/purchase/:listingId', async (req, res) => {
  try {
    const { listingId } = req.params;
    const { buyerId, buyerName } = req.body;

    if (!buyerId) {
      return res.status(400).json({
        success: false,
        error: 'Buyer ID required'
      });
    }

    const result = await marketplaceService.purchaseItem(
      listingId,
      buyerId,
      buyerName || 'Demo Buyer'
    );

    // Emit socket events
    if (req.io) {
      req.io.emit('trade:completed', {
        listing: result.listing,
        transaction: result.transaction
      });
    }

    res.json({
      success: true,
      data: result,
      message: 'Item purchased successfully (Demo Mode)'
    });
  } catch (error) {
    console.error('Error purchasing item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to purchase item'
    });
  }
});

// GET /api/mvp/stats - Get marketplace statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await marketplaceService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// GET /api/mvp/transactions/:userId - Get user transactions
router.get('/transactions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = await marketplaceService.getTransactions(userId);
    res.json({
      success: true,
      data: transactions,
      count: transactions.length
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

// GET /api/mvp/search - Search listings
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const listings = await marketplaceService.searchListings(q.trim());
    res.json({
      success: true,
      data: listings,
      count: listings.length,
      query: q
    });
  } catch (error) {
    console.error('Error searching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

module.exports = router;
