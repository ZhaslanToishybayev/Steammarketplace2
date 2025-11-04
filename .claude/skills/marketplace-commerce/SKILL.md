---
name: marketplace-commerce
description: Comprehensive guide for marketplace commerce features including listings management, purchase flows, payment processing with Stripe, wallet systems, and transaction handling.
---

# Marketplace Commerce Patterns

## Purpose

Best practices for building marketplace commerce functionality including item listings, purchase flows, payment processing, wallet management, and transaction handling.

## When to Use This Skill

Automatically activates when working on:
- Creating/editing marketplace listings
- Purchase and sale flows
- Payment processing (Stripe integration)
- User wallet and balance management
- Transaction records
- Listing validation and verification
- Price tracking and history
- Commission and fee calculations
- Refund handling
- Sales analytics

## Core Architecture

### Database Models

#### MarketListing Model

```javascript
// models/MarketListing.js
const mongoose = require('mongoose');

const marketListingSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  item: {
    assetId: {
      type: String,
      required: true,
      unique: true
    },
    classId: {
      type: String,
      required: true
    },
    instanceId: String,
    name: {
      type: String,
      required: true
    },
    marketName: {
      type: String,
      required: true
    },
    iconUrl: String,
    exterior: String,
    rarity: String,
    type: String,
    weapon: String,
    skin: String,
    stattrak: {
      type: Boolean,
      default: false
    },
    souvenir: {
      type: Boolean,
      default: false
    },
    float: Number,
    inspectUrl: String
  },
  price: {
    type: Number,
    required: true,
    min: 0.01
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'EUR', 'GBP']
  },
  status: {
    type: String,
    enum: ['active', 'sold', 'cancelled', 'pending_trade', 'expired'],
    default: 'active'
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  tradeOfferId: {
    type: String,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  featured: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    maxlength: 500
  },
  tags: [String],
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  },
  commission: {
    type: Number,
    default: 5 // 5% commission
  }
}, {
  timestamps: true
});

// Indexes
marketListingSchema.index({ status: 1, price: 1 });
marketListingSchema.index({ 'item.marketName': 'text', 'item.name': 'text' });
marketListingSchema.index({ seller: 1, status: 1 });
marketListingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MarketListing', marketListingSchema);
```

#### Transaction Model

```javascript
// models/Transaction.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'purchase', 'sale', 'fee', 'refund', 'bonus'],
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  listing: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketListing',
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'wallet', 'paypal', 'bank_transfer'],
    default: 'wallet'
  },
  stripePaymentIntentId: {
    type: String,
    default: null
  },
  stripeChargeId: {
    type: String,
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  description: String
}, {
  timestamps: true
});

transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ type: 1, status: 1 });
transactionSchema.index({ listing: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
```

## Listing Management Patterns

### 1. Create Listing

```javascript
// routes/marketplace.js
router.post('/listings', authenticateToken, async (req, res) => {
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
      description,
      exterior,
      rarity
    } = req.body;

    // Verify user owns the item
    const user = await User.findById(req.user._id).session(session);
    const item = user.steamInventory.find(i => i.assetId === assetId);

    if (!item) {
      throw new Error('Item not found in your inventory');
    }

    if (!item.tradable) {
      throw new Error('Item is not tradable');
    }

    // Check if listing already exists
    const existingListing = await MarketListing.findOne({
      'item.assetId': assetId,
      status: { $in: ['active', 'pending_trade'] }
    }).session(session);

    if (existingListing) {
      throw new Error('Item is already listed for sale');
    }

    // Create listing
    const listing = new MarketListing({
      seller: user._id,
      item: {
        assetId,
        classId,
        instanceId,
        name,
        marketName,
        exterior,
        rarity,
        iconUrl: item.iconUrl
      },
      price,
      description,
      status: 'active'
    });

    await listing.save({ session });

    // Update user's inventory to mark item as listed
    const inventoryIndex = user.steamInventory.findIndex(i => i.assetId === assetId);
    user.steamInventory[inventoryIndex].listed = true;
    user.steamInventory[inventoryIndex].listingId = listing._id;
    await user.save({ session });

    await session.commitTransaction();

    // Emit real-time event
    req.io.emit('new-listing', {
      listing: await MarketListing.findById(listing._id)
        .populate('seller', 'username displayName avatar')
    });

    res.status(201).json(listing);

  } catch (error) {
    await session.abortTransaction();
    logger.error('Create listing error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});
```

