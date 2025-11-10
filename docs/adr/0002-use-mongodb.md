# ADR-0002: Use MongoDB with Mongoose ODM

## Status
**Accepted** - 2024-01-01

## Context
We need a database to store marketplace data including users, listings, trades, and payments. The data structure for marketplace items is flexible and may evolve over time. We need to support:
- User profiles and Steam integration
- Market listings with variable item properties
- Trade offer tracking
- Payment history
- Complex queries for marketplace browsing

## Decision
We will use **MongoDB** as our primary database with **Mongoose ODM** for object modeling.

### Why MongoDB?
- **Schema Flexibility**: Item data varies significantly (skins, knives, etc.)
- **Document Structure**: Listings and trades are naturally document-shaped
- **Scaling**: Can shard by user ID for horizontal scaling
- **JSON-native**: JavaScript objects serialize/deserialize naturally
- **Atomic Updates**: Update operators for concurrent operations (e.g., listing updates)

### Why Mongoose ODM?
- **Schema Validation**: Document structure validation at application level
- **Type Casting**: Automatic type conversion (String → Number, etc.)
- **Middleware**: Pre/post hooks for business logic
- **Population**: JOIN-like functionality with refs
- **Plugins**: Extensible for common patterns (timestamps, etc.)

## Implementation

### Example: User Schema

```javascript
// models/User.js
const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  balance: { type: Number, default: 0 },
  pendingBalance: { type: Number, default: 0 },
  currency: { type: String, default: 'USD' }
});

const userSchema = new mongoose.Schema({
  steamId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },
  avatar: {
    small: String,
    medium: String,
    large: String
  },
  wallet: walletSchema,
  reputation: {
    positive: { type: Number, default: 0 },
    negative: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  settings: {
    twoFactorEnabled: { type: Boolean, default: false },
    tradeOffersEnabled: { type: Boolean, default: true },
    notifications: {
      email: { type: Boolean, default: true },
      slack: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Index for performance
userSchema.index({ steamId: 1 });
userSchema.index({ 'wallet.balance': 1 });

module.exports = mongoose.model('User', userSchema);
```

### Example: Market Listing Schema

```javascript
// models/Listing.js
const listingSchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  itemHashName: { type: String, required: true },
  itemImage: { type: String, required: true },
  game: { type: String, enum: ['csgo', 'cs2'], required: true },
  price: {
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, default: 'USD' }
  },
  suggestedPrice: { type: Number },
  status: {
    type: String,
    enum: ['active', 'pending_trade', 'sold', 'cancelled', 'expired'],
    default: 'active'
  },
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: { type: Date, required: true },
  steamAssetId: { type: String }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
listingSchema.index({ status: 1, game: 1 });
listingSchema.index({ 'price.amount': 1, status: 1 });
listingSchema.index({ seller: 1, status: 1 });

// TTL index for automatic expiration
listingSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Listing', listingSchema);
```

### Repository Implementation

```javascript
// repositories/MongoListingRepository.js
const Listing = require('../models/Listing');
const IListingRepository = require('./IListingRepository');

class MongoListingRepository extends IListingRepository {
  async findActiveByPriceRange(minPrice, maxPrice, game) {
    return await Listing.find({
      status: 'active',
      game,
      'price.amount': { $gte: minPrice, $lte: maxPrice }
    })
    .populate('seller', 'username steamId reputation')
    .sort({ 'price.amount': 1 })
    .limit(50);
  }

  async findBySeller(sellerId) {
    return await Listing.find({ seller: sellerId })
      .sort({ createdAt: -1 });
  }

  async create(listingData) {
    const listing = new Listing(listingData);
    return await listing.save();
  }

  async updateStatus(id, status) {
    return await Listing.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
  }
}
```

## Consequences

### Positive
- **Performance**: Optimized queries with proper indexing
- **Flexibility**: Easy to add new fields to documents
- **Atomicity**: MongoDB update operators for concurrent safety
- **Transactions**: ACID transactions for multi-document operations
- **JSON API**: Natural JavaScript integration
- **Rich Queries**: Aggregation pipeline for complex analytics
- **TTL Indexes**: Automatic data expiration
- **Geospatial**: Support for location-based queries (if needed)

