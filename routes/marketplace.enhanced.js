/**
 * Enhanced Marketplace Routes with Steam Integration
 * Маркетплейс с интеграцией Steam trade automation
 */

const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const { validateListing, validatePurchase } = require('../middleware/validation');
const MarketListing = require('../models/MarketListing');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const steamIntegration = require('../services/steamIntegrationService');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Create new listing with Steam validation
 * POST /api/marketplace/listings
 */
router.post('/listings', authenticateToken, validateListing, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      assetId,
      classId,
      instanceId,
      name,
      marketName,
      price,
      exterior,
      rarity,
      description
    } = req.body;

    const user = await User.findById(req.user._id || req.user.id).session(session);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has trade URL set
    if (!user.tradeUrl) {
      throw new Error('Please set your Steam trade URL first');
    }

    // Verify user owns the item and it's tradable
    const itemOwnership = await steamIntegration.verifyItemOwnership(
      user.steamId,
      assetId
    );

    if (!itemOwnership) {
      throw new Error('Item not found in your Steam inventory or not tradable');
    }

    if (!itemOwnership.tradable) {
      throw new Error('Item is not tradable');
    }

    if (!itemOwnership.marketable) {
      throw new Error('Item is not marketable');
    }

    // Check if item is already listed
    const existingListing = await MarketListing.findOne({
      'item.assetId': assetId,
      status: { $in: ['active', 'pending_trade'] }
    }).session(session);

    if (existingListing) {
      throw new Error('Item is already listed for sale');
    }

    // Validate price is reasonable (not more than 2x market price)
    const marketPrice = await steamIntegration.getMarketPrice(marketName);
    if (marketPrice.success) {
      const lowestPrice = parseFloat(marketPrice.lowestPrice.replace('$', ''));
      if (price > lowestPrice * 2) {
        logger.warn(`Listing price ${price} is >2x market price ${lowestPrice} for ${marketName}`);
      }
    }

    // Create listing
    const listing = new MarketListing({
      seller: user._id,
      item: {
        assetId: itemOwnership.assetId,
        classId: itemOwnership.classId,
        instanceId: itemOwnership.instanceId,
        name: itemOwnership.name,
        marketName: itemOwnership.marketName,
        iconUrl: itemOwnership.iconUrl,
        exterior: itemOwnership.exterior,
        rarity: itemOwnership.rarity,
        type: itemOwnership.type,
        weapon: itemOwnership.weapon,
        stattrak: itemOwnership.stattrak,
        souvenir: itemOwnership.souvenir
      },
      price,
      status: 'active',
      description,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    await listing.save({ session });

    // Mark item as listed in user's inventory
    const inventoryIndex = user.steamInventory.findIndex(
      item => item.assetId === assetId
    );

    if (inventoryIndex !== -1) {
      user.steamInventory[inventoryIndex].listed = true;
      user.steamInventory[inventoryIndex].listingId = listing._id;
      await user.save({ session });
    }

    await session.commitTransaction();

    logger.info(`Listing created: ${listing._id} by ${user.username}`);

    // Emit real-time event
    if (req.io) {
      req.io.emit('new-listing', {
        listing: await MarketListing.findById(listing._id)
          .populate('seller', 'username displayName avatar reputation')
      });
    }

    const populatedListing = await MarketListing.findById(listing._id)
      .populate('seller', 'username displayName avatar reputation');

    res.status(201).json(populatedListing);

  } catch (error) {
    await session.abortTransaction();
    logger.error('Create listing error:', error);

    res.status(400).json({
      error: error.message,
      details: error.stack
    });
  } finally {
    session.endSession();
  }
});

/**
 * Purchase item with trade automation
 * POST /api/marketplace/listings/:id/purchase
 */
