// Mock dependencies
jest.mock('steam-user');
jest.mock('steam-tradeoffer-manager');
jest.mock('../../../services/steamIntegrationService');
jest.mock('../../../utils/logger');

const SteamBot = require('../../../services/steamBot');
const SteamBotConfig = require('../../../services/steamBot').INVENTORY_CONFIG;

describe('SteamBot', () => {
  let mockConfig;
  let mockBot;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig = {
      username: 'testbot',
      password: 'testpass',
      sharedSecret: 'testsecret',
      id: 1
    };
  });

  describe('INVENTORY_CONFIG', () => {
    test('should have correct configuration values', () => {
      expect(SteamBot.INVENTORY_CONFIG.MAX_RETRIES).toBe(5);
      expect(SteamBot.INVENTORY_CONFIG.RETRY_DELAY).toBe(10000);
      expect(SteamBot.INVENTORY_CONFIG.INITIAL_RETRY_DELAY).toBe(30000);
      expect(SteamBot.INVENTORY_CONFIG.TIMEOUT).toBe(30000);
    });
  });

  describe('constructor', () => {
    test('should initialize with config', () => {
      const bot = new SteamBot(mockConfig);

      expect(bot.id).toBe(1);
      expect(bot.username).toBe('testbot');
      expect(bot.password).toBe('testpass');
      expect(bot.sharedSecret).toBe('testsecret');
      expect(bot.isInitialized).toBe(false);
      expect(bot.isConnected).toBe(false);
      expect(bot.currentTrades).toBe(0);
      expect(bot.inventory).toEqual([]);
    });
  });

  describe('hasItem', () => {
    test('should return true when item exists', () => {
      const bot = new SteamBot(mockConfig);
      bot.inventory = [
        { assetid: 'asset1', id: 'asset1' },
        { assetid: 'asset2', id: 'asset2' }
      ];

      expect(bot.hasItem('asset1')).toBe(true);
      expect(bot.hasItem('asset2')).toBe(true);
    });

    test('should return false when item does not exist', () => {
      const bot = new SteamBot(mockConfig);
      bot.inventory = [
        { assetid: 'asset1', id: 'asset1' }
      ];

      expect(bot.hasItem('nonexistent')).toBe(false);
    });

    test('should handle empty inventory', () => {
      const bot = new SteamBot(mockConfig);
      bot.inventory = [];

      expect(bot.hasItem('any')).toBe(false);
    });
  });

  describe('getStatus', () => {
    test('should return correct status object', () => {
      const bot = new SteamBot(mockConfig);
      bot.isConnected = true;
      bot.isInitialized = true;
      bot.currentTrades = 5;
      bot.inventory = [1, 2, 3];

      const status = bot.getStatus();

      expect(status).toEqual({
        id: 1,
        username: 'testbot',
        isConnected: true,
        isInitialized: true,
        currentTrades: 5,
        inventoryCount: 3
      });
    });
  });

  describe('loadInventory', () => {
    test('should load inventory successfully', async () => {
      const bot = new SteamBot(mockConfig);
      const mockInventory = [
        { assetid: 'item1', name: 'AK-47 | Redline' },
        { assetid: 'item2', name: 'AWP | Dragon Lore' }
      ];

      bot.manager = {
        inventory: {
          getItems: () => mockInventory
        }
      };

      const inventory = await bot.loadInventory();

      expect(inventory).toEqual(mockInventory);
      expect(bot.inventory).toEqual(mockInventory);
    });

    test('should handle empty inventory', async () => {
      const bot = new SteamBot(mockConfig);

      bot.manager = {
        inventory: null
      };

      const inventory = await bot.loadInventory();

      expect(inventory).toEqual([]);
      expect(bot.inventory).toEqual([]);
    });
  });
});
