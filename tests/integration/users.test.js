/**
 * Integration tests for Users API
 * Интеграционные тесты для Users API
 */

const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

// Import models
const User = require('../../models/User');
const MarketListing = require('../../models/MarketListing');
const Transaction = require('../../models/Transaction');

describe('Users API Integration Tests', () => {
  let app;
  let mockUser;
  let mockAdmin;
  let userToken;
  let adminToken;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());

    // Import routes
    const usersRoutes = require('../../routes/users');
    app.use('/api/users', usersRoutes);
  });

  beforeEach(async () => {
    // Clean up database
    await User.deleteMany({});
    await MarketListing.deleteMany({});
    await Transaction.deleteMany({});

    // Create test users
    mockUser = await User.create({
      steamId: '76561198782060203',
      steamName: 'TestUser',
      username: 'testuser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060203',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 500, pendingBalance: 100 },
      reputation: { positive: 95, negative: 5, total: 100 }
    });

    mockAdmin = await User.create({
      steamId: '76561198782060204',
      steamName: 'AdminUser',
      username: 'admin',
      displayName: 'Admin User',
      avatar: 'https://example.com/admin.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060204',
      isAdmin: true,
      isBanned: false,
      wallet: { balance: 0, pendingBalance: 0 }
    });

    // Create auth tokens
    userToken = jwt.sign(
      { id: mockUser._id, steamId: mockUser.steamId },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '24h' }
    );

    adminToken = jwt.sign(
      { id: mockAdmin._id, steamId: mockAdmin.steamId },
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

  describe('GET /api/users/profile', () => {
    test('should return user profile with valid token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('steamId', mockUser.steamId);
      expect(response.body.data).toHaveProperty('steamName', mockUser.steamName);
      expect(response.body.data).toHaveProperty('wallet');
      expect(response.body.data).toHaveProperty('reputation');
      expect(response.body.data.steamId).toBe('76561198782060203');
      expect(response.body.data.wallet.balance).toBe(500);
    });

    test('should return 401 without authentication', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should return 401 with invalid token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should hide sensitive information', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Assert
      expect(response.body.data).not.toHaveProperty('steamAccessToken');
      expect(response.body.data).not.toHaveProperty('steamRefreshToken');
    });
  });

  describe('GET /api/users/:id', () => {
    test('should return public user information', async () => {
      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('steamId', mockUser.steamId);
      expect(response.body).toHaveProperty('steamName', mockUser.steamName);
      expect(response.body).toHaveProperty('displayName', mockUser.displayName);
      expect(response.body).toHaveProperty('reputation');
    });

    test('should not expose private information', async () => {
      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}`)
        .expect(200);

      // Assert
      expect(response.body).not.toHaveProperty('wallet');
      expect(response.body).not.toHaveProperty('isAdmin');
      expect(response.body).not.toHaveProperty('steamAccessToken');
    });

    test('should return 404 for non-existent user', async () => {
      // Setup
      const fakeId = '507f1f77bcf86cd799439999';

      // Execute
      const response = await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('GET /api/users/:id/listings', () => {
    test('should return user listings', async () => {
      // Setup
      const listing1 = await MarketListing.create({
        seller: mockUser._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99,
        status: 'active'
      });

      const listing2 = await MarketListing.create({
        seller: mockUser._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'AWP | Dragon Lore',
          marketName: 'AWP | Dragon Lore'
        },
        price: 999.99,
        status: 'active'
      });

      // Create listing for another user
      await MarketListing.create({
        seller: mockAdmin._id,
        item: {
          assetId: '1234567892',
          classId: '730_3',
          name: 'Other Item',
          marketName: 'Other Item'
        },
        price: 20.00,
        status: 'active'
      });

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/listings`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.listings).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    test('should filter by status', async () => {
      // Setup
      await MarketListing.create({
        seller: mockUser._id,
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'Active Item',
          marketName: 'Active Item'
        },
        price: 15.99,
        status: 'active'
      });

      await MarketListing.create({
        seller: mockUser._id,
        item: {
          assetId: '1234567891',
          classId: '730_2',
          name: 'Sold Item',
          marketName: 'Sold Item'
        },
        price: 999.99,
        status: 'sold'
      });

      // Execute - active only
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/listings?status=active`)
        .expect(200);

      // Assert
      expect(response.body.data.listings).toHaveLength(1);
      expect(response.body.data.listings[0].status).toBe('active');
    });

    test('should return 404 for non-existent user', async () => {
      // Setup
      const fakeId = '507f1f77bcf86cd799439999';

      // Execute
      const response = await request(app)
        .get(`/api/users/${fakeId}/listings`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'User not found');
    });
  });

  describe('PUT /api/users/profile', () => {
    test('should update user profile', async () => {
      // Setup
      const updates = {
        displayName: 'Updated User',
        settings: {
          notifications: {
            email: false,
            browser: true
          },
          privacy: {
            showInventory: false,
            showTradeHistory: true
          }
        }
      };

      // Execute
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updates)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.displayName).toBe('Updated User');
      expect(response.body.data.settings.notifications.email).toBe(false);
      expect(response.body.data.settings.privacy.showInventory).toBe(false);

      // Check database
      const updatedUser = await User.findById(mockUser._id);
      expect(updatedUser.displayName).toBe('Updated User');
      expect(updatedUser.settings.notifications.email).toBe(false);
    });

    test('should not allow updating sensitive fields', async () => {
      // Setup
      const updates = {
        isAdmin: true,
        isBanned: true,
        steamId: 'fake_steam_id',
        wallet: {
          balance: 999999
        }
      };

      // Execute
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updates)
        .expect(200);

      // Assert - these fields should not be updated
      expect(response.body.data.isAdmin).toBe(false);
      expect(response.body.data.isBanned).toBe(false);
      expect(response.body.data.steamId).toBe(mockUser.steamId);
      expect(response.body.data.wallet.balance).toBe(500); // Original value
    });

    test('should return 401 without authentication', async () => {
      // Setup
      const updates = { displayName: 'New Name' };

      // Execute
      const response = await request(app)
        .put('/api/users/profile')
        .send(updates)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/users/:id/transactions', () => {
    test('should return user transactions', async () => {
      // Setup
      const transaction1 = await Transaction.create({
        type: 'purchase',
        user: mockUser._id,
        amount: 15.99,
        status: 'completed',
        description: 'Purchase of AK-47'
      });

      const transaction2 = await Transaction.create({
        type: 'deposit',
        user: mockUser._id,
        amount: 100.00,
        status: 'completed',
        description: 'Wallet deposit'
      });

      // Create transaction for another user
      await Transaction.create({
        type: 'purchase',
        user: mockAdmin._id,
        amount: 20.00,
        status: 'completed',
        description: 'Admin purchase'
      });

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/transactions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data.transactions).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
    });

    test('should filter transactions by type', async () => {
      // Setup
      await Transaction.create({
        type: 'purchase',
        user: mockUser._id,
        amount: 15.99,
        status: 'completed'
      });

      await Transaction.create({
        type: 'deposit',
        user: mockUser._id,
        amount: 100.00,
        status: 'completed'
      });

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/transactions?type=deposit`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // Assert
      expect(response.body.data.transactions).toHaveLength(1);
      expect(response.body.data.transactions[0].type).toBe('deposit');
    });

    test('should return 404 for non-existent user', async () => {
      // Setup
      const fakeId = '507f1f77bcf86cd799439999';

      // Execute
      const response = await request(app)
        .get(`/api/users/${fakeId}/transactions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);

      // Assert
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should return 403 when accessing other user transactions', async () => {
      // Setup
      await Transaction.create({
        type: 'purchase',
        user: mockUser._id,
        amount: 15.99,
        status: 'completed'
      });

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/transactions`)
        .set('Authorization', `Bearer ${adminToken}`) // Different user token
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('error', 'Not authorized');
    });
  });

  describe('GET /api/users/:id/reputation', () => {
    test('should return user reputation', async () => {
      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/reputation`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('positive', 95);
      expect(response.body.data).toHaveProperty('negative', 5);
      expect(response.body.data).toHaveProperty('total', 100);
      expect(response.body.data).toHaveProperty('percentage', 95);
    });

    test('should calculate reputation percentage correctly', async () => {
      // Setup
      mockUser.reputation.positive = 80;
      mockUser.reputation.negative = 20;
      mockUser.reputation.total = 100;
      await mockUser.save();

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}/reputation`)
        .expect(200);

      // Assert
      expect(response.body.data.percentage).toBe(80);
    });
  });

  describe('Admin endpoints', () => {
    test('should allow admin to view all users', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('users');
    });

    test('should prevent regular user from viewing all users', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });

    test('should allow admin to ban user', async () => {
      // Execute
      const response = await request(app)
        .put(`/api/users/${mockUser._id}/ban`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);

      // Check database
      const bannedUser = await User.findById(mockUser._id);
      expect(bannedUser.isBanned).toBe(true);
    });

    test('should prevent regular user from banning others', async () => {
      // Execute
      const response = await request(app)
        .put(`/api/users/${mockAdmin._id}/ban`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('Error handling', () => {
    test('should handle invalid ObjectId', async () => {
      // Execute
      const response = await request(app)
        .get('/api/users/invalid_id')
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    test('should handle database errors', async () => {
      // Setup - simulate database error
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      // Execute
      const response = await request(app)
        .get(`/api/users/${mockUser._id}`)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');

      // Restore
      User.findById = originalFindById;
    });
  });
});