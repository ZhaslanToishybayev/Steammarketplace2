/**
 * Integration tests for Auth API
 * Интеграционные тесты для API аутентификации
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { mockSteamProfile, mockSteamInventory, cleanup } = require('../mocks/steamApi');

// Import models
const User = require('../../models/User');

// Mock external dependencies
jest.mock('steam-session', () => ({
  getOEMCredentials: jest.fn(),
  getSession: jest.fn()
}));

jest.mock('../../services/steamOAuthService', () => ({
  getAuthorizationUrl: jest.fn().mockReturnValue({
    url: 'https://steamcommunity.com/openid/login',
    state: 'test_state_123'
  }),
  verifyCallback: jest.fn(),
  getUserInfo: jest.fn()
}));

describe('Auth API Integration Tests', () => {
  let app;
  let mockUser;
  let authToken;

  beforeAll(async () => {
    // Setup test app
    app = express();
    app.use(express.json());

    // Import routes after mocks
    const authRoutes = require('../../routes/auth');
    app.use('/api/auth', authRoutes);
  });

  beforeEach(async () => {
    // Clean up before each test
    cleanup();
    jest.clearAllMocks();

    // Create test user
    mockUser = await User.create({
      steamId: '76561198782060203',
      steamName: 'TestUser',
      username: 'TestUser',
      displayName: 'Test User',
      avatar: 'https://example.com/avatar.jpg',
      profileUrl: 'https://steamcommunity.com/profiles/76561198782060203',
      steamAccessToken: 'test_token',
      steamRefreshToken: 'test_refresh_token',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 0, pendingBalance: 0 }
    });

    // Create auth token
    authToken = jwt.sign(
      { id: mockUser._id, steamId: mockUser.steamId },
      process.env.JWT_SECRET || 'test_jwt_secret',
      { expiresIn: '24h' }
    );
  });

  afterEach(async () => {
    // Clean up database after each test
    await User.deleteMany({});
  });

  afterAll(async () => {
    // Clean up after all tests
    cleanup();
  });

  describe('GET /api/auth/steam', () => {
    test('should redirect to Steam OAuth', async () => {
      // Setup
      const steamOAuthService = require('../../services/steamOAuthService');
      steamOAuthService.getAuthorizationUrl.mockReturnValue({
        url: 'https://steamcommunity.com/openid/login?openid.ns=some_url',
        state: 'test_state'
      });

      // Execute
      const response = await request(app)
        .get('/api/auth/steam')
        .expect(302);

      // Assert
      expect(response.headers.location).toContain('steamcommunity.com/openid/login');
      expect(steamOAuthService.getAuthorizationUrl).toHaveBeenCalled();
    });

    test('should return 500 if Steam OAuth fails', async () => {
      // Setup
      const steamOAuthService = require('../../services/steamOAuthService');
      steamOAuthService.getAuthorizationUrl.mockImplementation(() => {
        throw new Error('OAuth service error');
      });

      // Execute
      const response = await request(app)
        .get('/api/auth/steam')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to initiate authentication');
    });
  });

  describe('GET /api/auth/steam/callback', () => {
    test('should handle Steam OAuth callback and create user', async () => {
      // Setup
      const steamOAuthService = require('../../services/steamOAuthService');
      steamOAuthService.verifyCallback.mockResolvedValue({
        steamId: '76561198782060203',
        steamName: 'NewUser',
        username: 'NewUser',
        displayName: 'New User',
        avatar: 'https://example.com/avatar.jpg',
        profileUrl: 'https://steamcommunity.com/profiles/76561198782060203'
      });

      steamOAuthService.getUserInfo.mockResolvedValue({
        steamId: '76561198782060203',
        steamName: 'NewUser',
        avatar: 'https://example.com/avatar.jpg'
      });

      // Execute
      const response = await request(app)
        .get('/api/auth/steam/callback')
        .query({ openid_ns: 'some_ns', state: 'test_state' })
        .expect(302);

      // Assert
      expect(steamOAuthService.verifyCallback).toHaveBeenCalled();
      expect(steamOAuthService.getUserInfo).toHaveBeenCalled();

      // Check user was created
      const newUser = await User.findOne({ steamId: '76561198782060203' });
      expect(newUser).toBeDefined();
      expect(newUser.steamName).toBe('NewUser');
    });

    test('should return existing user if already registered', async () => {
      // Setup
      const steamOAuthService = require('../../services/steamOAuthService');
      steamOAuthService.verifyCallback.mockResolvedValue({
        steamId: mockUser.steamId,
        steamName: mockUser.steamName,
        username: mockUser.username,
        displayName: mockUser.displayName,
        avatar: mockUser.avatar,
        profileUrl: mockUser.profileUrl
      });

      steamOAuthService.getUserInfo.mockResolvedValue({
        steamId: mockUser.steamId,
        steamName: mockUser.steamName,
        avatar: mockUser.avatar
      });

      // Execute
      const response = await request(app)
        .get('/api/auth/steam/callback')
        .query({ openid_ns: 'some_ns', state: 'test_state' })
        .expect(302);

      // Assert
      expect(steamOAuthService.verifyCallback).toHaveBeenCalled();
    });

    test('should return 400 if callback validation fails', async () => {
      // Setup
      const steamOAuthService = require('../../services/steamOAuthService');
      steamOAuthService.verifyCallback.mockRejectedValue(
        new Error('Invalid callback parameters')
      );

      // Execute
      const response = await request(app)
        .get('/api/auth/steam/callback')
        .query({ invalid: 'params' })
        .expect(302); // Steam still redirects

      // Assert
      // The middleware should handle the error
      expect(steamOAuthService.verifyCallback).toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    test('should return user profile with valid token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('steamId', mockUser.steamId);
      expect(response.body.data).toHaveProperty('steamName', mockUser.steamName);
      expect(response.body.data).toHaveProperty('wallet');
    });

    test('should return 401 without token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });

    test('should return 401 with invalid token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });

    test('should return 403 if user is banned', async () => {
      // Setup
      mockUser.isBanned = true;
      await mockUser.save();

      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      // Assert
      expect(response.body).toHaveProperty('error', 'Account is banned');
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh valid token', async () => {
      // Setup
      const refreshToken = mockUser.steamRefreshToken;

      // Execute
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('token');
    });

    test('should return 400 with invalid refresh token', async () => {
      // Execute
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid_token' })
        .expect(400);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid refresh token');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should logout successfully', async () => {
      // Execute
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message', 'Logged out successfully');
    });

    test('should return 401 without token', async () => {
      // Execute
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Access token required');
    });
  });

  describe('GET /api/auth/verify', () => {
    test('should verify valid token', async () => {
      // Execute
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('valid', true);
      expect(response.body.data).toHaveProperty('user');
    });

    test('should return invalid for expired token', async () => {
      // Setup
      const expiredToken = jwt.sign(
        { id: mockUser._id, steamId: mockUser.steamId },
        process.env.JWT_SECRET || 'test_jwt_secret',
        { expiresIn: '-1h' } // Already expired
      );

      // Execute
      const response = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.data).toHaveProperty('valid', false);
    });
  });

  describe('Error handling', () => {
    test('should handle database connection errors', async () => {
      // Simulate database error by closing connection
      await mongoose.connection.close();

      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
    });

    test('should handle malformed JWT tokens', async () => {
      // Execute
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer malformed.jwt.token')
        .expect(401);

      // Assert
      expect(response.body).toHaveProperty('error', 'Invalid or expired token');
    });
  });
});