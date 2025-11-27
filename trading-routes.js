// TRADING ROUTES - Basic trading system API endpoints
const express = require('express');
const basicTradingSystem = require('./basic-trading-system');

const router = express.Router();

// Create a new listing
router.post('/api/trading/listings', async (req, res) => {
  try {
    const { steamId, appId, itemId, itemName, price, currency = 'USD' } = req.body;
    const userId = 'demo_user_1'; // In real implementation, this would come from authentication

    console.log(`🏷️  Creating listing: ${itemName} for $${price}`);

    if (!steamId || !appId || !itemId || !itemName || !price) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['steamId', 'appId', 'itemId', 'itemName', 'price']
      });
    }

    const listing = basicTradingSystem.createListing(
      userId,
      steamId,
      appId,
      itemId,
      itemName,
      price,
      currency
    );

    res.json({
      success: true,
      data: listing,
      message: 'Listing created successfully'
    });

  } catch (error) {
    console.error('❌ Create listing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all active listings with optional filters
router.get('/api/trading/listings', (req, res) => {
  try {
    const { appId, minPrice, maxPrice, itemName, sortBy } = req.query;

    const filters = {};
    if (appId) filters.appId = appId;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (itemName) filters.itemName = itemName;
    if (sortBy) filters.sortBy = sortBy;

    const listings = basicTradingSystem.getActiveListings(filters);

    res.json({
      success: true,
      data: listings,
      count: listings.length
    });

  } catch (error) {
    console.error('❌ Get listings error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get listing by ID
router.get('/api/trading/listings/:listingId', (req, res) => {
  try {
    const { listingId } = req.params;
    const listing = basicTradingSystem.getListing(listingId);

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });

  } catch (error) {
    console.error('❌ Get listing error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update listing price
router.put('/api/trading/listings/:listingId/price', (req, res) => {
  try {
    const { listingId } = req.params;
    const { price } = req.body;
    const userId = 'demo_user_1'; // In real implementation, this would come from authentication

    if (!price) {
      return res.status(400).json({
        success: false,
        error: 'Price is required'
      });
    }

    const updatedListing = basicTradingSystem.updateListingPrice(
      listingId,
      price,
      userId
    );

    res.json({
      success: true,
      data: updatedListing,
      message: 'Listing price updated successfully'
    });

  } catch (error) {
    console.error('❌ Update listing price error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Remove listing
router.delete('/api/trading/listings/:listingId', (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = 'demo_user_1'; // In real implementation, this would come from authentication

    const removedListing = basicTradingSystem.removeListing(
      listingId,
      userId
    );

    res.json({
      success: true,
      data: removedListing,
      message: 'Listing removed successfully'
    });

  } catch (error) {
    console.error('❌ Remove listing error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Create a trade offer
router.post('/api/trading/offers', (req, res) => {
  try {
    const { toSteamId, appId, offerItems, requestedItems, message = '' } = req.body;
    const fromUserId = 'demo_user_1'; // In real implementation, this would come from authentication

    console.log(`🤝 Creating offer to ${toSteamId} for ${appId}`);

    if (!toSteamId || !appId || !offerItems || !requestedItems) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['toSteamId', 'appId', 'offerItems', 'requestedItems']
      });
    }

    // Basic validation of items
    if (!Array.isArray(offerItems) || !Array.isArray(requestedItems)) {
      return res.status(400).json({
        success: false,
        error: 'offerItems and requestedItems must be arrays'
      });
    }

    const offer = basicTradingSystem.createOffer(
      fromUserId,
      toSteamId,
      appId,
      offerItems,
      requestedItems,
      message
    );

    res.json({
      success: true,
      data: offer,
      message: 'Trade offer created successfully'
    });

  } catch (error) {
    console.error('❌ Create offer error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get offer by ID
router.get('/api/trading/offers/:offerId', (req, res) => {
  try {
    const { offerId } = req.params;
    const offer = basicTradingSystem.getOffer(offerId);

    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }

    res.json({
      success: true,
      data: offer
    });

  } catch (error) {
    console.error('❌ Get offer error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Accept trade offer
router.post('/api/trading/offers/:offerId/accept', (req, res) => {
  try {
    const { offerId } = req.params;
    const { acceptingUserId } = req.body;

    if (!acceptingUserId) {
      return res.status(400).json({
        success: false,
        error: 'acceptingUserId is required'
      });
    }

    const acceptedOffer = basicTradingSystem.acceptOffer(
      offerId,
      acceptingUserId
    );

    res.json({
      success: true,
      data: acceptedOffer,
      message: 'Offer accepted successfully'
    });

  } catch (error) {
    console.error('❌ Accept offer error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Decline trade offer
router.post('/api/trading/offers/:offerId/decline', (req, res) => {
  try {
    const { offerId } = req.params;
    const { decliningUserId, reason = '' } = req.body;

    if (!decliningUserId) {
      return res.status(400).json({
        success: false,
        error: 'decliningUserId is required'
      });
    }

    const declinedOffer = basicTradingSystem.declineOffer(
      offerId,
      decliningUserId,
      reason
    );

    res.json({
      success: true,
      data: declinedOffer,
      message: 'Offer declined successfully'
    });

  } catch (error) {
    console.error('❌ Decline offer error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Cancel trade offer
router.post('/api/trading/offers/:offerId/cancel', (req, res) => {
  try {
    const { offerId } = req.params;
    const { cancelingUserId } = req.body;

    if (!cancelingUserId) {
      return res.status(400).json({
        success: false,
        error: 'cancelingUserId is required'
      });
    }

    const cancelledOffer = basicTradingSystem.cancelOffer(
      offerId,
      cancelingUserId
    );

    res.json({
      success: true,
      data: cancelledOffer,
      message: 'Offer cancelled successfully'
    });

  } catch (error) {
    console.error('❌ Cancel offer error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Complete a trade
router.post('/api/trading/trades/complete', (req, res) => {
  try {
    const { listingId, buyerUserId, transactionId } = req.body;

    console.log(`💰 Completing trade for listing ${listingId}`);

    if (!listingId || !buyerUserId || !transactionId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['listingId', 'buyerUserId', 'transactionId']
      });
    }

    const trade = basicTradingSystem.completeTrade(
      listingId,
      buyerUserId,
      transactionId
    );

    res.json({
      success: true,
      data: trade,
      message: 'Trade completed successfully'
    });

  } catch (error) {
    console.error('❌ Complete trade error:', error.message);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's listings
router.get('/api/trading/users/:userId/listings', (req, res) => {
  try {
    const { userId } = req.params;
    const listings = basicTradingSystem.getUserListings(userId);

    res.json({
      success: true,
      data: listings,
      count: listings.length
    });

  } catch (error) {
    console.error('❌ Get user listings error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's offers
router.get('/api/trading/users/:userId/offers', (req, res) => {
  try {
    const { userId } = req.params;
    const { steamId } = req.query;
    const offers = basicTradingSystem.getUserOffers(userId, steamId);

    res.json({
      success: true,
      data: offers,
      count: offers.length
    });

  } catch (error) {
    console.error('❌ Get user offers error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get user's trade history
router.get('/api/trading/users/:userId/trades', (req, res) => {
  try {
    const { userId } = req.params;
    const trades = basicTradingSystem.getUserTrades(userId);

    res.json({
      success: true,
      data: trades,
      count: trades.length
    });

  } catch (error) {
    console.error('❌ Get user trades error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get marketplace statistics
router.get('/api/trading/stats', (req, res) => {
  try {
    const stats = basicTradingSystem.getMarketplaceStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Get marketplace stats error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;