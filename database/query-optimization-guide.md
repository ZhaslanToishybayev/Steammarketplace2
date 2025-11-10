# Database Query Optimization Guide

## 📊 Database Performance Optimization

This guide covers MongoDB query optimization, indexing strategies, and performance best practices.

---

## 🚀 Quick Wins

### 1. Use Explains
Always use `.explain()` to analyze query performance:

```javascript
// Bad - not knowing if index is used
const listings = await MarketListing.find({ status: 'active' });

// Good - checking index usage
const listings = await MarketListing
  .find({ status: 'active' })
  .explain('executionStats');

// Check executionStats.executionStages.inputStage.indexName
// Should show the index used, not 'COLLECTION_SCAN'
```

### 2. Check Index Usage
```javascript
// Check if index is being used
const result = await collection.find(query).explain('executionStats');

// Look for:
// - 'indexName' should be the expected index, not 'COLLECTION_SCAN'
// - 'totalDocsExamined' should be close to 'totalDocsReturned'
// - 'executionTimeMillis' should be < 100ms
```

---

## 📈 Indexing Strategy

### User Model Indexes

```javascript
// Primary indexes
{ steamId: 1 } - unique
{ username: 1 } - unique

// Query optimization
{ isBanned: 1, 'reputation.positive': -1 }
// Used for: Get top reputation users who are not banned

{ 'userInventory.lastUpdated': -1 }
// Used for: Get recently updated inventory
```

### MarketListing Model Indexes

```javascript
// Primary indexes
{ 'item.assetId: 1 } - unique
{ seller: 1 }

// Status and sorting
{ status: 1, price: 1 }
// Used for: Get active listings sorted by price

{ status: 1, 'item.classId': 1, price: 1 }
// Used for: Get active listings for specific item, sorted by price

{ 'item.marketName': 'text' }
// Used for: Text search
```

### TradeOffer Model Indexes

```javascript
// User queries
{ steamId: 1, status: 1, createdAt: -1 }
// Used for: Get user's trade history

// Bot queries
{ botId: 1, status: 1, createdAt: -1 }
// Used for: Get bot's trade history

// Profit queries
{ profit: -1 }
// Used for: Get most profitable trades
```

---

## 🔍 Common Query Patterns

### 1. Pagination

**Bad (Slow)**
```javascript
const listings = await MarketListing
  .find({ status: 'active' })
  .skip(1000)
  .limit(20);
// O(n) skip operation
```

**Good (Fast)**
```javascript
// Use last document for next page
const lastListing = await MarketListing.findOne({});
const listings = await MarketListing
  .find({
    status: 'active',
    _id: { $gt: lastListing._id }
  })
  .limit(20);
// O(log n) using index
```

### 2. Search

**Bad (Inefficient)**
```javascript
// Case-insensitive regex without index
const listings = await MarketListing.find({
  'item.marketName': { $regex: 'AK-47', $options: 'i' }
});
// Can't use text index
```

**Good (Efficient)**
```javascript
// Use text search
const listings = await MarketListing.find({
  $text: { $search: 'AK-47' }
});
// Uses text index
```

### 3. Aggregation

**Bad (Inefficient)**
```javascript
// Multiple stages without optimization
const stats = await MarketListing.aggregate([
  { $match: { status: 'active' } },
  { $group: { _id: '$item.rarity', count: { $sum: 1 } } },
  { $sort: { count: -1 } }
]);
```

**Good (Optimized)**
```javascript
// Use indexes and limit stages
const stats = await MarketListing.aggregate([
  { $match: { status: 'active' } }, // Uses index
  { $group: { _id: '$item.rarity', count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 } // Limit intermediate results
]);
```

---

## 📊 Aggregation Pipeline Optimization

### 1. Use $match Early

**Optimized Order:**
```javascript
const pipeline = [
  { $match: { status: 'active' } }, // Filter first
  { $match: { price: { $gte: 10, $lte: 100 } } }, // Then more filters
  { $group: { _id: '$item.rarity', avgPrice: { $avg: '$price' } } },
  { $sort: { avgPrice: -1 } }
];
```

### 2. Use $sort with Index

```javascript
// Ensure $sort uses an index
const pipeline = [
  { $match: { status: 'active' } },
  { $sort: { price: 1 } }, // Must come after $match
  { $limit: 20 }
];
```

### 3. Use $project to Reduce Fields

```javascript
const pipeline = [
  { $match: { status: 'active' } },
  { $project: { // Only include needed fields
    itemName: '$item.marketName',
    price: 1,
    seller: 1
  }},
  { $sort: { price: 1 } }
];
```

### 4. Use $lookup Efficiently