### 2. Get Listings with Filters

```javascript
// GET /api/marketplace/listings
router.get('/listings', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      minPrice,
      maxPrice,
      rarity,
      exterior,
      weapon,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = { status: 'active' };

    // Search filter
    if (search) {
      filter.$or = [
        { 'item.marketName': { $regex: search, $options: 'i' } },
        { 'item.name': { $regex: search, $options: 'i' } },
        { 'item.skin': { $regex: search, $options: 'i' } },
        { 'item.weapon': { $regex: search, $options: 'i' } }
      ];
    }

    // Price filters
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Other filters
    if (rarity) filter['item.rarity'] = rarity;
    if (exterior) filter['item.exterior'] = exterior;
    if (weapon) filter['item.weapon'] = weapon;

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const listings = await MarketListing.find(filter)
      .populate('seller', 'username displayName avatar reputation reputationPercentage')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()
      .exec();

    const total = await MarketListing.countDocuments(filter);

    res.json({
      listings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
        limit: parseInt(limit)
      }
    });

  } catch (error) {
    logger.error('Get listings error:', error);
    res.status(500).json({ error: 'Failed to fetch listings' });
  }
});
```

### 3. Update Listing

```javascript
// PUT /api/marketplace/listings/:id
router.put('/listings/:id', authenticateToken, async (req, res) => {
  try {
    const { price, description } = req.body;

    const listing = await MarketListing.findOne({
      _id: req.params.id,
      seller: req.user._id,
      status: 'active'
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or not editable' });
    }

    if (price && price !== listing.price) {
      // Validate new price
      if (price < 0.01) {
        return res.status(400).json({ error: 'Price must be at least $0.01' });
      }
      listing.price = price;
    }

    if (description !== undefined) {
      listing.description = description;
    }

    await listing.save();

    // Emit real-time update
    req.io.emit('listing-updated', { listing });

    res.json(listing);

  } catch (error) {
    logger.error('Update listing error:', error);
    res.status(500).json({ error: 'Failed to update listing' });
  }
});
```

### 4. Cancel Listing

```javascript
// DELETE /api/marketplace/listings/:id
router.delete('/api/marketplace/listings/:id', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const listing = await MarketListing.findOne({
      _id: req.params.id,
      seller: req.user._id,
      status: 'active'
    }).session(session);

    if (!listing) {
      throw new Error('Listing not found or cannot be cancelled');
    }

    // Update listing status
    listing.status = 'cancelled';
    await listing.save({ session });

    // Update user inventory
    const user = await User.findById(req.user._id).session(session);
    const inventoryIndex = user.steamInventory.findIndex(
      i => i.assetId === listing.item.assetId
    );

    if (inventoryIndex !== -1) {
      delete user.steamInventory[inventoryIndex].listed;
      delete user.steamInventory[inventoryIndex].listingId;
      await user.save({ session });
    }

    await session.commitTransaction();

    res.json({ success: true, message: 'Listing cancelled' });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});
```

## Purchase Flow Patterns

### 1. Purchase Item (Complete Flow)

