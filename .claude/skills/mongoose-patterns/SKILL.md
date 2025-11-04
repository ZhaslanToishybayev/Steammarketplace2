---
name: mongoose-patterns
description: Comprehensive Mongoose ODM patterns for MongoDB including schema design, queries, indexing, aggregation, transactions, and performance optimization.
---

# Mongoose ODM Patterns

## Purpose

Best practices for using Mongoose with MongoDB in Node.js applications, covering schema design, query optimization, indexing strategies, aggregation pipelines, and transaction handling.

## When to Use This Skill

Automatically activates when working with:
- Mongoose models and schemas
- MongoDB database operations
- Query optimization
- Index creation and management
- Aggregation pipelines
- Database transactions
- Data validation
- Hooks (pre/post middleware)
- Population and virtual fields
- Performance optimization

## Schema Design Patterns

### 1. Basic Schema Structure

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Basic info
  steamId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{17}$/.test(v); // SteamID64 format
      },
      message: 'Invalid SteamID64 format'
    }
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid avatar URL'
    }
  },

  // Relationships
  tradeUrl: {
    type: String,
    default: null,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return v.includes('steamcommunity.com/tradeoffer/new/');
      },
      message: 'Invalid trade URL'
    }
  },

  // Embedded documents
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: 0
    },
    pendingBalance: {
      type: Number,
      default: 0,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP']
    }
  },

  // Arrays of subdocuments
  steamInventory: [{
    assetId: {
      type: String,
      required: true
    },
    classId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    tradable: {
      type: Boolean,
      default: true
    },
    marketable: {
      type: Boolean,
      default: true
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  }],

  // Object for flexible data
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      browser: { type: Boolean, default: true }
    },
    privacy: {
      showInventory: { type: Boolean, default: true },
      showTrades: { type: Boolean, default: false }
    }
  },

  // Metadata
  lastLogin: Date,
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

module.exports = mongoose.model('User', userSchema);
```

### 2. Advanced Schema Patterns

```javascript
// Complex schema with mixed types
const marketListingSchema = new mongoose.Schema({
  // Using Mixed type for flexible data
  item: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Enum with custom values
  status: {
    type: String,
    enum: {
      values: ['active', 'pending', 'sold', 'cancelled', 'expired'],
      message: '{VALUE} is not a valid status'
    },
    default: 'active'
  },

  // Custom getter/setter
  price: {
    type: Number,
    required: true,
    min: 0.01,
    get: function(v) {
      return Math.round(v * 100) / 100; // Round to 2 decimal places
    },
    set: function(v) {
      return Math.round(parseFloat(v) * 100) / 100;
    }
  },

  // Date with validation
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    validate: {
      validator: function(v) {
        return v > new Date();
      },
      message: 'Expiration date must be in the future'
    }
  }
});
```

## Indexing Strategies

### 1. Single Field Indexes

```javascript
// Basic single field index
userSchema.index({ steamId: 1 });

// Index with options
marketListingSchema.index({ createdAt: -1 }, { unique: false });

// Index with custom name
userSchema.index({ username: 1 }, { name: 'username_index' });
```

### 2. Compound Indexes

```javascript
// Compound index for common queries
marketListingSchema.index({
  status: 1,
  price: 1,
  createdAt: -1
});

// Compound index with custom order
marketListingSchema.index({
  'item.rarity': 1,
  'item.exterior': 1,
  price: 1
});

// Optimize queries with sort
marketListingSchema.index({
  status: 1,
  createdAt: -1
});
```

### 3. Text Indexes

```javascript
// Text index for search
marketListingSchema.index({
  'item.name': 'text',
  'item.marketName': 'text',
  'item.skin': 'text',
  description: 'text'
}, {
  weights: {
    'item.marketName': 10,
    'item.name': 5,
    'item.skin': 3,
    description: 1
  },
  name: 'search_index'
});

// Usage
router.get('/search', async (req, res) => {
  const { q } = req.query;

  const listings = await MarketListing.find(
    { $text: { $search: q } },
    { score: { $meta: 'textScore' } }
  )
  .sort({ score: { $meta: 'textScore' } })
  .limit(20);
});
```

### 4. Geospatial Indexes

```javascript
// Example: User locations (if needed)
userSchema.index({
  location: '2dsphere'
});
```

### 5. Partial Indexes

```javascript
// Index only active listings
marketListingSchema.index(
  { createdAt: -1 },
  {
    partialFilterExpression: { status: 'active' }
  }
);