```javascript
// Bad - without index
const pipeline = [
  { $lookup: {
    from: 'users',
    localField: 'seller',
    foreignField: '_id',
    as: 'sellerInfo'
  }}
];

// Good - ensure index on foreign field
// In users collection: { _id: 1 }

const pipeline = [
  { $match: { status: 'active' } },
  { $lookup: {
    from: 'users',
    localField: 'seller',
    foreignField: '_id',
    as: 'sellerInfo'
  }},
  { $unwind: '$sellerInfo' },
  { $project: {
    itemName: '$item.marketName',
    price: 1,
    sellerName: '$sellerInfo.steamName'
  }}
];
```

---

## ⚡ Performance Monitoring

### 1. Enable Profiler

```javascript
// Enable profiling for operations > 100ms
db.setProfilingLevel(2, { slowms: 100 });

// Check profiler data
db.system.profile.find().sort({ ts: -1 }).limit(10);
```

### 2. Use Database Commands

```javascript
// Get collection statistics
db.collection.stats();

// Get index statistics
db.collection.getIndexes();

// Get index sizes
db.collection.stats().indexSizes;
```

### 3. Track Query Performance

```javascript
const start = Date.now();
const result = await MarketListing.find({ status: 'active' });
const duration = Date.now() - start;

console.log(`Query took ${duration}ms`);
console.log(`Found ${result.length} documents`);
```

---

## 🎯 Optimization Checklist

### Before Writing Queries
- [ ] Check if index exists for the query
- [ ] Use `.explain()` to verify index usage
- [ ] Test with realistic data volume
- [ ] Use appropriate query operators (prefer $in over $or)

### Query Structure
- [ ] Put $match stages first in aggregation
- [ ] Use $sort with indexed fields
- [ ] Use $project to reduce document size
- [ ] Avoid $regex without index (use $text instead)
- [ ] Use lean() for read-only queries

### Indexes
- [ ] Create compound indexes for multi-field queries
- [ ] Put high-cardinality fields first in compound indexes
- [ ] Use sparse indexes for optional fields
- [ ] Use text indexes for search
- [ ] Drop unused indexes

### Pagination
- [ ] Use cursor-based pagination for large datasets
- [ ] Avoid skip() with large values
- [ ] Use range queries with _id or indexed fields

### Aggregation
- [ ] Use $match to filter early
- [ ] Use $sort with indexed fields
- [ ] Use $limit to limit intermediate results
- [ ] Use $project to reduce field count
- [ ] Consider $facet for multiple aggregations

---

## 📝 Common Mistakes

### 1. Missing Indexes
```javascript
// Bad - scans entire collection
db.users.find({ createdAt: { $gte: new Date('2024-01-01') } });

// Good - uses index
db.users.createIndex({ createdAt: 1 });
db.users.find({ createdAt: { $gte: new Date('2024-01-01') } });
```

### 2. Inefficient $or
```javascript
// Bad
db.listings.find({ $or: [{ status: 'active' }, { status: 'pending' }] });

// Good
db.listings.find({ status: { $in: ['active', 'pending'] } });
```

### 3. Not Using Lean
```javascript
// Bad - returns Mongoose documents
const listings = await MarketListing.find({ status: 'active' });

// Good - returns plain objects
const listings = await MarketListing.find({ status: 'active' }).lean();
```

### 4. Large $skip
```javascript
// Bad - O(n) operation
const listings = await MarketListing
  .find({ status: 'active' })
  .skip(10000)
  .limit(20);

// Good - O(log n) operation
const lastId = await MarketListing.findOne({}, {}, { sort: { _id: -1 } });
const listings = await MarketListing
  .find({
    status: 'active',
    _id: { $lt: lastId._id }
  })
  .limit(20);
```

---

## 🏆 Best Practices

1. **Always use indexes** for frequent queries
2. **Monitor slow queries** with profiler
3. **Use explain()** to verify index usage
4. **Prefer compound indexes** for multi-field queries
5. **Use text indexes** for search
6. **Use lean()** for read-only queries
7. **Avoid large skip()** operations
8. **Use $match early** in aggregations
9. **Drop unused indexes** to save space
10. **Test with production data** volumes

---

## 📊 Performance Targets

- **Simple queries**: < 50ms
- **Complex queries**: < 200ms
- **Aggregations**: < 500ms
- **Index hit ratio**: > 95%
- **Collection scan ratio**: < 5%

---

## 🔧 Tools

1. **MongoDB Compass** - Visual query analyzer
2. **explain()** - Query plan analysis
3. **Profiler** - Slow query detection
4. **db.collection.stats()** - Collection statistics
5. **db.collection.getIndexes()** - Index listing

---

For more information, see the official MongoDB documentation:
- [Query Optimization](https://docs.mongodb.com/manual/tutorial/optimize-query-performance/)
- [Aggregation Pipeline Optimization](https://docs.mongodb.com/manual/core/aggregation-pipeline-optimization/)