```javascript
// POST /api/marketplace/listings/:id/purchase
router.post('/api/marketplace/listings/:id/purchase', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const listing = await MarketListing.findOne({
      _id: req.params.id,
      status: 'active'
    }).populate('seller').session(session);

    if (!listing) {
      throw new Error('Listing not found or not available');
    }

    // Prevent self-purchase
    if (listing.seller._id.toString() === req.user._id.toString()) {
      throw new Error('Cannot purchase your own listing');
    }

    // Get buyer
    const buyer = await User.findById(req.user._id).session(session);

    // Check balance
    if (buyer.wallet.balance < listing.price) {
      throw new Error('Insufficient balance. Please deposit funds.');
    }

    // Verify seller still owns the item
    const seller = await User.findById(listing.seller._id).session(session);
    const sellerItem = seller.steamInventory.find(
      i => i.assetId === listing.item.assetId
    );

    if (!sellerItem || !sellerItem.tradable) {
      throw new Error('Item is no longer available');
    }

    // Transfer funds
    const commission = (listing.price * listing.commission) / 100;
    const sellerReceives = listing.price - commission;

    // Buyer balance
    buyer.wallet.balance -= listing.price;
    buyer.wallet.pendingBalance += listing.price;
    await buyer.save({ session });

    // Seller pending balance
    seller.wallet.pendingBalance += sellerReceives;
    await seller.save({ session });

    // Update listing
    listing.status = 'pending_trade';
    listing.buyer = buyer._id;
    await listing.save({ session });

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
      user: seller._id,
      listing: listing._id,
      amount: sellerReceives,
      status: 'pending',
      description: `Sale: ${listing.item.marketName}`,
      metadata: {
        commission,
        commissionRate: listing.commission
      }
    });
    await sellerTransaction.save({ session });

    const commissionTransaction = new Transaction({
      type: 'fee',
      user: seller._id,
      listing: listing._id,
      amount: -commission,
      status: 'completed',
      description: `Commission (${listing.commission}%)`
    });
    await commissionTransaction.save({ session });

    await session.commitTransaction();

    // Queue trade offer
    req.steamBotManager.queueTrade({
      listingId: listing._id.toString(),
      buyerId: buyer._id.toString(),
      sellerId: seller._id.toString(),
      sellerSteamId: seller.steamId,
      buyerTradeUrl: buyer.tradeUrl,
      sellerTradeUrl: seller.tradeUrl,
      assetId: listing.item.assetId,
      price: listing.price
    });

    // Real-time notifications
    req.io.to(`user-${buyer._id}`).emit('purchase-initiated', {
      listingId: listing._id,
      item: listing.item,
      price: listing.price,
      status: 'pending_trade'
    });

    req.io.to(`user-${seller._id}`).emit('item-sold', {
      listingId: listing._id,
      buyer: {
        username: buyer.username,
        displayName: buyer.displayName
      },
      item: listing.item,
      price: listing.price,
      amountReceiving: sellerReceives
    });

    res.json({
      success: true,
      listing: {
        _id: listing._id,
        status: listing.status,
        price: listing.price
      },
      transactions: {
        buyer: buyerTransaction._id,
        seller: sellerTransaction._id
      }
    });

  } catch (error) {
    await session.abortTransaction();
    logger.error('Purchase error:', error);

    // Send error notification
    req.io.to(`user-${req.user._id}`).emit('purchase-failed', {
      listingId: req.params.id,
      error: error.message
    });

    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});
```

### 2. Complete Trade After Escrow

```javascript
// POST /api/marketplace/trades/:offerId/complete
router.post('/api/marketplace/trades/:offerId/complete', async (req, res) => {
  const { offerId } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Find listing by trade offer ID
    const listing = await MarketListing.findOne({
      tradeOfferId: offerId,
      status: 'pending_trade'
    }).populate('buyer seller').session(session);

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Get transactions
    const transactions = await Transaction.find({
      listing: listing._id,
      status: 'pending'
    }).session(session);

    // Update transaction statuses
    for (const transaction of transactions) {
      if (transaction.type === 'sale') {
        transaction.status = 'completed';

        // Move from pending to available balance
        const user = await User.findById(transaction.user).session(session);
        user.wallet.pendingBalance -= transaction.amount;
        user.wallet.balance += transaction.amount;
        await user.save({ session });
      }

      transaction.status = 'completed';
      await transaction.save({ session });
    }

    // Update listing status
    listing.status = 'sold';
    await listing.save({ session });

    await session.commitTransaction();

    // Notify both parties
    req.io.to(`user-${listing.buyer._id}`).emit('trade-completed', {
      listingId: listing._id,
      status: 'completed',
      item: listing.item
    });

    req.io.to(`user-${listing.seller._id}`).emit('trade-completed', {
      listingId: listing._id,
      status: 'completed',
      item: listing.item,
      amount: transactions.find(t => t.type === 'sale')?.amount
    });

    res.json({ success: true, status: 'completed' });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});
```

## Payment Processing Patterns

### 1. Stripe Integration

```javascript
// routes/payments.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent for deposit
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'usd' } = req.body;

    // Validate amount (min $1, max $10,000)
    if (amount < 1 || amount > 10000) {
      return res.status(400).json({
        error: 'Amount must be between $1 and $10,000'
      });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency,
      metadata: {
        userId: req.user._id.toString(),
        type: 'deposit'
      },
      description: `Deposit to wallet - User ${req.user.username}`
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });

  } catch (error) {
    logger.error('Stripe payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;

    try {
      const session = await mongoose.startSession();
      session.startTransaction();

      const userId = paymentIntent.metadata.userId;
      const amount = paymentIntent.amount / 100; // Convert back to dollars

      const user = await User.findById(userId).session(session);
      user.wallet.balance += amount;

      await user.save({ session });

      const transaction = new Transaction({
        type: 'deposit',
        user: userId,
        amount,
        status: 'completed',
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        description: 'Wallet deposit via Stripe'
      });

      await transaction.save({ session });

      await session.commitTransaction();

      logger.info(`Deposit completed: ${userId} - $${amount}`);

    } catch (error) {
      logger.error('Deposit processing error:', error);
    }
  }

  res.json({ received: true });
});
```

