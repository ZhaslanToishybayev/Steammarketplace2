// Mock dependencies
jest.mock('../../../models/User');
jest.mock('../../../models/MarketListing');

const SteamBotManager = require('../../../services/steamBotManager');
const BOT_MANAGER_CONFIG = require('../../../services/steamBotManager').BOT_MANAGER_CONFIG;

describe('SteamBotManager', () => {
  let botManager;

  beforeEach(() => {
    botManager = new SteamBotManager();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    test('should initialize with default values', () => {
      expect(botManager.bots).toBeInstanceOf(Map);
      expect(botManager.activeBots).toEqual([]);
      expect(botManager.tradeQueue).toEqual([]);
      expect(botManager.isProcessingTrades).toBe(false);
      expect(botManager.maxQueueSize).toBe(BOT_MANAGER_CONFIG.MAX_QUEUE_SIZE);
      expect(botManager.retryAttempts).toBe(BOT_MANAGER_CONFIG.RETRY_ATTEMPTS);
    });
  });

  describe('getAvailableBot', () => {
    test('should return null when no active bots', () => {
      const bot = botManager.getAvailableBot();
      expect(bot).toBeNull();
    });

    test('should return least busy bot when bots available', () => {
      // Mock bots with different trade counts
      const mockBot1 = { currentTrades: 2 };
      const mockBot2 = { currentTrades: 1 };
      const mockBot3 = { currentTrades: 3 };

      botManager.activeBots = [mockBot1, mockBot2, mockBot3];

      const availableBot = botManager.getAvailableBot();
      expect(availableBot).toBe(mockBot2);
      expect(availableBot.currentTrades).toBe(1);
    });

    test('should return null when all bots are at max capacity', () => {
      const mockBot1 = { currentTrades: 10 };
      const mockBot2 = { currentTrades: 10 };

      botManager.activeBots = [mockBot1, mockBot2];
      botManager.maxQueueSize = 10;

      const availableBot = botManager.getAvailableBot();
      expect(availableBot).toBeNull();
    });
  });

  describe('queueTrade', () => {
    test('should add trade to queue', () => {
      const mockTrade = {
        id: 'test-trade-1',
        assetId: 'test-asset',
        userId: 'test-user',
        price: 100
      };

      botManager.queueTrade(mockTrade);

      expect(botManager.tradeQueue).toHaveLength(1);
      expect(botManager.tradeQueue[0]).toBe(mockTrade);
    });

    test('should reject trade when queue is full', () => {
      // Fill the queue to max
      for (let i = 0; i < BOT_MANAGER_CONFIG.MAX_QUEUE_SIZE; i++) {
        botManager.tradeQueue.push({ id: `trade-${i}` });
      }

      const newTrade = { id: 'overflow-trade' };

      expect(() => {
        botManager.queueTrade(newTrade);
      }).toThrow('Trade queue is full');
    });
  });

  describe('refreshInventories', () => {
    test('should refresh all bot inventories', async () => {
      // Mock bots with loadInventory method
      const mockBot1 = { loadInventory: jest.fn().mockResolvedValue(true) };
      const mockBot2 = { loadInventory: jest.fn().mockResolvedValue(true) };

      botManager.activeBots = [mockBot1, mockBot2];

      await botManager.refreshInventories();

      expect(mockBot1.loadInventory).toHaveBeenCalledTimes(1);
      expect(mockBot2.loadInventory).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during inventory refresh', async () => {
      const mockBot1 = { loadInventory: jest.fn().mockRejectedValue(new Error('Load failed')) };
      const mockBot2 = { loadInventory: jest.fn().mockResolvedValue(true) };

      botManager.activeBots = [mockBot1, mockBot2];

      // Should not throw, just log error
      await expect(botManager.refreshInventories()).resolves.not.toThrow();
      expect(mockBot2.loadInventory).toHaveBeenCalledTimes(1);
    });
  });

  describe('startTradeProcessor', () => {
    test('should start trade processor', () => {
      botManager.processTradeQueue = jest.fn();
      jest.useFakeTimers();

      botManager.startTradeProcessor();

      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        BOT_MANAGER_CONFIG.TRADE_POLL_INTERVAL
      );

      jest.useRealTimers();
    });
  });
});