### Negative
- **No SQL**: Developers familiar with SQL need to learn MongoDB query syntax
- **No JOINs**: Must use population or separate queries
- **Consistency**: Eventual consistency in sharded setups
- **Data Duplication**: Some data may be duplicated for query performance
- **Learning Curve**: Understanding when to embed vs reference

## Indexes Strategy

### Critical Indexes
```javascript
// Users
{ steamId: 1 }                    // Unique lookups
{ 'wallet.balance': 1 }           // User sorting by balance

// Listings
{ status: 1, game: 1 }            // Browse by game
{ 'price.amount': 1, status: 1 }  // Price filtering
{ seller: 1, status: 1 }          // User's listings
{ expiresAt: 1 }                  // Auto-delete expired
{ itemHashName: 1, status: 1 }    // Item search

// Trades
{ status: 1, createdAt: -1 }      // Trade feed
{ buyer: 1 } or { seller: 1 }     // User's trades
{ offerId: 1 }                    // Steam integration
```

### Query Patterns
1. **Browse Listings**: `find({ status: 'active', game: 'cs2' }).sort({ price.amount: 1 })`
2. **Search**: `find({ itemName: /AK-47/i, status: 'active' })`
3. **User Activity**: `find({ seller: userId }).sort({ createdAt: -1 })`
4. **Price History**: `aggregate([{ $group: { avgPrice: { $avg: '$price.amount' } } }])`

## Data Modeling

### Embed vs Reference Decision

**Embed When:**
- One-to-few relationship
- Data accessed together
- No need to query referenced entity alone
- **Example**: User wallet history in User document

**Reference When:**
- Many-to-many relationship
- Large arrays (limit 16MB per document)
- Need to query referenced entity independently
- **Example**: User's listings (User → Listing)

## Backup & Recovery

### Strategy
- **Continuous Backups**: MongoDB Atlas or self-hosted replica set
- **Point-in-Time**: Oplog for PITR
- **Daily Snapshots**: Full backups at 2 AM UTC
- **Cross-Region**: Backup to different region for disaster recovery

### Validation
```javascript
// Model validation middleware
listingSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'active') {
    // Check if user has enough reputation
    const user = await User.findById(this.seller);
    if (user.reputation.score < 90) {
      throw new Error('User reputation too low to create listings');
    }
  }
  next();
});
```

## Migration Plan

### Phase 1: Setup
- [x] Install MongoDB (local development)
- [x] Configure Mongoose schemas
- [x] Create indexes
- [ ] Setup replica set (staging)
- [ ] Setup replica set (production)

### Phase 2: Data Migration
- [ ] Export existing data (if any)
- [ ] Transform to new schema
- [ ] Import to MongoDB
- [ ] Validate data integrity

### Phase 3: Application Update
- [ ] Update repositories to use MongoDB
- [ ] Update tests for new data structure
- [ ] Deploy to staging
- [ ] Performance testing
- [ ] Deploy to production

## Alternatives Considered

### Option 1: PostgreSQL
- **Pros**: ACID compliance, complex queries, mature ecosystem
- **Cons**: Rigid schema, JSONB less ergonomic than native MongoDB
- **Rejected because**: Item flexibility better with document model

### Option 2: MySQL
- **Pros**: Widely used, stable
- **Cons**: JSON support not as mature, schema migration pain
- **Rejected because**: Less flexible for evolving data structures

### Option 3: NoSQL (Cassandra, DynamoDB)
- **Pros**: Excellent write scaling
- **Cons**: Complex query model, limited queries
- **Rejected because**: We need rich queries, not just key-value access

### Option 4: SQLite
- **Pros**: Simple, file-based
- **Cons**: No concurrent writes, limited scalability
- **Rejected because**: Not suitable for production marketplace

## Related Decisions
- [ADR-0001: Use Clean Architecture](0001-use-clean-architecture.md)
- [ADR-0004: Implement Repository Pattern](0004-repository-pattern.md)
- [ADR-0005: Add Redis Caching](0005-redis-caching.md)

## References
- MongoDB Official Documentation: https://docs.mongodb.com/
- Mongoose Documentation: https://mongoosejs.com/docs/guide.html
- MongoDB Schema Design Best Practices
- MongoDB Index Types and Use Cases
