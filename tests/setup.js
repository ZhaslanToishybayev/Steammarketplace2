// Jest setup file
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_testing_only_12345';
process.env.SESSION_SECRET = 'test_session_secret_for_testing_only_67890';

// MongoDB Memory Server setup
let mongoServer;

beforeAll(async () => {
  try {
    // Start in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  } catch (error) {
    console.error('MongoDB setup error:', error.message);
    // Continue even if MongoDB fails - some tests don't need it
  }
});

afterAll(async () => {
  // Clean up
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  } catch (error) {
    // Ignore cleanup errors
    console.log('Cleanup error (ignored):', error.message);
  }
});

beforeEach(async () => {
  // Clean collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

// Mock external dependencies
jest.mock('axios');
jest.mock('steam-session');
jest.mock('steam-user');
jest.mock('steam-tradeoffer-manager');

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
};

// Increase timeout for async operations
jest.setTimeout(30000);

// Helper functions for creating mock data
global.createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  steamId: '76561198782060203',
  steamName: 'TestUser',
  username: 'TestUser',
  displayName: 'Test User',
  avatar: 'https://example.com/avatar.jpg',
  profileUrl: 'https://steamcommunity.com/profiles/76561198782060203',
  steamAccessToken: 'mock_access_token',
  steamRefreshToken: 'mock_refresh_token',
  isAdmin: false,
  isBanned: false,
  wallet: { balance: 0, pendingBalance: 0 },
  save: jest.fn().mockResolvedValue(this),
  ...overrides
});

global.createMockTradeOffer = (overrides = {}) => ({
  offerId: '1234567890',
  steamId: '76561198782060203',
  botId: 'bot_1',
  itemsGiven: ['asset_1'],
  itemsReceived: [],
  status: 'sent',
  createdAt: new Date(),
  updatedAt: new Date(),
  save: jest.fn().mockResolvedValue(this),
  ...overrides
});

global.createMockRequest = (overrides = {}) => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  user: null,
  ip: '127.0.0.1',
  get: jest.fn((header) => overrides.headers?.[header.toLowerCase()]),
  ...overrides
});

global.createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    removeHeader: jest.fn()
  };
  return res;
};
