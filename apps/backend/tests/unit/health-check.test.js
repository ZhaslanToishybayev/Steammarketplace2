const request = require('supertest');
const { app, server, io } = require('../../src/server');
const { closeRedisConnections } = require('../../src/config/redis');
const { pool } = require('../../src/config/database');
const steamService = require('../../src/config/steam');

jest.mock('../../src/config/steam', () => ({
  testConnection: jest.fn()
}));

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    io.close();
    if (server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
    await closeRedisConnections();
    await pool.end();
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
