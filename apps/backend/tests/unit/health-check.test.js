const request = require('supertest');
const { app } = require('../../src/server');
const steamService = require('../../src/config/steam');

// Mock SteamAPI
jest.mock('../../src/config/steam', () => ({
  testConnection: jest.fn()
}));

describe('Health Check API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return 200 and steam_configured true when key is valid', async () => {
    // @ts-ignore
    steamService.testConnection.mockResolvedValue(true);

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.steam_configured).toBe(true);
    expect(steamService.testConnection).toHaveBeenCalled();
  });

  test('should return steam_configured false when connection test fails', async () => {
    // @ts-ignore
    steamService.testConnection.mockResolvedValue(false);

    const response = await request(app).get('/api/health');

    expect(response.body.steam_configured).toBe(false);
  });
});