router.post('/listings/:id/purchase', authenticateToken, validatePurchase, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { listingId } = req.params;
    const buyerId = req.user._id || req.user.id;

    // Get listing
    const listing = await MarketListing.findOne({
      _id: listingId,
      status: 'active'
    }).populate('seller').session(session);

    if (!listing) {
      throw new Error('Listing not found or not available');
    }

    // Prevent self-purchase
    if (listing.seller._id.toString() === buyerId) {
      throw new Error('Cannot purchase your own listing');
    }

    // Get buyer
    const buyer = await User.findById(buyerId).session(session);
    if (!buyer) {
      throw new Error('Buyer not found');
    }

    // Verify seller still owns the item
    const sellerItemOwnership = await steamIntegration.verifyItemOwnership(
      listing.seller.steamId,
      listing.item.assetId
    );

    if (!sellerItemOwnership || !sellerItemOwnership.tradable) {
      throw new Error('Seller no longer owns this item or item is not tradable');
    }

    // Check buyer has trade URL
    if (!buyer.tradeUrl) {
      throw new Error('Please set your Steam trade URL before purchasing');
    }

    // Check buyer has sufficient balance
    if (buyer.wallet.balance < listing.price) {
      throw new Error('Insufficient balance. Please deposit funds first.');
    }

    // Calculate commission (5%)
    const commission = (listing.price * 5) / 100;
    const sellerReceives = listing.price - commission;

    // Transfer funds
    buyer.wallet.balance -= listing.price;
    buyer.wallet.pendingBalance += listing.price;
    await buyer.save({ session });

    listing.seller.wallet.pendingBalance += sellerReceives;
    await listing.seller.save({ session });

    // Update listing status
    listing.status = 'pending_trade';
    listing.buyer = buyer._id;
    await listing.save({ session });

    // Mark item as sold in seller's inventory
    const sellerInventoryIndex = listing.seller.steamInventory.findIndex(
      item => item.assetId === listing.item.assetId
    );

    if (sellerInventoryIndex !== -1) {
      listing.seller.steamInventory[sellerInventoryIndex].listed = false;
      listing.seller.steamInventory[sellerInventoryIndex].sold = true;
      await listing.seller.save({ session });
    }

    // Create transaction records
    const buyerTransaction = new Transaction({
      type: 'purchase',
      user: buyer._id,
      listing: listing._id,
      amount: -listing.price,
      status: 'completed',
      description: `Purchase: ${listing.item.marketName}`
    });
    await buyerTransaction.save({ session });

    const sellerTransaction = new Transaction({
      type: 'sale',
      user: listing.seller._id,
      listing: listing._id,
      amount: sellerReceives,
      status: 'pending',
      description: `Sale: ${listing.item.marketName}`,
      metadata: {
        commission,
        commissionRate: 5
      }
    });
    await sellerTransaction.save({ session });

    const commissionTransaction = new Transaction({
      type: 'fee',
      user: listing.seller._id,
      listing: listing._id,
      amount: -commission,
      status: 'completed',
      description: 'Marketplace commission (5%)'
    });
    await commissionTransaction.save({ session });

    await session.commitTransaction();

    logger.info(`Purchase initiated: ${listing._id} by ${buyer.username}`);

    // Queue trade offer (if steamBotManager is available)
    if (req.steamBotManager) {
      try {
        const tradeQueueId = req.steamBotManager.queueTrade({
          listingId: listing._id.toString(),
          buyerId: buyer._id.toString(),
          buyerSteamId: buyer.steamId,
          buyerTradeUrl: buyer.tradeUrl,
          sellerId: listing.seller._id.toString(),
          assetId: listing.item.assetId,
          price: listing.price
        });

        logger.info(`Trade queued: ${tradeQueueId} for listing ${listing._id}`);
      } catch (tradeError) {
        logger.error('Error queueing trade:', tradeError);
        // Don't fail the purchase, just log the error
      }
    } else {
      logger.warn('Steam bot manager not available, trade offer will be sent manually');
    }

    // Real-time notifications
    if (req.io) {
      req.io.to(`user-${buyer._id}`).emit('purchase-initiated', {
        listingId: listing._id,
        item: listing.item,
        price: listing.price,
        status: 'pending_trade'
      });

      req.io.to(`user-${listing.seller._id}`).emit('item-sold', {
        listingId: listing._id,
        buyer: {
          username: buyer.username,
          displayName: buyer.displayName
        },
        item: listing.item,
        price: listing.price,
        amountReceiving: sellerReceives
      });
    }

    const populatedListing = await MarketListing.findById(listing._id)
      .populate('seller buyer', 'username displayName avatar steamId tradeUrl');

    res.json({
      success: true,
      listing: populatedListing,
      transactions: {
        buyer: buyerTransaction._id,
        seller: sellerTransaction._id,
        commission: commissionTransaction._id
      },
      nextSteps: {
        message: 'Trade offer will be sent shortly',
        estimatedTime: '1-2 minutes'
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error('Purchase error:', error);

    res.status(400).json({
      error: error.message,
      details: error.stack
    });
  } finally {
    session.endSession();
  }
});

/**
 * Get trade offer status
 * GET /api/marketplace/trades/:offerId/status
 */
router.get('/trades/:offerId/status', authenticateToken, async (req, res) => {
  try {
    const { offerId } = req.params;

    // Check if steamBotManager is available
    if (!req.steamBotManager) {
      return res.status(503).json({
        error: 'Trade service unavailable',
        message: 'Steam bot manager not initialized'
      });
    }

    const status = await req.steamBotManager.checkTradeStatus(offerId);

    if (!status) {
      return res.status(404).json({
        error: 'Trade offer not found',
        message: 'No trade offer found with this ID'
      });
    }

    // Find listing associated with this trade offer
    const listing = await MarketListing.findOne({ tradeOfferId: offerId });

    res.json({
      tradeOfferId: offerId,
      botId: status.botId,
      state: status.state,
      stateName: status.stateName,
      isCompleted: status.isCompleted,
      isSuccessful: status.isSuccessful,
      listing: listing ? {
        id: listing._id,
        item: listing.item,
        price: listing.price
      } : null
    });

  } catch (error) {
    logger.error('Error checking trade status:', error);
    res.status(500).json({
      error: 'Failed to check trade status',
      details: error.message
    });
  }
});

/**
 * Get bot system status
 * GET /api/marketplace/bots/status
 */
router.get('/bots/status', authenticateToken, async (req, res) => {
  try {
    if (!req.steamBotManager) {
      return res.status(503).json({
        error: 'Trade service unavailable',
        message: 'Steam bot manager not initialized'
      });
    }

    const systemStatus = req.steamBotManager.getSystemStatus();
    const botsStatus = req.steamBotManager.getBotsStatus();
    const queueStatus = req.steamBotManager.getQueueStatus();

    res.json({
      system: systemStatus,
      bots: botsStatus,
      queue: queueStatus
    });

  } catch (error) {
    logger.error('Error fetching bot status:', error);
    res.status(500).json({
      error: 'Failed to fetch bot status',
      details: error.message
    });
  }
});

/**
 * Get active user's listings with enhanced data
 * GET /api/marketplace/my-listings
 */
router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const listings = await MarketListing.find({ seller: userId })
      .populate('buyer', 'username displayName')
      .sort({ createdAt: -1 });

    // Enhance with market prices
    const enhancedListings = await Promise.all(
      listings.map(async (listing) => {
        const marketPrice = await steamIntegration.getMarketPrice(listing.item.marketName);
        return {
          ...listing.toJSON(),
          marketPrice: marketPrice,
          priceVsMarket: marketPrice.success ? {
            lowestPrice: parseFloat(marketPrice.lowestPrice.replace('$', '')),
            difference: listing.price - parseFloat(marketPrice.lowestPrice.replace('$', ''))
          } : null
        };
      })
    );

    res.json({
      listings: enhancedListings,
      count: enhancedListings.length,
      active: enhancedListings.filter(l => l.status === 'active').length,
      sold: enhancedListings.filter(l => l.status === 'sold').length,
      pending: enhancedListings.filter(l => l.status === 'pending_trade').length
    });

  } catch (error) {
    logger.error('Error fetching user listings:', error);
    res.status(500).json({
      error: 'Failed to fetch listings',
      details: error.message
    });
  }
});

module.exports = router;