// Index only items with float values
marketListingSchema.index(
  { 'item.float': 1 },
  {
    partialFilterExpression: { 'item.float': { $exists: true } }
  }
);
```

## Query Optimization Patterns

### 1. Basic Query Methods

```javascript
// Find by ID
const user = await User.findById(userId);

// Find one
const listing = await MarketListing.findOne({
  status: 'active',
  price: { $lte: 100 }
});

// Find multiple with lean
const listings = await MarketListing.find({ status: 'active' })
  .lean()
  .limit(20);

// Select specific fields
const users = await User.find({}, 'username avatar wallet.balance')
  .lean();
```

### 2. Query Chaining

```javascript
// Build query dynamically
function getActiveListings(filters) {
  let query = MarketListing.find({ status: 'active' });

  if (filters.minPrice) {
    query = query.where('price').gte(filters.minPrice);
  }

  if (filters.maxPrice) {
    query = query.where('price').lte(filters.maxPrice);
  }

  if (filters.rarity) {
    query = query.where('item.rarity').equals(filters.rarity);
  }

  return query
    .populate('seller', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
}
```

### 3. Efficient Pagination

```javascript
// Bad - slow for large offsets
const listings = await MarketListing.find({ status: 'active' })
  .skip(1000)
  .limit(20);

// Good - use cursor or last seen ID
const listings = await MarketListing.find({
  status: 'active',
  createdAt: { $lt: lastSeenDate } // For infinite scroll
})
.sort({ createdAt: -1 })
.limit(20);
```

### 4. Aggregation Pipelines

```javascript
// Get listing statistics
router.get('/stats', async (req, res) => {
  const stats = await MarketListing.aggregate([
    { $match: { status: 'active' } },
    {
      $group: {
        _id: '$item.rarity',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json(stats);
});

// User transaction stats
router.get('/user/:id/transactions', async (req, res) => {
  const stats = await Transaction.aggregate([
    { $match: { user: mongoose.Types.ObjectId(req.params.id) } },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    }
  ]);

  res.json(stats);
});
```

### 5. Lookup (Join) Patterns

```javascript
// Populate seller info
const listings = await MarketListing.find({ status: 'active' })
  .populate('seller', 'username displayName avatar reputation')
  .lean();

// Multiple populations
const transactions = await Transaction.find({})
  .populate('user', 'username avatar')
  .populate('listing', 'item marketName price')
  .lean();

// Manual lookup with aggregation
const sales = await MarketListing.aggregate([
  { $match: { status: 'sold' } },
  {
    $lookup: {
      from: 'users',
      localField: 'seller',
      foreignField: '_id',
      as: 'sellerInfo'
    }
  },
  { $unwind: '$sellerInfo' },
  {
    $project: {
      price: 1,
      'sellerInfo.username': 1,
      'sellerInfo.displayName': 1
    }
  }
]);
```

## Virtual Fields

### 1. Basic Virtuals

```javascript
// Computed field
userSchema.virtual('reputationPercentage').get(function() {
  if (this.reputation.total === 0) return 100;
  return Math.round((this.reputation.positive / this.reputation.total) * 100);
});

// Formatted price
marketListingSchema.virtual('formattedPrice').get(function() {
  return `$${this.price.toFixed(2)}`;
});

// Full name from parts
marketListingSchema.virtual('fullName').get(function() {
  const parts = [this.item.weapon, this.item.skin];
  return parts.filter(Boolean).join(' | ');
});
```

### 2. Virtual Setters

```javascript
// Virtual setter for price with validation
marketListingSchema.virtual('priceInput').set(function(price) {
  if (price < 0.01) {
    throw new Error('Price must be at least $0.01');
  }
  this.price = Math.round(price * 100) / 100;
});
```

### 3. Conditional Virtuals

```javascript
marketListingSchema.virtual('isRare').get(function() {
  const rareRarities = ['Covert', 'Contraband'];
  return rareRarities.includes(this.item.rarity);
});

marketListingSchema.virtual('canTrade').get(function() {
  return this.status === 'active' && this.item.tradable;
});
```

## Middleware (Hooks)

### 1. Pre Validation

```javascript
// Format data before validation
marketListingSchema.pre('validate', function(next) {
  if (this.item.name) {
    this.item.name = this.item.name.trim();
  }
  if (this.item.marketName) {
    this.item.marketName = this.item.marketName.trim();
  }
  next();
});
```

### 2. Pre Save

```javascript
// Hash password (if using password auth)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update timestamp
marketListingSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('price')) {
    this.lastModified = new Date();
  }
  next();
});

// Validate referenced documents
marketListingSchema.pre('save', async function(next) {
  if (this.isNew) {
    const user = await User.findById(this.seller);
    if (!user) {
      throw new Error('Invalid seller reference');
    }
  }
  next();
});
```

### 3. Post Save

```javascript
// Send notifications
userSchema.post('save', function(doc, next) {
  if (doc.isNew) {
    logger.info(`New user created: ${doc.username}`);
    // Send welcome email, etc.
  }
  next();
});

// Update counters
marketListingSchema.post('save', function(doc, next) {
  if (doc.isNew) {
    User.findByIdAndUpdate(
      doc.seller,
      { $inc: { 'stats.activeListings': 1 } },
      { new: false }
    ).exec();
  }
  next();
});
```

### 4. Pre Remove

```javascript
// Clean up related documents
marketListingSchema.pre('remove', async function(next) {
  await Transaction.deleteMany({ listing: this._id });
  next();
});

// Notify watchers
userSchema.pre('remove', async function(next) {
  await MarketListing.updateMany(
    { seller: this._id },
    { $set: { status: 'cancelled' } }
  );
  next();
});
```

## Transactions

### 1. Basic Transaction

```javascript
// Complete purchase flow
async function purchaseItem(listingId, buyerId) {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Update listing
    const listing = await MarketListing.findOneAndUpdate(
      { _id: listingId, status: 'active' },
      { $set: { status: 'pending_trade', buyer: buyerId } },
      { new: true, session }
    );

    if (!listing) {
      throw new Error('Listing not available');
    }

    // Update user balances
    const buyer = await User.findByIdAndUpdate(
      buyerId,
      {
        $inc: {
          'wallet.balance': -listing.price,
          'wallet.pendingBalance': listing.price
        }
      },
      { new: true, session }
    );

    if (buyer.wallet.balance < 0) {
      throw new Error('Insufficient balance');
    }

    // Create transaction
    const transaction = await Transaction.create([{
      user: buyerId,
      type: 'purchase',
      listing: listingId,
      amount: -listing.price,
      status: 'completed'
    }], { session });

    await session.commitTransaction();

    return { listing, transaction: transaction[0] };

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

### 2. Optimistic Locking

```javascript
// Add version field to schema
const marketListingSchema = new mongoose.Schema({
  // ... fields
  version: {
    type: Number,
    default: 0
  }
});

// Pre save middleware to increment version
marketListingSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.version += 1;
  }
  next();
});

// Update with version check
async function updateListing(listingId, updateData, expectedVersion) {
  const result = await MarketListing.findOneAndUpdate(
    { _id: listingId, version: expectedVersion },
    { $set: updateData, $inc: { version: 1 } },
    { new: true }
  );

  if (!result) {
    throw new Error('Document was modified by another process');
  }

  return result;
}
```

## Performance Optimization

### 1. Lean Queries

```javascript
// For read-only data, use lean()
const listings = await MarketListing.find({ status: 'active' })
  .lean()
  .limit(20);

// Not with lean() when you need to modify documents
const listing = await MarketListing.findById(id); // Modifiable
```

### 2. Batch Operations

```javascript
// Bulk insert
const listings = await MarketListing.insertMany(listData, {
  ordered: false, // Continue on error
  rawResult: false
});

// Bulk update
const result = await MarketListing.bulkWrite([
  {
    updateOne: {
      filter: { status: 'active' },
      update: { $inc: { views: 1 } }
    }
  }
]);

// Batch delete
const result = await MarketListing.deleteMany({
  status: 'expired',
  expiresAt: { $lt: new Date() }
});
```

### 3. Projection (Field Selection)

```javascript
// Include only needed fields
const listings = await MarketListing.find({}, 'item.name price status seller')
  .lean();

// Exclude large fields
const users = await User.find({}, '-steamInventory -settings.private')
  .lean();
```

### 4. Caching Patterns

```javascript
// Using Redis for caching
const Redis = require('redis');
const redis = Redis.createClient();

async function getListingWithCache(listingId) {
  const cacheKey = `listing:${listingId}`;
  const cached = await redis.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const listing = await MarketListing.findById(listingId)
    .populate('seller', 'username avatar')
    .lean();

  await redis.setex(cacheKey, 300, JSON.stringify(listing)); // 5 min cache

  return listing;
}
```

### 5. Aggregation Optimization

```javascript
// Add $match early to reduce pipeline size
const stats = await MarketListing.aggregate([
  { $match: { status: 'active' } }, // Filter first
  { $group: { _id: '$item.rarity', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);

// Use indexes
const listings = await MarketListing.aggregate([
  { $match: { status: 'active', price: { $lte: 100 } } }, // Uses index
  { $sort: { price: 1 } }, // Uses index
  { $limit: 20 }
]);
```

## Validation Patterns

### 1. Built-in Validators

```javascript
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format']
  },
  age: {
    type: Number,
    min: 13,
    max: 120
  }
});
```

### 2. Custom Validators

```javascript
// Async validator
userSchema.path('steamId').validate({
  validator: async function(value) {
    const count = await mongoose.model('User').countDocuments({ steamId: value });
    return count === 0;
  },
  message: 'Steam ID already exists'
});

// Sync validator
marketListingSchema.path('price').validate({
  validator: function(v) {
    // Custom validation logic
    return v >= 0.01 && v <= 10000;
  },
  message: 'Price must be between $0.01 and $10,000'
});
```

### 3. Schema-Level Validation

```javascript
marketListingSchema.pre('validate', function(next) {
  if (this.item.stattrak && this.item.souvenir) {
    next(new Error('Item cannot be both StatTrak and Souvenir'));
  }
  next();
});
```

## Data Migration Patterns

### 1. Update All Documents

```javascript
// Migrate data
async function migrateListings() {
  const result = await MarketListing.updateMany(
    {},
    [
      {
        $set: {
          status: {
            $ifNull: ['$status', 'active']
          }
        }
      }
    ]
  );

  console.log(`Updated ${result.modifiedCount} listings`);
}
```

### 2. Add New Field with Default

```javascript
userSchema.add({
  newField: {
    type: String,
    default: 'default_value'
  }
});

// Backfill existing documents
async function backfillUsers() {
  await User.updateMany(
    { newField: { $exists: false } },
    { $set: { newField: 'default_value' } }
  );
}
```

## Error Handling Patterns

### 1. Mongoose Errors

```javascript
// Handle validation errors
try {
  const user = new User(invalidData);
  await user.save();
} catch (error) {
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({ errors });
  }
  throw error;
}

// Handle duplicate key error
try {
  await User.create(userData);
} catch (error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(409).json({ error: `${field} already exists` });
  }
  throw error;
}
```

### 2. Custom Error Classes

```javascript
class NotFoundError extends Error {
  constructor(model, id) {
    super(`${model} with id ${id} not found`);
    this.name = 'NotFoundError';
    this.statusCode = 404;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

// Usage
if (!listing) {
  throw new NotFoundError('MarketListing', listingId);
}
```

## Best Practices Summary

1. **Schema Design**
   - Use appropriate data types
   - Add indexes for frequently queried fields
   - Use virtuals for computed values
   - Implement validation at schema level

2. **Query Optimization**
   - Use `.lean()` for read-only queries
   - Select only needed fields
   - Use pagination instead of large skip() values
   - Add proper indexes

3. **Transactions**
   - Always use transactions for multi-document operations
   - Handle errors with try-catch
   - Always call `endSession()` in finally block

4. **Performance**
   - Use aggregation for analytics
   - Cache frequently accessed data
   - Use batch operations for bulk updates
   - Monitor query performance with explain()

5. **Error Handling**
   - Handle Mongoose-specific errors
   - Create custom error classes
   - Log errors with context
   - Return consistent error responses

6. **Middleware**
   - Use pre-save hooks for data transformation
   - Use post-save hooks for side effects
   - Implement soft deletes with flags
   - Use pre-remove hooks for cleanup

---

**Last Updated:** November 2025
