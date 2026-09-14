const request = require('supertest');

jest.mock('../../src/config/steam', () => ({
  testConnection: jest.fn(),
}));

jest.mock('../../src/config/redis', () => {
  const client = {
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
  };

  return {
    redisClient: client,
    pubClient: client,
    subClient: client,
    testRedisConnection: jest.fn().mockResolvedValue(false),
    closeRedisConnections: jest.fn().mockResolvedValue(undefined),
  };
});

jest.mock('../../src/config/database', () => ({
  pool: {
    query: jest.fn(),
    end: jest.fn().mockResolvedValue(undefined),
  },
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(false),
  initializeTables: jest.fn(),
}));

jest.mock('@socket.io/redis-adapter', () => ({
  createAdapter: () => class RedisAdapter {},
}));

jest.mock('../../src/services/trade-queue.service', () => ({
  tradeQueueService: {},
}));

jest.mock('../../src/services/metrics.service', () => ({
  register: { contentType: 'text/plain', metrics: jest.fn() },
  metricsMiddleware: (req, res, next) => next(),
  updateBotMetrics: jest.fn(),
  initializeMetrics: jest.fn(),
}));

const { app, server, io } = require('../../src/server');
const steamService = require('../../src/config/steam');

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    io.close();
    if (server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
  });

  test('should return 200 and steam_configured true when key is valid', async () => {
    steamService.testConnection.mockResolvedValue(true);

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.steam_configured).toBe(true);
    expect(steamService.testConnection).toHaveBeenCalled();
  });

  test('should return steam_configured false when connection test fails', async () => {
    steamService.testConnection.mockResolvedValue(false);

    const response = await request(app).get('/api/health');

    expect(response.body.steam_configured).toBe(false);
  });
});