### 2. Wallet Management

```javascript
// GET /api/users/wallet
router.get('/api/users/wallet', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    const recentTransactions = await Transaction.find({ user: user._id })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      wallet: user.wallet,
      recentTransactions
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wallet' });
  }
});

// POST /api/users/wallet/withdraw
router.post('/api/users/wallet/withdraw', authenticateToken, async (req, res) => {
  const { amount } = req.body;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const user = await User.findById(req.user._id).session(session);

    // Validate amount
    if (amount < 10) {
      throw new Error('Minimum withdrawal amount is $10');
    }

    if (user.wallet.balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Check pending transactions
    const pendingAmount = await Transaction.aggregate([
      { $match: { user: user._id, status: 'pending', type: 'withdrawal' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalPending = pendingAmount[0]?.total || 0;

    if (user.wallet.balance - totalPending < amount) {
      throw new Error('Insufficient available balance (pending withdrawals exist)');
    }

    // Create withdrawal transaction
    const transaction = new Transaction({
      type: 'withdrawal',
      user: user._id,
      amount: -amount,
      status: 'pending',
      description: 'Withdrawal request'
    });

    await transaction.save({ session);

    // Deduct from balance
    user.wallet.balance -= amount;
    await user.save({ session);

    await session.commitTransaction();

    // Process withdrawal (manual or automatic)
    // This would integrate with PayPal, bank transfer, etc.

    res.json({
      success: true,
      transactionId: transaction._id,
      status: 'pending',
      message: 'Withdrawal request submitted'
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
});
```

## Transaction Analytics

### 1. Get User Stats

```javascript
// GET /api/users/stats
router.get('/api/users/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;

    const stats = await Transaction.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: '$type',
          total: { $sum: { $abs: '$amount' } },
          count: { $sum: 1 },
          completed: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const salesStats = await MarketListing.aggregate([
      { $match: { seller: userId, status: 'sold' } },
      {
        $group: {
          _id: null,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$price' },
          avgPrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      transactions: stats,
      sales: salesStats[0] || { totalSales: 0, totalRevenue: 0, avgPrice: 0 }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
```

## Best Practices

### 1. Data Consistency

- Always use MongoDB transactions for multi-document operations
- Use `findOneAndUpdate` with `$set` for atomic updates
- Implement optimistic locking with version keys
- Validate data at both client and server levels

### 2. Error Handling

- Use try-catch blocks for all async operations
- Log all errors with proper context
- Return consistent error responses
- Handle Stripe webhook errors gracefully
- Implement retry logic for transient failures

### 3. Security

- Validate ownership before allowing edits
- Prevent self-purchases
- Rate limit purchase attempts
- Verify trade offer authenticity
- Use environment variables for API keys
- Implement CSRF protection for state-changing operations

### 4. Performance

- Index frequently queried fields
- Use lean() for read-only operations
- Paginate all list endpoints
- Cache hot data (popular listings)
- Use aggregation pipelines for analytics
- Limit fields returned in listings

### 5. User Experience

- Real-time updates via Socket.io
- Loading states for async operations
- Clear error messages
- Confirmation dialogs for important actions
- Transaction history with filters
- Estimated trade completion times

## Testing Patterns

```javascript
// test/purchase.test.js
describe('Purchase Flow', () => {
  it('should complete purchase successfully', async () => {
    const buyer = await User.create({ /* ... */ });
    const seller = await User.create({ /* ... */ });
    const listing = await MarketListing.create({ /* ... */ });

    const response = await request(app)
      .post(`/api/marketplace/listings/${listing._id}/purchase`)
      .set('Authorization', `Bearer ${buyer.token}`)
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.listing.status).toBe('pending_trade');

    const updatedBuyer = await User.findById(buyer._id);
    expect(updatedBuyer.wallet.pendingBalance).toBeGreaterThan(0);
  });

  it('should prevent purchase with insufficient balance', async () => {
    // Test implementation
  });
});
```

---

**Last Updated:** November 2025
