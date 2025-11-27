#!/usr/bin/env node

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = 3002;

// Middleware
app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Steam API Key
const STEAM_API_KEY = "E1FC69B3707FF57C6267322B0271A86B";

// Mock data for testing
const mockListings = [
  {
    id: "1",
    itemName: "AK-47 | Redline",
    itemDescription: "A highly coveted AK-47 skin with a pristine finish",
    price: 125.50,
    type: "fixed_price",
    status: "active",
    sellerId: "123",
    steamId: "76561198012345678",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "2",
    itemName: "M4A4 | Dragon King",
    itemDescription: "The legendary Dragon King M4A4",
    price: 89.99,
    type: "auction",
    status: "active",
    sellerId: "456",
    steamId: "76561198087654321",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const mockTrades = [
  {
    id: "trade_1",
    senderId: "123",
    targetSteamId: "76561198087654321",
    itemsOffered: ["AK-47 | Redline"],
    itemsRequested: ["M4A4 | Dragon King"],
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'steam-marketplace-api',
    version: '1.0.0'
  });
});

// Steam API proxy endpoints
app.get('/api/steam/players/online', async (req, res) => {
  try {
    const response = await fetch(`https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=730&key=${STEAM_API_KEY}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch Steam data' });
  }
});

// Marketplace endpoints
app.get('/api/marketplace/listings', (req, res) => {
  const { type, status, limit = 50 } = req.query;
  let listings = [...mockListings];

  if (type) {
    listings = listings.filter(listing => listing.type === type);
  }

  if (status) {
    listings = listings.filter(listing => listing.status === status);
  }

  res.json({
    success: true,
    data: listings.slice(0, parseInt(limit)),
    total: listings.length,
    analytics: {
      totalValue: listings.reduce((sum, listing) => sum + listing.price, 0),
      averagePrice: listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length,
      listingCount: listings.length
    }
  });
});

app.get('/api/marketplace/listings/:id', (req, res) => {
  const listing = mockListings.find(l => l.id === req.params.id);
  if (!listing) {
    return res.status(404).json({ success: false, message: 'Listing not found' });
  }
  res.json({ success: true, data: listing });
});

app.post('/api/marketplace/listings', (req, res) => {
  const { itemName, itemDescription, price, type } = req.body;

  if (!itemName || !price) {
    return res.status(400).json({
      success: false,
      message: 'Item name and price are required'
    });
  }

  const newListing = {
    id: Date.now().toString(),
    itemName,
    itemDescription: itemDescription || '',
    price: parseFloat(price),
    type: type || 'fixed_price',
    status: 'active',
    sellerId: 'test_user',
    steamId: '76561198012345678',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockListings.push(newListing);
  res.status(201).json({
    success: true,
    message: 'Listing created successfully',
    data: newListing
  });
});

// Trade endpoints
app.get('/api/trades', (req, res) => {
  res.json({
    success: true,
    data: mockTrades,
    total: mockTrades.length
  });
});

app.get('/api/trades/:id', (req, res) => {
  const trade = mockTrades.find(t => t.id === req.params.id);
  if (!trade) {
    return res.status(404).json({ success: false, message: 'Trade not found' });
  }
  res.json({ success: true, data: trade });
});

app.post('/api/trades', (req, res) => {
  const { senderId, targetSteamId, itemsOffered, itemsRequested } = req.body;

  if (!senderId || !targetSteamId || !itemsOffered || !itemsRequested) {
    return res.status(400).json({
      success: false,
      message: 'All trade fields are required'
    });
  }

  const newTrade = {
    id: `trade_${Date.now()}`,
    senderId,
    targetSteamId,
    itemsOffered,
    itemsRequested,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  mockTrades.push(newTrade);
  res.status(201).json({
    success: true,
    message: 'Trade offer created successfully',
    data: newTrade
  });
});

// Steam Auth endpoints (simplified)
app.get('/api/auth/steam', (req, res) => {
  res.json({
    success: true,
    message: 'Steam OAuth endpoint available',
    data: {
      authUrl: `https://steamcommunity.com/openid/login?openid.ns=http://specs.openid.net/auth/2.0&openid.mode=checkid_setup&openid.return_to=http://localhost:3002/api/auth/steam/return&openid.realm=http://localhost:3002&openid.identity=http://specs.openid.net/auth/2.0/identifier_select&openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select`
    }
  });
});

app.get('/api/auth/steam/return', (req, res) => {
  res.json({
    success: true,
    message: 'Steam OAuth callback received',
    data: {
      authenticated: true,
      steamId: '76561198012345678',
      profile: {
        personaname: 'TestUser',
        avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310cba5d9c006dd9b0b731cac.jpg',
        profileurl: 'https://steamcommunity.com/profiles/76561198012345678'
      }
    }
  });
});

// Inventory endpoints (simplified)
app.get('/api/steam/inventory/:steamId', (req, res) => {
  const { steamId } = req.params;
  res.json({
    success: true,
    data: {
      steamId,
      items: [
        {
          id: 'item_1',
          name: 'AK-47 | Redline (Field-Tested)',
          classid: '123456789',
          instanceid: '987654321',
          description: 'A fully-upgraded AK-47 with Redline',
          image: 'https://steamcommunity-a.akamaihd.net/economy/itemimages/730/ak47_redline.png',
          tradable: true,
          marketable: true,
          price: 125.50
        }
      ],
      totalItems: 1
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: [
      'GET /health',
      'GET /api/marketplace/listings',
      'POST /api/marketplace/listings',
      'GET /api/trades',
      'POST /api/trades',
      'GET /api/auth/steam',
      'GET /api/steam/inventory/:steamId'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Steam Marketplace API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🏪 Marketplace: http://localhost:${PORT}/api/marketplace/listings`);
  console.log(`🔄 Trades: http://localhost:${PORT}/api/trades`);
  console.log(`🎮 Steam Auth: http://localhost:${PORT}/api/auth/steam`);
  console.log(`📦 Inventory: http://localhost:${PORT}/api/steam/inventory/76561198012345678`);
});

module.exports = app;