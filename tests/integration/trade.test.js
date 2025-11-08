/**
 * Integration тесты для trade системы
 */

const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');

// Мокаем внешние зависимости
jest.mock('axios');
jest.mock('steam-session');
jest.mock('steam-user');
jest.mock('steam-tradeoffer-manager');
jest.mock('socket.io');

// Импортируем после моков
const User = require('../../models/User');
const TradeOffer = require('../../models/TradeOffer');
const tradeRoutes = require('../../routes/trade');

describe('Trade Integration Tests', () => {
  let app;
  let mockUser;
  let authToken;

  beforeAll(async () => {
    // Подключение к тестовой БД
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';
    await mongoose.connect(MOCKDB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    app = express();
    app.use(express.json());

    // Создаем тестового пользователя
    mockUser = await User.create({
      steamId: '76561198782060203',
      steamName: 'TestUser',
      username: 'TestUser',
      steamAccessToken: 'test_token',
      steamRefreshToken: 'test_refresh_token',
      isAdmin: false,
      isBanned: false,
      wallet: { balance: 0, pendingBalance: 0 }
    });

    // Создаем JWT токен
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { id: mockUser._id, steamId: mockUser.steamId },
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '24h' }
    );

    // Middleware аутентификации
    app.use((req, res, next) => {
      if (req.headers.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
          req.user = { id: decoded.id, steamId: decoded.steamId };
        } catch (err) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
      next();
    });

    // Добавляем mock для steamBotManager и io
    app.use((req, res, next) => {
      req.steamBotManager = {
        getBotForUser: jest.fn().mockReturnValue({
          makeOffer: jest.fn().mockImplementation((options, callback) => {
            callback(null, { id: '1234567890' });
          })
        }),
        getBotById: jest.fn().mockReturnValue({
          getOffer: jest.fn().mockReturnValue({
            accept: jest.fn().mockImplementation((callback) => callback(null, 'success')),
            decline: jest.fn().mockImplementation((callback) => callback(null)),
            cancel: jest.fn().mockImplementation((callback) => callback(null))
          })
        })
      };
      req.io = { emit: jest.fn() };
      next();
    });

    app.use('/api/trade', tradeRoutes);
  });

  afterAll(async () => {
    // Очистка БД
    await User.deleteMany({});
    await TradeOffer.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Очистка коллекции trade offers перед каждым тестом
    await TradeOffer.deleteMany({});
    jest.clearAllMocks();
  });

  describe('POST /api/trade/create - Integration', () => {
    test('должен создать trade offer и сохранить в БД', async () => {
      const tradeData = {
        myAssetIds: ['12345', '67890'],
        theirAssetIds: ['11111'],
        message: 'Integration test trade'
      };

      const response = await request(app)
        .post('/api/trade/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tradeData)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            offerId: '1234567890'
          })
        })
      );

      // Проверяем что запись создана в БД
      const savedOffer = await TradeOffer.findOne({ offerId: '1234567890' });
      expect(savedOffer).toBeDefined();
      expect(savedOffer.steamId).toBe(mockUser.steamId);
      expect(savedOffer.itemsGiven).toEqual(tradeData.myAssetIds);
      expect(savedOffer.itemsReceived).toEqual(tradeData.theirAssetIds);
      expect(savedOffer.message).toBe(tradeData.message);
      expect(savedOffer.status).toBe('sent');
    });

    test('должен валидировать данные перед созданием', async () => {
      const invalidData = {
        myAssetIds: ['invalid_id'],
        theirAssetIds: []
      };

      const response = await request(app)
        .post('/api/trade/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    test('должен требовать аутентификацию', async () => {
      const tradeData = {
        myAssetIds: ['12345'],
        theirAssetIds: []
      };

      const response = await request(app)
        .post('/api/trade/create')
        .send(tradeData)
        .expect(401);

      expect(response.body.error).toBe('Access token required');
    });
  });

  describe('POST /api/trade/accept/:offerId - Integration', () => {
    test('должен принять trade offer', async () => {
      // Создаем тестовый offer
      const offer = await TradeOffer.create({
        offerId: '1234567890',
        steamId: mockUser.steamId,
        itemsGiven: ['12345'],
        itemsReceived: ['11111'],
        status: 'sent',
        createdAt: new Date()
      });

      const response = await request(app)
        .post(`/api/trade/accept/${offer.offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true
        })
      );

      // Проверяем что статус обновлен в БД
      const updatedOffer = await TradeOffer.findOne({ offerId: offer.offerId });
      expect(updatedOffer.status).toBe('accepted');
    });

    test('должен отклонить несуществующий offer', async () => {
      const response = await request(app)
        .post('/api/trade/accept/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/trade/history - Integration', () => {
    test('должен вернуть историю trade offers', async () => {
      // Создаем тестовые offers
      await TradeOffer.create([
        {
          offerId: '1',
          steamId: mockUser.steamId,
          itemsGiven: ['asset1'],
          status: 'accepted',
          createdAt: new Date(Date.now() - 10000)
        },
        {
          offerId: '2',
          steamId: mockUser.steamId,
          itemsGiven: ['asset2'],
          status: 'sent',
          createdAt: new Date(Date.now() - 5000)
        },
        {
          offerId: '3',
          steamId: 'other_user',
          itemsGiven: ['asset3'],
          status: 'sent',
          createdAt: new Date()
        }
      ]);

      const response = await request(app)
        .get('/api/trade/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ offerId: '1' }),
            expect.objectContaining({ offerId: '2' })
          ])
        })
      );

      // Проверяем что загружены только offers текущего пользователя
      const offers = response.body.data;
      offers.forEach(offer => {
        expect(offer.steamId).toBe(mockUser.steamId);
      });
    });
  });

  describe('GET /api/trade/:offerId - Integration', () => {
    test('должен вернуть конкретный offer', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1'],
        itemsReceived: ['asset2'],
        status: 'sent'
      });

      const response = await request(app)
        .get(`/api/trade/${offer.offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            offerId: '12345',
            steamId: mockUser.steamId
          })
        })
      );
    });

    test('должен вернуть 404 для несуществующего offer', async () => {
      const response = await request(app)
        .get('/api/trade/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/trade/cancel/:offerId - Integration', () => {
    test('должен отменить offer', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1'],
        status: 'sent'
      });

      const response = await request(app)
        .post(`/api/trade/cancel/${offer.offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true
        })
      );

      // Проверяем что статус обновлен
      const updatedOffer = await TradeOffer.findOne({ offerId: offer.offerId });
      expect(updatedOffer.status).toBe('cancelled');
    });

    test('должен отклонить отмену для принятого offer', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1'],
        status: 'accepted'
      });

      const response = await request(app)
        .post(`/api/trade/cancel/${offer.offerId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Cannot cancel');
    });
  });

  describe('Database Operations - Integration', () => {
    test('должен создавать записи с правильными индексами', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1']
      });

      // Проверяем уникальный индекс offerId
      await expect(
        TradeOffer.create({
          offerId: '12345', // Дубликат
          steamId: 'other_user',
          itemsGiven: ['asset2']
        })
      ).rejects.toThrow();

      // Проверяем что первый документ существует
      const found = await TradeOffer.findOne({ offerId: '12345' });
      expect(found).toBeDefined();
      expect(found.steamId).toBe(mockUser.steamId);
    });

    test('должен автоматически устанавливать createdAt и updatedAt', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1']
      });

      expect(offer.createdAt).toBeDefined();
      expect(offer.updatedAt).toBeDefined();
      expect(offer.createdAt).toBeInstanceOf(Date);
      expect(offer.updatedAt).toBeInstanceOf(Date);
    });

    test('должен обновлять updatedAt при изменении документа', async () => {
      const offer = await TradeOffer.create({
        offerId: '12345',
        steamId: mockUser.steamId,
        itemsGiven: ['asset1']
      });

      const originalUpdatedAt = offer.updatedAt;

      // Ждем немного
      await new Promise(resolve => setTimeout(resolve, 10));

      offer.status = 'accepted';
      await offer.save();

      expect(offer.updatedAt).not.toBe(originalUpdatedAt);
    });
  });
});