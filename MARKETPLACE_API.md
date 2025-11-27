# Marketplace API Documentation

## Overview
The Marketplace module provides comprehensive Steam item trading functionality including listings, auctions, offers, and price analytics.

## Base URL
```
http://localhost:3002/marketplace
```

## Authentication
All endpoints except GET endpoints require Steam authentication via session cookies.

## Endpoints

### 1. Create Listing
**POST** `/marketplace/listings`

Create a new marketplace listing for an item.

**Request Body:**
```json
{
  "itemId": "string",           // Optional: Inventory item ID
  "itemName": "AK-47 | Redline",
  "itemDescription": "Factory New AK-47",
  "itemClassId": "123456",
  "itemInstanceId": "789",
  "itemType": "Rifle",
  "itemRarity": "Covert",
  "itemQuality": "Normal",
  "quantity": 1,
  "price": 250.50,
  "currency": "USD",
  "type": "fixed_price",        // "fixed_price", "auction", "offer"
  "startingPrice": 200.00,      // For auctions
  "reservePrice": 225.00,       // For auctions
  "buyoutPrice": 275.00,        // For auctions
  "description": "Great condition",
  "tags": ["rifle", "ak-47"],
  "condition": "Factory New",
  "wearRating": 0.05,
  "autoRenew": false,
  "instantSale": true,
  "allowOffers": true,
  "minOffer": 150.00,
  "maxOffer": 500.00,
  "media": [
    {
      "type": "image",
      "url": "https://example.com/item.jpg",
      "thumbnail": "https://example.com/thumb.jpg",
      "order": 1
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Listing created successfully",
  "data": {
    "id": "uuid",
    "itemName": "AK-47 | Redline",
    "price": 250.50,
    "type": "fixed_price",
    "status": "active",
    "platformFee": 12.53,
    "sellerReceive": 237.97,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Listings with Filters
**GET** `/marketplace/listings`

Get marketplace listings with optional filters.

**Query Parameters:**
- `type`: Listing type (fixed_price, auction, offer)
- `status`: Listing status (active, sold, cancelled, expired)
- `itemType`: Item type filter
- `itemRarity`: Item rarity filter
- `currency`: Currency filter (USD, EUR, RUB)
- `minPrice`: Minimum price
- `maxPrice`: Maximum price
- `sellerId`: Seller user ID
- `featured`: Boolean
- `allowOffers`: Boolean
- `sortBy`: Sort field (price, createdAt, updatedAt, itemType, itemRarity)
- `sortOrder`: Sort order (ASC, DESC)
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": [
      {
        "id": "uuid",
        "itemName": "AK-47 | Redline",
        "price": 250.50,
        "type": "fixed_price",
        "status": "active",
        "itemType": "Rifle",
        "itemRarity": "Covert",
        "quantity": 1,
        "featured": false,
        "viewCount": 150,
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 1,
    "analytics": {
      "totalListings": 1000,
      "totalValue": 250000.00,
      "byType": {
        "fixed_price": 700,
        "auction": 200,
        "offer": 100
      },
      "byStatus": {
        "active": 900,
        "sold": 80,
        "cancelled": 20
      }
    }
  }
}
```

### 3. Get Listing by ID
**GET** `/marketplace/listings/{listingId}`

Get a specific listing by its ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "itemName": "AK-47 | Redline",
    "itemDescription": "Factory New AK-47",
    "price": 250.50,
    "type": "fixed_price",
    "status": "active",
    "sellerId": "seller-uuid",
    "platformFee": 12.53,
    "sellerReceive": 237.97,
    "viewCount": 150,
    "favoriteCount": 25,
    "tags": ["rifle", "ak-47"],
    "media": [...],
    "history": [...],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4. Update Listing
**PUT** `/marketplace/listings/{listingId}`

Update an existing listing (seller only).

**Request Body:**
```json
{
  "itemDescription": "Updated description",
  "price": 275.00,
  "description": "Updated listing details",
  "tags": ["rifle", "ak-47", "updated"],
  "featured": true,
  "condition": "Minimal Wear",
  "wearRating": 0.08,
  "autoRenew": true,
  "instantSale": false,
  "allowOffers": false,
  "minOffer": null,
  "maxOffer": null
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Listing updated successfully",
  "data": { updated_listing }
}
```

