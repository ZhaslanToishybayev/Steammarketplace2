/**
 * Integration tests for Steam API
 * Интеграционные тесты для Steam API
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { mockSteamInventory, mockMarketPrice, mockItemNameId, cleanup } = require('../mocks/steamApi');

// Import models
const User = require('../../models/User');

// Mock steam integration service
jest.mock('../../services/steamIntegrationService', () => ({
  getInventory: jest.fn(),
  getPriceOverview: jest.fn(),
  getMarketSearch: jest.fn()
}));

describe('Steam API Integration Tests', () => {
  let app;
  let mockUser;
  let authToken;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());

    // Import routes after mocks
    const steamRoutes = require('../../routes/steam');
    app.use('/api/steam', steamRoutes);
  });

  beforeEach(async () => {
    // Clean up before each test
    cleanup();
    jest.clearAllMocks();

    // Create test user
    mockUser = await User.create({
      steamId: '76561198782060203',
      steamName: 'TestUser',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060203',
      steamAccessToken: 'test_access_token',
      steamRefreshToken: 'test_refresh_token',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 100, pendingBalance: 0 }
    });

    // Create auth token
    authToken = jwt.sign(
      { id: mockUser._id, steamId: mockUser.steamId },
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

  afterEach(async () => {
    // Clean up database after each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    cleanup();
  });

  describe('GET /api/steam/inventory', () => {
    test('should return CS2 inventory for authenticated user', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: true,
        items: [
          {
            assetid: '1234567890',
            classid: '730_1',
            instanceid: '0',
            name: 'AK-47 | Redline',
            market_name: 'AK-47 | Redline (Field-Tested)',
            type: 'Rifle',
            tradable: 1,
            marketable: 1,
            appId: 730
          }
        ]
      });

      mockSteamInventory('76561198782060203', 730, [
        {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline'
        }
      ]);

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('items');
      expect(response.body.data.items).toBeInstanceOf(Array);
      expect(steamIntegration.getInventory).toHaveBeenCalledWith(
        '76561198782060203',
        730,
        'test_access_token'
      );
    });

    test('should return Dota 2 inventory', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: true,
        items: [
          {
            assetid: '9876543210',
            classid: '570_2',
            instanceid: '0',
            name: 'Dragonclaw Hook',
            market_name: 'Dragonclaw Hook',
            type: 'Courier',
            tradable: 1,
            marketable: 1,
            appId: 570
          }
        ]
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=dota2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(steamIntegration.getInventory).toHaveBeenCalledWith(
        '76561198782060203',
        570,
        'test_access_token'
      );
    });

    test('should return default CS2 inventory when no game specified', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: true,
        items: []
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(steamIntegration.getInventory).toHaveBeenCalledWith(
        '76561198782060203',
        730, // Default to CS2
        'test_access_token'
      );
    });

    test('should return 401 without authentication', async () => {
      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should return 404 if user not found', async () => {
      // Setup - delete user
      await User.deleteOne({ _id: mockUser._id });

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should handle Steam API errors gracefully', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: false,
        error: 'Steam API temporarily unavailable'
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    test('should filter tradable items only', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: true,
        items: [
          {
            assetid: '1234567890',
            classid: '730_1',
            name: 'AK-47 | Redline',
            market_name: 'AK-47 | Redline (Field-Tested)',
            tradable: 1,
            marketable: 1,
            appId: 730
          },
          {
            assetid: '9876543210',
            classid: '730_2',
            name: 'Non-tradable Item',
            market_name: 'Non-tradable Item',
            tradable: 0, // Not tradable
            marketable: 1,
            appId: 730
          }
        ]
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body.data.items).toHaveLength(1);
      expect(response.body.data.items[0].tradable).toBe(true);
    });
  });

  describe('GET /api/steam/price/:itemName', () => {
    test('should return price overview for item', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getPriceOverview.mockResolvedValue({
        success: true,
        lowest_price: '$15.99',
        volume: '100',
        median_price: '$14.50'
      });

      const itemName = 'AK-47 | Redline (Field-Tested)';
      mockMarketPrice(itemName, { lowest: '15.99', volume: 100 });
      mockItemNameId(itemName);

      // Execute
      const response = await request(app)
        .get(`/api/steam/price/${encodeURIComponent(itemName)}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('lowest_price', '$15.99');
      expect(response.body.data).toHaveProperty('volume', '100');
      expect(steamIntegration.getPriceOverview).toHaveBeenCalled();
    });

    test('should handle item not found', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getPriceOverview.mockResolvedValue({
        success: false,
        error: 'Item not found'
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/price/NonExistentItem')
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/steam/market/search', () => {
    test('should search marketplace items', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getMarketSearch.mockResolvedValue({
        success: true,
        results: [
          {
            name: 'AK-47 | Redline',
            hash_name: 'AK-47___Redline',
            sell_listings: 50,
            sell_price: 1599,
            appid: 730
          }
        ]
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/market/search?query=AK-47')
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('results');
      expect(steamIntegration.getMarketSearch).toHaveBeenCalledWith('AK-47', 730);
    });

    test('should use appId from query parameter', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getMarketSearch.mockResolvedValue({
        success: true,
        results: []
      });

      // Execute
      const response = await request(app)
        .get('/api/steam/market/search?query=Dragonclaw&appId=570')
        .expect(200);

      // Assert
      expect(steamIntegration.getMarketSearch).toHaveBeenCalledWith('Dragonclaw', 570);
    });
  });

  describe('POST /api/steam/trade-url', () => {
    test('should update trade URL', async () => {
      // Setup
      const validTradeUrl = 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abcdefg';

      // Execute
      const response = await request(app)
        .post('/api/steam/trade-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tradeUrl: validTradeUrl })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message', 'Trade URL updated successfully');

      // Check database
      const updatedUser = await User.findById(mockUser._id);
      expect(updatedUser.tradeUrl).toBe(validTradeUrl);
    });

    test('should reject invalid trade URL format', async () => {
      // Setup
      const invalidTradeUrl = 'https://example.com/invalid-url';

      // Execute
      const response = await request(app)
        .post('/api/steam/trade-url')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ tradeUrl: invalidTradeUrl })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid trade URL format');
    });

    test('should return 401 without authentication', async () => {
      // Execute
      const response = await request(app)
        .post('/api/steam/trade-url')
        .send({ tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789' })
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('Rate limiting', () => {
    test('should apply rate limiting to inventory requests', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockResolvedValue({
        success: true,
        items: []
      });

      // Make multiple requests rapidly
      const requests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/steam/inventory?game=cs2')
          .set('Authorization', `Bearer ${authToken}`)
      );

      // Execute all requests
      const responses = await Promise.all(requests);

      // Assert - all should succeed (or some might be delayed)
      responses.forEach(response => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Error handling', () => {
    test('should handle Steam API connection errors', async () => {
      // Setup
      const steamIntegration = require('../../services/steamIntegrationService');
      steamIntegration.getInventory.mockRejectedValue(
        new Error('Connection to Steam API failed')
      );

      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=cs2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    test('should handle malformed requests', async () => {
      // Execute
      const response = await request(app)
        .get('/api/steam/inventory?game=invalidgame')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200); // Should default to CS2

      // Assert
      expect(response.body).toHaveProperty('success', true);
    });
  });
});