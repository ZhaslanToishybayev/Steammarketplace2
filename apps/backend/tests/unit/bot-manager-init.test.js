const { BotManager } = require('../../src/services/bot-manager.service');

// Mock SteamBot
jest.mock('../../src/services/steam-bot.service', () => {
  const EventEmitter = require('events');
  return jest.fn().mockImplementation((config) => {
    const emitter = new EventEmitter();
    // @ts-ignore
    emitter.config = config;
    // @ts-ignore
    emitter.initialize = jest.fn();
    // @ts-ignore
    emitter.logout = jest.fn();
    // @ts-ignore
    emitter.sendTradeOffer = jest.fn();
    // @ts-ignore
    emitter.isReady = false;
    // @ts-ignore
    emitter.isOnline = false;
    // @ts-ignore
    emitter.activeTrades = 0;
    // @ts-ignore
    emitter.inventoryCount = 0;
    // @ts-ignore
    emitter.getStatus = jest.fn().mockReturnValue({ accountName: config.accountName, status: 'offline' });
    return emitter;
  });
});

// Mock scam protection
jest.mock('../../src/services/scam-protection.service', () => ({
  preTradeCheck: jest.fn()
}));

describe('BotManager', () => {
  let manager;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    manager = new BotManager();
  });

  afterEach(() => {
    manager.stopAll();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('Initialization', () => {
    test('should add a bot correctly', () => {
      const config = { accountName: 'bot1', password: 'password' };
      const bot = manager.addBot(config);
      expect(manager.bots.size).toBe(1);
      expect(manager.getBot('bot1')).toBe(bot);
    });

    test('should remove a bot correctly', () => {
      manager.addBot({ accountName: 'bot1' });
      manager.removeBot('bot1');
      expect(manager.bots.size).toBe(0);
    });

    test('should start all bots and report results', async () => {
      const config1 = { accountName: 'bot1' };
      const config2 = { accountName: 'bot2' };
      const bot1 = manager.addBot(config1);
      const bot2 = manager.addBot(config2);

      // @ts-ignore
      bot1.initialize.mockResolvedValue(true);
      // @ts-ignore
      bot2.initialize.mockRejectedValue(new Error('Login failed'));

      const results = await manager.startAll();

      expect(results).toHaveLength(2);
      expect(manager.isRunning).toBe(true);
    });
  });

  describe('Load Balancing', () => {
    test('should select the best bot based on active trades and inventory', () => {
      const bot1 = manager.addBot({ accountName: 'bot1' });
      const bot2 = manager.addBot({ accountName: 'bot2' });

      // @ts-ignore
      bot1.isReady = bot1.isOnline = true;
      // @ts-ignore
      bot1.activeTrades = 5; bot1.inventoryCount = 100;

      // @ts-ignore
      bot2.isReady = bot2.isOnline = true;
      // @ts-ignore
      bot2.activeTrades = 2; bot2.inventoryCount = 500;

      expect(manager.getAvailableBot()).toBe(bot2);
    });

    test('should return null if no bots are ready', () => {
      manager.addBot({ accountName: 'bot1' });
      expect(manager.getAvailableBot()).toBeNull();
    });

    test('should return null if bots are full', () => {
      const bot = manager.addBot({ accountName: 'bot1' });
      // @ts-ignore
      bot.isReady = bot.isOnline = true;
      // @ts-ignore
      bot.inventoryCount = 960;
      expect(manager.getAvailableBot()).toBeNull();
    });
  });

  describe('Trade Offers', () => {
    test('should send trade offer via available bot', async () => {
      const bot = manager.addBot({ accountName: 'bot1' });
      // @ts-ignore
      bot.isReady = bot.isOnline = true;
      // @ts-ignore
      bot.sendTradeOffer.mockResolvedValue('offer_123');

      const result = await manager.sendTradeOffer({ tradeUrl: 'url' });
      expect(result.offerId).toBe('offer_123');
      expect(result.bot).toBe(bot);
    });

    test('should check scam protection before sending offer', async () => {
      const scamProtection = require('../../src/services/scam-protection.service');
      scamProtection.preTradeCheck.mockResolvedValue({ passed: false, reason: 'Scam suspected' });

      const bot = manager.addBot({ accountName: 'bot1' });
      // @ts-ignore
      bot.isReady = bot.isOnline = true;

      await expect(manager.sendTradeOffer({ 
        tradeUrl: 'url', 
        itemsToReceive: [{ assetId: '1' }],
        sellerSteamId: '7656...' 
      })).rejects.toThrow('Trade blocked: Scam suspected');
    });
  });

  describe('Health Checks', () => {
    test('should trigger re-initialization for offline bots during health check', async () => {
      const bot = manager.addBot({ accountName: 'bot1' });
      // @ts-ignore
      bot.isOnline = false;
      
      // @ts-ignore
      await manager._performHealthCheck();
      expect(bot.initialize).toHaveBeenCalled();
    });
  });
});