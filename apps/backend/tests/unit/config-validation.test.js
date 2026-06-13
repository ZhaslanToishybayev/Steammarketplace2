const path = require('path');

describe('Configuration Validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should throw error if STEAM_API_KEY is missing', () => {
    delete process.env.STEAM_API_KEY;
    expect(() => {
      require('../../src/config/validator');
    }).toThrow(/Missing required environment variable: STEAM_API_KEY/);
  });

  test('should throw error if STEAM_API_KEY is default', () => {
    process.env.STEAM_API_KEY = 'your_steam_api_key_here';
    expect(() => {
      require('../../src/config/validator');
    }).toThrow(/STEAM_API_KEY is using the default placeholder value/);
  });

  test('should validate that Bot credentials are present', () => {
    delete process.env.BOT_ACCOUNT_NAME;
    expect(() => {
      require('../../src/config/validator');
    }).toThrow(/Missing required environment variable: BOT_ACCOUNT_NAME/);
  });

  test('should ensure URLs do not contain localhost in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.STEAM_RETURN_URL = 'http://localhost:3000/api/auth/steam/return';
    
    // Ensure all other required vars are present to avoid other errors
    process.env.STEAM_API_KEY = 'valid_key';
    process.env.POSTGRES_USER = 'user';
    process.env.POSTGRES_PASSWORD = 'safe_password';
    process.env.POSTGRES_DB = 'db';
    process.env.JWT_SECRET = 'secret';
    process.env.BOT_ACCOUNT_NAME = 'bot';
    process.env.BOT_PASSWORD = 'pass';

    expect(() => {
      require('../../src/config/validator');
    }).toThrow(/STEAM_RETURN_URL contains localhost\/127.0.0.1 in production/);
  });

  test('should pass validation with valid config', () => {
    process.env.NODE_ENV = 'production';
    process.env.STEAM_API_KEY = 'valid_key';
    process.env.POSTGRES_USER = 'user';
    process.env.POSTGRES_PASSWORD = 'safe_password';
    process.env.POSTGRES_DB = 'db';
    process.env.JWT_SECRET = 'secret';
    process.env.BOT_ACCOUNT_NAME = 'bot';
    process.env.BOT_PASSWORD = 'pass';
    process.env.STEAM_RETURN_URL = 'https://sgomarket.com/auth/return';

    const validator = require('../../src/config/validator');
    expect(validator.validate()).toBe(true);
  });
});
