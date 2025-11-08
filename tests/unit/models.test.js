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
});