### 5. Buy Listing (Fixed Price)
**POST** `/marketplace/listings/{listingId}/buy`

Purchase a fixed-price listing.

**Request Body:**
```json
{
  "listingId": "uuid",
  "offerPrice": 250.50  // Optional: for offer-based purchases
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Item purchased successfully",
  "data": { purchased_listing }
}
```

### 6. Place Bid (Auction)
**POST** `/marketplace/listings/{listingId}/bid`

Place a bid on an auction listing.

**Request Body:**
```json
{
  "bidAmount": 225.00
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Bid placed successfully",
  "data": { updated_listing_with_new_bid }
}
```

### 7. Cancel Listing
**DELETE** `/marketplace/listings/{listingId}`

Cancel an active listing (seller only).

**Request Body:**
```json
{
  "reason": "No longer want to sell"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Listing cancelled successfully",
  "data": { cancelled_listing }
}
```

### 8. Get User's Listings
**GET** `/marketplace/my-listings`

Get current user's listings.

**Query Parameters:**
- `status`: Filter by status

**Response (200):**
```json
{
  "success": true,
  "data": [
    { user_listing_1 },
    { user_listing_2 }
  ]
}
```

### 9. Get Price Analytics
**GET** `/marketplace/analytics/price/{itemClassId}`

Get price analytics for an item.

**Query Parameters:**
- `days`: Number of days for analysis (default: 30)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "current": {
      "price": 250.50,
      "type": "sold",
      "source": "internal_sale"
    },
    "history": [
      {
        "price": 240.00,
        "timestamp": "2024-01-01T00:00:00.000Z",
        "source": "internal_sale"
      }
    ],
    "analytics": {
      "average": 245.75,
      "median": 250.00,
      "min": 200.00,
      "max": 300.00,
      "volume": 50,
      "trend": "up",
      "volatility": 15.2
    }
  }
}
```

### 10. Get Marketplace Statistics
**GET** `/marketplace/stats`

Get overall marketplace statistics.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "listings": {
      "total": 1000,
      "active": 900,
      "sold": 80,
      "cancelled": 20
    },
    "volume": 250000.00,
    "trends": {
      "priceTrend": "stable",
      "volumeTrend": "up",
      "activeUsers": 1000
    }
  }
}
```

### 11. Search Listings
**GET** `/marketplace/search`

Search listings by query.

**Query Parameters:**
- `q`: Search query (required)
- `type`: Filter by listing type
- `sortBy`: Sort by (price, createdAt, relevance)
- `limit`: Number of results (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "query": "ak-47",
    "results": [
      { matching_listing_1 },
      { matching_listing_2 }
    ],
    "total": 2,
    "filters": { analytics_from_search }
  }
}
```

### 12. Get Featured Listings
**GET** `/marketplace/featured`

Get featured listings.

**Query Parameters:**
- `limit`: Number of results (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { featured_listing_1 },
    { featured_listing_2 }
  ]
}
```

### 13. Get Trending Items
**GET** `/marketplace/trending`

Get trending items based on activity.

**Query Parameters:**
- `limit`: Number of results (default: 20)

**Response (200):**
```json
{
  "success": true,
  "data": [
    { trending_item_1 },
    { trending_item_2 }
  ]
}
```

## Error Responses

All endpoints can return error responses in this format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ErrorType"
}
```

**Common Error Types:**
- `NotFoundException`: Resource not found (404)
- `BadRequestException`: Invalid request data (400)
- `ForbiddenException`: Access denied (403)
- `UnauthorizedException`: Authentication required (401)

## Rate Limiting
- Authenticated endpoints: 100 requests per minute
- Search endpoints: 60 requests per minute
- Analytics endpoints: 30 requests per minute

## WebSocket Events
The marketplace also supports real-time updates via WebSocket:

```javascript
// Connect to WebSocket
const socket = io('http://localhost:3002');

// Listen for listing updates
socket.on('listing:updated', (data) => {
  console.log('Listing updated:', data);
});

// Listen for new bids
socket.on('bid:placed', (data) => {
  console.log('New bid placed:', data);
});

// Listen for price changes
socket.on('price:changed', (data) => {
  console.log('Price changed:', data);
});
```