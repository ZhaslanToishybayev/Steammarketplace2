const { BOT_CONFIGS } = require('../../src/config/bots.config');
const SteamBot = require('../../src/services/steam-bot.service');

// Mock services
jest.mock('../../src/services/bot-session.service', () => ({
  sessionService: {
    getSession: jest.fn(),
    saveSession: jest.fn(),
    queueLogin: jest.fn(fn => Promise.resolve(fn())),
    clearSession: jest.fn()
  }
}));

// Mock steam modules
jest.mock('steamcommunity', () => {
  return jest.fn().mockImplementation(() => ({
    login: jest.fn((options, callback) => callback(null, 'sessionID', ['cookie1', 'cookie2'])),
    on: jest.fn(),
    acceptConfirmationForObject: jest.fn()
  }));
});

jest.mock('steam-tradeoffer-manager', () => {
  const manager = jest.fn().mockImplementation(() => ({
    setCookies: jest.fn((cookies, callback) => callback(null)),
    on: jest.fn(),
    doPoll: jest.fn(),
    shutdown: jest.fn()
  }));
  // @ts-ignore
  manager.ETradeOfferState = { Active: 2, Accepted: 3 };
  return manager;
});

describe('Bot Authentication and Sessions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { 
      ...originalEnv,
      STEAM_BOT_1_USERNAME: 'testbot',
      STEAM_BOT_1_PASSWORD: 'testpassword',
      STEAM_BOT_1_SHARED_SECRET: 'shared',
      STEAM_BOT_1_IDENTITY_SECRET: 'identity',
      STEAM_API_KEY: 'api_key'
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should load bot configurations from environment', () => {
    jest.isolateModules(() => {
      const { BOT_CONFIGS } = require('../../src/config/bots.config');
      const testBot = BOT_CONFIGS.find(b => b.accountName === 'testbot');
      expect(testBot).toBeDefined();
      expect(testBot.password).toBe('testpassword');
    });
  });

  test('should login and save session if no session exists', async () => {
    const { sessionService } = require('../../src/services/bot-session.service');
    sessionService.getSession.mockResolvedValue(null);

    const bot = new SteamBot({
      accountName: 'testbot',
      password: 'testpassword',
      sharedSecret: 'shared'
    });

    const success = await bot.initialize();

    expect(success).toBe(true);
    expect(bot.community.login).toHaveBeenCalled();
    expect(sessionService.saveSession).toHaveBeenCalledWith('testbot', expect.any(Array), undefined);
    expect(bot.isReady).toBe(true);
  });

  test('should restore session if valid session exists in Redis', async () => {
    const { sessionService } = require('../../src/services/bot-session.service');
    sessionService.getSession.mockResolvedValue({
      cookies: ['cookie1'],
      savedAt: new Date().toISOString()
    });

    const bot = new SteamBot({ accountName: 'testbot' });
    const success = await bot.initialize();

    expect(success).toBe(true);
    expect(bot.community.login).not.toHaveBeenCalled();
    expect(bot.manager.setCookies).toHaveBeenCalled();
    expect(bot.isReady).toBe(true);
  });

  test('should handle login failure gracefully', async () => {
    const { sessionService } = require('../../src/services/bot-session.service');
    sessionService.getSession.mockResolvedValue(null);

    const bot = new SteamBot({ accountName: 'testbot', password: 'wrong' });
    
    // Silence EventEmitter warning for unhandled 'error'
    bot.on('error', () => {});
    
    bot.community.login.mockImplementation((opt, cb) => cb(new Error('Invalid password')));

    const success = await bot.initialize();
    expect(success).toBe(false);
    expect(bot.isReady).toBe(false);
  });
});