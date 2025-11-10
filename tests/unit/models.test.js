/**
 * Unit тесты для Mongoose моделей
 */

const mongoose = require('mongoose');

describe('Models', () => {
  describe('User Model', () => {
    test('должен создать пользователя с валидными данными', () => {
      const User = require('../../models/User');

      const validUser = new User({
        steamId: '76561198782060203',
        steamName: 'TestUser',
        username: 'TestUser',
        steamAccessToken: 'valid_token',
        steamRefreshToken: 'valid_refresh_token'
      });

      expect(validUser.steamId).toBe('76561198782060203');
      expect(validUser.steamName).toBe('TestUser');
      expect(validUser.steamAccessToken).toBe('valid_token');
    });

    test('должен требовать steamId', () => {
      const User = require('../../models/User');

      const user = new User({
        steamName: 'TestUser'
      });

      const error = user.validateSync();
      expect(error.errors.steamId).toBeDefined();
    });

    test('должен иметь правильные поля по умолчанию', () => {
      const User = require('../../models/User');

      const user = new User({
        steamId: '76561198782060203',
        steamName: 'TestUser'
      });

      expect(user.isAdmin).toBe(false);
      expect(user.isBanned).toBe(false);
      expect(user.wallet.balance).toBe(0);
      expect(user.wallet.pendingBalance).toBe(0);
    });
  });

  describe('TradeOffer Model', () => {
    test('должен создать trade offer с валидными данными', () => {
      const TradeOffer = require('../../models/TradeOffer');

      const validOffer = new TradeOffer({
        offerId: '1234567890',
        steamId: '76561198782060203',
        botId: 'bot_1',
        itemsGiven: ['asset_1', 'asset_2'],
        itemsReceived: ['asset_3'],
        message: 'Test trade',
        status: 'sent'
      });

      expect(validOffer.offerId).toBe('1234567890');
      expect(validOffer.steamId).toBe('76561198782060203');
      expect(validOffer.itemsGiven).toHaveLength(2);
      expect(validOffer.itemsReceived).toHaveLength(1);
      expect(validOffer.status).toBe('sent');
    });

    test('должен требовать offerId', () => {
      const TradeOffer = require('../../models/TradeOffer');

      const offer = new TradeOffer({
        steamId: '76561198782060203',
        itemsGiven: ['asset_1']
      });

      const error = offer.validateSync();
      expect(error.errors.offerId).toBeDefined();
    });

    test('должен требовать steamId', () => {
      const TradeOffer = require('../../models/TradeOffer');

      const offer = new TradeOffer({
        offerId: '1234567890',
        itemsGiven: ['asset_1']
      });

      const error = offer.validateSync();
      expect(error.errors.steamId).toBeDefined();
    });

    test('должен иметь статус по умолчанию', () => {
      const TradeOffer = require('../../models/TradeOffer');

      const offer = new TradeOffer({
        offerId: '1234567890',
        steamId: '76561198782060203',
        itemsGiven: ['asset_1']
      });

      expect(offer.status).toBe('created');
    });

    test('должен иметь правильные типы массивов', () => {
      const TradeOffer = require('../../models/TradeOffer');

      const offer = new TradeOffer({
        offerId: '1234567890',
        steamId: '76561198782060203',
        itemsGiven: ['asset_1'],
        itemsReceived: ['asset_2']
      });

      expect(Array.isArray(offer.itemsGiven)).toBe(true);
      expect(Array.isArray(offer.itemsReceived)).toBe(true);
    });

    test('должен иметь индексы', () => {
      const TradeOffer = require('../../models/TradeOffer');
      const indexes = TradeOffer.schema.indexes();

      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([['offerId', 1]]),
          expect.arrayContaining([['steamId', 1]]),
          expect.arrayContaining([['status', 1]])
        ])
      );
    });
  });

  describe('AuditLog Model', () => {
    test('должен создать audit log с валидными данными', () => {
      const AuditLog = require('../../models/AuditLog');

      const log = new AuditLog({
        userId: '507f1f77bcf86cd799439011',
        action: 'TRADE_CREATED',
        details: {
          offerId: '1234567890',
          itemsCount: 2
        },
        ip: '127.0.0.1'
      });

      expect(log.userId).toBe('507f1f77bcf86cd799439011');
      expect(log.action).toBe('TRADE_CREATED');
      expect(log.details.offerId).toBe('1234567890');
    });

    test('должен иметь timestamp по умолчанию', () => {
      const AuditLog = require('../../models/AuditLog');

      const log = new AuditLog({
        userId: '507f1f77bcf86cd799439011',
        action: 'TEST_ACTION'
      });

      expect(log.createdAt).toBeDefined();
    });
  });

  describe('Notification Model', () => {
    test('должен создать уведомление с валидными данными', () => {
      const Notification = require('../../models/Notification');

      const notification = new Notification({
        userId: '507f1f77bcf86cd799439011',
        type: 'TRADE_STATUS',
        title: 'Trade Updated',
        message: 'Your trade offer has been updated',
        data: {
          offerId: '1234567890',
          newStatus: 'accepted'
        },
        read: false
      });

      expect(notification.userId).toBe('507f1f77bcf86cd799439011');
      expect(notification.type).toBe('TRADE_STATUS');
      expect(notification.read).toBe(false);
    });

    test('должен иметь read по умолчанию false', () => {
      const Notification = require('../../models/Notification');

      const notification = new Notification({
        userId: '507f1f77bcf86cd799439011',
        type: 'TEST',
        title: 'Test',
        message: 'Test message'
      });

      expect(notification.read).toBe(false);
    });
  });

  describe('SecurityEvent Model', () => {
    test('должен создать security event с валидными данными', () => {
      const SecurityEvent = require('../../models/SecurityEvent');

      const event = new SecurityEvent({
        userId: '507f1f77bcf86cd799439011',
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'medium',
        description: 'Multiple failed login attempts',
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
        metadata: {
          attempts: 5
        }
      });

      expect(event.userId).toBe('507f1f77bcf86cd799439011');
      expect(event.type).toBe('SUSPICIOUS_ACTIVITY');
      expect(event.severity).toBe('medium');
    });

    test('должен иметь severity по умолчанию low', () => {
      const SecurityEvent = require('../../models/SecurityEvent');

      const event = new SecurityEvent({
        userId: '507f1f77bcf86cd799439011',
        type: 'TEST',
        description: 'Test event'
      });

      expect(event.severity).toBe('low');
    });
  });

  describe('Session Model', () => {
    test('должен создать сессию с валидными данными', () => {
      const Session = require('../../models/Session');

      const session = new Session({
        sessionId: 'sess_12345',
        userId: '507f1f77bcf86cd799439011',
        steamId: '76561198782060203',
        ip: '127.0.0.1',
        userAgent: 'Test Agent',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      });

      expect(session.sessionId).toBe('sess_12345');
      expect(session.userId).toBe('507f1f77bcf86cd799439011');
      expect(session.steamId).toBe('76561198782060203');
    });

    test('должен иметь активный статус по умолчанию', () => {
      const Session = require('../../models/Session');

      const session = new Session({
        sessionId: 'sess_12345',
        userId: '507f1f77bcf86cd799439011'
      });

      expect(session.status).toBe('active');
    });
  });

  describe('RateLimit Model', () => {
    test('должен создать rate limit запись', () => {
      const RateLimit = require('../../models/RateLimit');

      const rateLimit = new RateLimit({
        key: '127.0.0.1',
        count: 50,
        resetTime: new Date()
      });

      expect(rateLimit.key).toBe('127.0.0.1');
      expect(rateLimit.count).toBe(50);
    });
  });

  describe('MarketListing Model', () => {
    test('должен создать market listing с валидными данными', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          instanceId: '0',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)',
          iconUrl: 'https://example.com/icon.jpg',
          exterior: 'Field-Tested',
          rarity: 'Classified',
          type: 'Rifle',
          weapon: 'AK-47',
          skin: 'Redline',
          stattrak: false,
          souvenir: false,
          float: 0.25,
          inspectUrl: 'https://example.com/inspect'
        },
        price: 15.99,
        currency: 'USD',
        status: 'active',
        views: 0,
        featured: false,
        autoAccept: false,
        description: 'Beautiful skin',
        tags: ['rifle', 'redline', 'cs2']
      });

      expect(listing.seller).toBe('507f1f77bcf86cd799439011');
      expect(listing.item.name).toBe('AK-47 | Redline');
      expect(listing.price).toBe(15.99);
      expect(listing.status).toBe('active');
    });

    test('должен требовать seller', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99
      });

      const error = listing.validateSync();
      expect(error.errors.seller).toBeDefined();
    });

    test('должен требовать item.assetId', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99
      });

      const error = listing.validateSync();
      expect(error.errors['item.assetId']).toBeDefined();
    });

    test('должен требовать price', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        }
      });

      const error = listing.validateSync();
      expect(error.errors.price).toBeDefined();
    });

    test('должен валидировать минимальную цену', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 0
      });

      const error = listing.validateSync();
      expect(error.errors.price).toBeDefined();
    });

    test('должен иметь статус по умолчанию active', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99
      });

      expect(listing.status).toBe('active');
    });

    test('должен иметь правильные статусы', () => {
      const MarketListing = require('../../models/MarketListing');

      const validStatuses = ['active', 'sold', 'cancelled', 'pending_trade'];
      const invalidStatuses = ['invalid', 'pending', 'completed'];

      validStatuses.forEach(status => {
        const listing = new MarketListing({
          seller: '507f1f77bcf86cd799439011',
          item: {
            assetId: '1234567890',
            classId: '730_1',
            name: 'AK-47 | Redline',
            marketName: 'AK-47 | Redline (Field-Tested)'
          },
          price: 15.99,
          status
        });

        const error = listing.validateSync();
        expect(error).toBeUndefined();
      });

      invalidStatuses.forEach(status => {
        const listing = new MarketListing({
          seller: '507f1f77bcf86cd799439011',
          item: {
            assetId: '1234567890',
            classId: '730_1',
            name: 'AK-47 | Redline',
            marketName: 'AK-47 | Redline (Field-Tested)'
          },
          price: 15.99,
          status
        });

        const error = listing.validateSync();
        expect(error).toBeDefined();
      });
    });

    test('должен иметь правильные валюты', () => {
      const MarketListing = require('../../models/MarketListing');

      const validCurrencies = ['USD', 'EUR', 'GBP'];

      validCurrencies.forEach(currency => {
        const listing = new MarketListing({
          seller: '507f1f77bcf86cd799439011',
          item: {
            assetId: '1234567890',
            classId: '730_1',
            name: 'AK-47 | Redline',
            marketName: 'AK-47 | Redline (Field-Tested)'
          },
          price: 15.99,
          currency
        });

        const error = listing.validateSync();
        expect(error).toBeUndefined();
      });
    });

    test('должен иметь virtual condition', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)',
          exterior: 'Field-Tested'
        },
        price: 15.99
      });

      expect(listing.condition).toBe('Field-Tested');
    });

    test('должен вычислять condition по float', () => {
      const MarketListing = require('../../models/MarketListing');

      const testCases = [
        { float: 0.05, expected: 'Factory New' },
        { float: 0.10, expected: 'Minimal Wear' },
        { float: 0.20, expected: 'Field-Tested' },
        { float: 0.40, expected: 'Well-Worn' },
        { float: 0.50, expected: 'Battle-Scarred' }
      ];

      testCases.forEach(({ float, expected }) => {
        const listing = new MarketListing({
          seller: '507f1f77bcf86cd799439011',
          item: {
            assetId: '1234567890',
            classId: '730_1',
            name: 'AK-47 | Redline',
            marketName: 'AK-47 | Redline (Field-Tested)',
            float
          },
          price: 15.99
        });

        expect(listing.condition).toBe(expected);
      });
    });

    test('должен возвращать Unknown для неизвестной condition', () => {
      const MarketListing = require('../../models/MarketListing');

      const listing = new MarketListing({
        seller: '507f1f77bcf86cd799439011',
        item: {
          assetId: '1234567890',
          classId: '730_1',
          name: 'AK-47 | Redline',
          marketName: 'AK-47 | Redline (Field-Tested)'
        },
        price: 15.99
      });

      expect(listing.condition).toBe('Unknown');
    });

    test('должен иметь индексы', () => {
      const MarketListing = require('../../models/MarketListing');
      const indexes = MarketListing.schema.indexes();

      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([['status', 1], ['price', 1]]),
          expect.arrayContaining([['seller', 1], ['status', 1]]),
          expect.arrayContaining([['expiresAt', 1]])
        ])
      );
    });
  });

  describe('Transaction Model', () => {
    test('должен создать транзакцию с валидными данными', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        user: '507f1f77bcf86cd799439011',
        amount: 15.99,
        currency: 'USD',
        status: 'completed',
        stripePaymentIntentId: 'pi_1234567890',
        marketListing: '507f1f77bcf86cd799439012',
        description: 'Purchase of AK-47 | Redline',
        metadata: new Map([
          ['itemName', 'AK-47 | Redline'],
          ['seller', 'User123']
        ])
      });

      expect(transaction.type).toBe('purchase');
      expect(transaction.amount).toBe(15.99);
      expect(transaction.status).toBe('completed');
    });

    test('должен требовать type', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        user: '507f1f77bcf86cd799439011',
        amount: 15.99
      });

      const error = transaction.validateSync();
      expect(error.errors.type).toBeDefined();
    });

    test('должен требовать user', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        amount: 15.99
      });

      const error = transaction.validateSync();
      expect(error.errors.user).toBeDefined();
    });

    test('должен требовать amount', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        user: '507f1f77bcf86cd799439011'
      });

      const error = transaction.validateSync();
      expect(error.errors.amount).toBeDefined();
    });

    test('должен иметь статус по умолчанию pending', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        user: '507f1f77bcf86cd799439011',
        amount: 15.99
      });

      expect(transaction.status).toBe('pending');
    });

    test('должен иметь валюту по умолчанию USD', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        user: '507f1f77bcf86cd799439011',
        amount: 15.99
      });

      expect(transaction.currency).toBe('USD');
    });

    test('должен валидировать типы транзакций', () => {
      const Transaction = require('../../models/Transaction');

      const validTypes = ['deposit', 'withdrawal', 'purchase', 'sale', 'fee'];
      const invalidTypes = ['transfer', 'refund', 'bonus'];

      validTypes.forEach(type => {
        const transaction = new Transaction({
          type,
          user: '507f1f77bcf86cd799439011',
          amount: 15.99
        });

        const error = transaction.validateSync();
        expect(error).toBeUndefined();
      });

      invalidTypes.forEach(type => {
        const transaction = new Transaction({
          type,
          user: '507f1f77bcf86cd799439011',
          amount: 15.99
        });

        const error = transaction.validateSync();
        expect(error).toBeDefined();
      });
    });

    test('должен валидировать статусы', () => {
      const Transaction = require('../../models/Transaction');

      const validStatuses = ['pending', 'completed', 'failed', 'cancelled'];
      const invalidStatuses = ['processing', 'refunded', 'active'];

      validStatuses.forEach(status => {
        const transaction = new Transaction({
          type: 'purchase',
          user: '507f1f77bcf86cd799439011',
          amount: 15.99,
          status
        });

        const error = transaction.validateSync();
        expect(error).toBeUndefined();
      });

      invalidStatuses.forEach(status => {
        const transaction = new Transaction({
          type: 'purchase',
          user: '507f1f77bcf86cd799439011',
          amount: 15.99,
          status
        });

        const error = transaction.validateSync();
        expect(error).toBeDefined();
      });
    });

    test('должен валидировать валюты', () => {
      const Transaction = require('../../models/Transaction');

      const validCurrencies = ['USD', 'EUR', 'GBP'];
      const invalidCurrencies = ['RUB', 'BTC', 'USDT'];

      validCurrencies.forEach(currency => {
        const transaction = new Transaction({
          type: 'purchase',
          user: '507f1f77bcf86cd799439011',
          amount: 15.99,
          currency
        });

        const error = transaction.validateSync();
        expect(error).toBeUndefined();
      });

      invalidCurrencies.forEach(currency => {
        const transaction = new Transaction({
          type: 'purchase',
          user: '507f1f77bcf86cd799439011',
          amount: 15.99,
          currency
        });

        const error = transaction.validateSync();
        expect(error).toBeDefined();
      });
    });

    test('должен поддерживать metadata как Map', () => {
      const Transaction = require('../../models/Transaction');

      const transaction = new Transaction({
        type: 'purchase',
        user: '507f1f77bcf86cd799439011',
        amount: 15.99,
        metadata: new Map([
          ['key1', 'value1'],
          ['key2', 'value2']
        ])
      });

      expect(transaction.metadata).toBeInstanceOf(Map);
      expect(transaction.metadata.get('key1')).toBe('value1');
    });

    test('должен иметь правильные индексы', () => {
      const Transaction = require('../../models/Transaction');
      const indexes = Transaction.schema.indexes();

      expect(indexes).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([['user', 1], ['createdAt', -1]]),
          expect.arrayContaining([['status', 1], ['type', 1]])
        ])
      );
    });
  });
});