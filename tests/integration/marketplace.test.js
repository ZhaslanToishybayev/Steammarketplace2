/**
 * Integration tests for Marketplace API
 * Интеграционные тесты для Marketplace API
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Import models
const User = require('../../models/User');
const MarketListing = require('../../models/MarketListing');
const Transaction = require('../../models/Transaction');

// Mock services
jest.mock('../../services/tradeOfferService', () => {
  return jest.fn().mockImplementation(() => ({
    createTradeOffer: jest.fn().mockResolvedValue({
      success: true,
      offerId: '1234567890',
      tradeofferid: '1234567890'
    })
  }));
});

describe('Marketplace API Integration Tests', () => {
  let app;
  let mockSeller;
  let mockBuyer;
  let sellerToken;
  let buyerToken;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());

    // Import routes after mocks
    const marketplaceRoutes = require('../../routes/marketplace');
    app.use('/api/marketplace', marketplaceRoutes);
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await MarketListing.deleteMany({});
    await Transaction.deleteMany({});

    // Create test users
    mockSeller = await User.create({
      steamId: '76561198782060203',
      steamName: 'SellerUser',
      username: 'seller',
      displayName: 'Seller User',
      avatar: 'https://example.com/avatar.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060203',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 0, pendingBalance: 0 }
    });

    mockBuyer = await User.create({
      steamId: '76561198782060204',
      steamName: 'BuyerUser',
      username: 'buyer',
      displayName: 'Buyer User',
      avatar: 'https://example.com/avatar2.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060204',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 1000, pendingBalance: 0 }
    });

    // Create auth tokens
    sellerToken = jwt.sign(
      { id: mockSeller._id, steamId: mockSeller.steamId },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '24h' }
    );

    buyerToken = jwt.sign(
      { id: mockBuyer._id, steamId: mockBuyer.steamId },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '24h' }
    );

    // Add authenticated user middleware
    app.use((req, res, next) => {
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_jwt_secret');
          req.user = { id: decoded.id, steamId: decoded.steamId };
        } catch (error) {
          // Invalid token
        }
      }
      next();
    });
  });

  afterAll(async () => {
    // Clean up
    await User.deleteMany({});
    await MarketListing.deleteMany({});
    await Transaction.deleteMany({});
  });

  describe('GET /api/marketplace/listings', () => {
    test('should return all active listings', async () => {
      // Setup
      const listing1 = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          instanceId: '0',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)',
          iconUrl: 'https://example.com/icon.jpg',
          exterior: 'Field-Tested',
          rarity: 'Classified',
          type: 'Rifle',
          weapon: 'AK-47',
          skin: 'Redline'
        },
        price: 15.99,
        status: 'active'
      });

      const listing2 = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'AWP | Dragon Lore',
          marketName: 'AWP | Dragon Lore (Factory New)',
          iconUrl: 'https://example.com/icon2.jpg',
          exterior: 'Factory New',
          rarity: 'Covert',
          type: 'Sniper Rifle',
          weapon: 'AWP',
          skin: 'Dragon Lore'
        },
        price: 999.99,
        status: 'active'
      });

      // Create sold listing (should not appear)
      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567892',
          classId: '730_3',
          name: 'Sold Item',
          marketName: 'Sold Item'
        },
        price: 10.00,
        status: 'sold'
      });

      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      // Assert
      expect(response.body.listings).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(response.body.currentPage).toBe(1);
    });

    test('should filter listings by search query', async () => {
      // Setup
      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99,
        status: 'active'
      });

      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'AWP | Dragon Lore',
          marketName: 'AWP | Dragon Lore'
        },
        price: 999.99,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings?search=AK-47')
        .expect(200);

      // Assert
      expect(response.body.listings).toHaveLength(1);
      expect(response.body.listings[0].item.name).toContain('AK-47');
    });

    test('should filter by price range', async () => {
      // Setup
      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'Cheap Item',
          marketName: 'Cheap Item'
        },
        price: 10.00,
        status: 'active'
      });

      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'Expensive Item',
          marketName: 'Expensive Item'
        },
        price: 100.00,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings?minPrice=20&maxPrice=200')
        .expect(200);

      // Assert
      expect(response.body.listings).toHaveLength(1);
      expect(response.body.listings[0].price).toBe(100.00);
    });

    test('should paginate results', async () => {
      // Setup - create 25 listings
      const listings = Array(25).fill(null).map((_, i) => ({
        seller: mockSeller._id,
        item: {
          assetId: `123456789${i}`,
          classId: '730_1',
          name: `Test Item ${i}`,
          marketName: `Test Item ${i}`
        },
        price: 10.00 + i,
        status: 'active'
      }));

      await MarketListing.insertMany(listings);

      // Execute - page 1
      const response1 = await request(app)
        .get('/api/marketplace/listings?page=1&limit=20')
        .expect(200);

      // Assert
      expect(response1.body.listings).toHaveLength(20);
      expect(response1.body.totalPages).toBe(2);
      expect(response1.body.currentPage).toBe(1);

      // Execute - page 2
      const response2 = await request(app)
        .get('/api/marketplace/listings?page=2&limit=20')
        .expect(200);

      // Assert
      expect(response2.body.listings).toHaveLength(5);
      expect(response2.body.currentPage).toBe(2);
    });

    test('should sort listings by price ascending', async () => {
      // Setup
      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'Expensive',
          marketName: 'Expensive'
        },
        price: 100.00,
        status: 'active'
      });

      await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'Cheap',
          marketName: 'Cheap'
        },
        price: 10.00,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings?sortBy=price&sortOrder=asc')
        .expect(200);

      // Assert
      expect(response.body.listings[0].price).toBe(10.00);
      expect(response.body.listings[1].price).toBe(100.00);
    });

    test('should return empty array when no listings found', async () => {
      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(200);

      // Assert
      expect(response.body.listings).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  describe('GET /api/marketplace/listings/:id', () => {
    test('should return single listing', async () => {
      // Setup
      const listing = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)',
          iconUrl: 'https://example.com/icon.jpg',
          exterior: 'Field-Tested'
        },
        price: 15.99,
        status: 'active',
        views: 0
      });

      // Execute
      const response = await request(app)
        .get(`/api/marketplace/listings/${listing._id}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('_id', listing._id.toString());
      expect(response.body.item.name).toBe('AK-47 | Redline');
      expect(response.body.price).toBe(15.99);
    });

    test('should increment view count', async () => {
      // Setup
      const listing = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99,
        status: 'active',
        views: 0
      });

      // Execute
      await request(app)
        .get(`/api/marketplace/listings/${listing._id}`)
        .expect(200);

      // Check database
      const updatedListing = await MarketListing.findById(listing._id);
      expect(updatedListing.views).toBe(1);
    });

    test('should return 404 for non-existent listing', async () => {
      // Setup
      const fakeId = new mongoose.Types.ObjectId();

      // Execute
      const response = await request(app)
        .get(`/api/marketplace/listings/${fakeId}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'Listing not found');
    });
  });

  describe('POST /api/marketplace/listings', () => {
    test('should create new listing', async () => {
      // Setup
      const newListing = {
        assetId: '1234567890',
        classId: '730_1',
        instanceId: '0',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        iconUrl: 'https://example.com/icon.jpg',
        price: 15.99,
        description: 'Beautiful skin in good condition',
        autoAccept: false
      };

      // Execute
      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(newListing)
        .expect(201);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.item.name).toBe('AK-47 | Redline');
      expect(response.body.data.price).toBe(15.99);
      expect(response.body.data.seller.toString()).toBe(mockSeller._id.toString());

      // Check database
      const listing = await MarketListing.findOne({ 'item.assetId': '1234567890' });
      expect(listing).toBeDefined();
      expect(listing.status).toBe('active');
    });

    test('should return 400 for invalid listing data', async () => {
      // Setup - missing required fields
      const invalidListing = {
        name: 'AK-47 | Redline'
        // Missing assetId, classId, price
      };

      // Execute
      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(invalidListing)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    test('should return 401 without authentication', async () => {
      // Setup
      const newListing = {
        assetId: '1234567890',
        classId: '730_1',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        price: 15.99
      };

      // Execute
      const response = await request(app)
        .post('/api/marketplace/listings')
        .send(newListing)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should reject listing with price below minimum', async () => {
      // Setup
      const lowPriceListing = {
        assetId: '1234567890',
        classId: '730_1',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        price: 0.001 // Below minimum
      };

      // Execute
      const response = await request(app)
        .post('/api/marketplace/listings')
        .set('Authorization', `Bearer ${sellerToken}`)
        .send(lowPriceListing)
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('DELETE /api/marketplace/listings/:id', () => {
    test('should delete own listing', async () => {
      // Setup
      const listing = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .delete(`/api/marketplace/listings/${listing._id}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);

      // Check database
      const deletedListing = await MarketListing.findById(listing._id);
      expect(deletedListing.status).toBe('cancelled');
    });

    test('should not allow deleting others listings', async () => {
      // Setup
      const listing = await MarketListing.create({
        seller: mockSeller._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .delete(`/api/marketplace/listings/${listing._id}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('error', 'Not authorized');
    });

    test('should return 404 for non-existent listing', async () => {
      // Setup
      const fakeId = new mongoose.Types.ObjectId();

      // Execute
      const response = await request(app)
        .delete(`/api/marketplace/listings/${fakeId}`)
        .set('Authorization', `Bearer ${sellerToken}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'Listing not found');
    });
  });

  describe('Error handling', () => {
    test('should handle database errors', async () => {
      // Setup - corrupt connection temporarily
      const originalConnection = mongoose.connection;
      mongoose.connection = null;

      // Execute
      const response = await request(app)
        .get('/api/marketplace/listings')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error', 'Failed to fetch listings');

      // Restore
      mongoose.connection = originalConnection;
    });
  });
});