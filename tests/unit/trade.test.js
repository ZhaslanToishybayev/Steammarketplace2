/**
 * Unit тесты для trade routes
 */

const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');

// Мокаем внешние зависимости
jest.mock('axios');
jest.mock('../../services/steamBotManager');
jest.mock('../../services/tradeOfferService');
jest.mock('../../models/TradeOffer');
jest.mock('../../models/User', () => ({
  findById: jest.fn()
}));

const TradeOffer = require('../../models/TradeOffer');
const User = require('../../models/User');
const tradeOfferService = require('../../services/tradeOfferService');

const { authenticateToken } = require('../../middleware/auth');
const { validateTradeOffer, validateAssetIds } = require('../../middleware/validation');
const tradeRoutes = require('../../routes/trade');

describe('Trade Routes', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());

    // Мок пользователя
    mockUser = createMockUser();
    User.findById.mockResolvedValue(mockUser);

    // Аутентификация middleware
    app.use((req, res, next) => {
      req.user = { id: mockUser._id, steamId: mockUser.steamId };
      next();
    });

    app.use('/api/trade', tradeRoutes);
  });

  describe('POST /api/trade/create', () => {
    test('должен создать trade offer', async () => {
      const tradeData = {
        myAssetIds: ['12345', '67890'],
        theirAssetIds: ['11111'],
        message: 'Test trade offer'
      };

      const mockCreatedOffer = createMockTradeOffer({
        steamId: mockUser.steamId,
        itemsGiven: tradeData.myAssetIds,
        itemsReceived: tradeData.theirAssetIds,
        message: tradeData.message
      });

      tradeOfferService.createTradeOffer.mockResolvedValue(mockCreatedOffer);

      const response = await request(app)
        .post('/api/trade/create')
        .send(tradeData)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            offerId: mockCreatedOffer.offerId
          })
        })
      );

      expect(tradeOfferService.createTradeOffer).toHaveBeenCalledWith(
        mockUser.steamId,
        tradeData,
        req
      );
    });

    test('должен вернуть 400 при невалидных данных', async () => {
      const invalidData = {
        myAssetIds: ['invalid_id'],
        theirAssetIds: []
      };

      const response = await request(app)
        .post('/api/trade/create')
        .send(invalidData)
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false
        })
      );
    });

    test('должен вернуть 500 при ошибке сервиса', async () => {
      const tradeData = {
        myAssetIds: ['12345'],
        theirAssetIds: ['11111']
      };

      tradeOfferService.createTradeOffer.mockRejectedValue(
        new Error('Steam API error')
      );

      const response = await request(app)
        .post('/api/trade/create')
        .send(tradeData)
        .expect(500);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Failed to create trade offer'
        })
      );
    });
  });

  describe('POST /api/trade/accept/:offerId', () => {
    test('должен принять trade offer', async () => {
      const offerId = '1234567890';
      const mockOffer = createMockTradeOffer({ offerId });

      TradeOffer.findOne.mockResolvedValue(mockOffer);
      tradeOfferService.acceptTradeOffer.mockResolvedValue({
        success: true,
        newStatus: 'accepted'
      });

      const response = await request(app)
        .post(`/api/trade/accept/${offerId}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true
        })
      );

      expect(tradeOfferService.acceptTradeOffer).toHaveBeenCalledWith(
        offerId,
        mockUser.steamId
      );
    });

    test('должен вернуть 404 если offer не найден', async () => {
      TradeOffer.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/trade/accept/99999')
        .expect(404);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Trade offer not found'
        })
      );
    });

    test('должен вернуть 403 если пользователь не владелец', async () => {
      const otherUserOffer = createMockTradeOffer({
        steamId: '76561198782060204'
      });

      TradeOffer.findOne.mockResolvedValue(otherUserOffer);

      const response = await request(app)
        .post(`/api/trade/accept/${otherUserOffer.offerId}`)
        .expect(403);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Not authorized to accept this offer'
        })
      );
    });
  });

  describe('POST /api/trade/decline/:offerId', () => {
    test('должен отклонить trade offer', async () => {
      const offerId = '1234567890';
      const mockOffer = createMockTradeOffer({ offerId });

      TradeOffer.findOne.mockResolvedValue(mockOffer);
      tradeOfferService.declineTradeOffer.mockResolvedValue({
        success: true,
        newStatus: 'declined'
      });

      const response = await request(app)
        .post(`/api/trade/decline/${offerId}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });
  });

  describe('GET /api/trade/history', () => {
    test('должен вернуть историю trade offers', async () => {
      const mockOffers = [
        createMockTradeOffer({ offerId: '1' }),
        createMockTradeOffer({ offerId: '2' })
      ];

      TradeOffer.find.mockReturnValue({
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers)
      });

      const response = await request(app)
        .get('/api/trade/history')
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

      expect(TradeOffer.find).toHaveBeenCalledWith({
        steamId: mockUser.steamId
      });
    });
  });

  describe('GET /api/trade/:offerId', () => {
    test('должен вернуть конкретный offer', async () => {
      const mockOffer = createMockTradeOffer({ offerId: '12345' });
      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const response = await request(app)
        .get('/api/trade/12345')
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            offerId: '12345'
          })
        })
      );
    });

    test('должен вернуть 404 если offer не найден', async () => {
      TradeOffer.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/trade/99999')
        .expect(404);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Trade offer not found'
        })
      );
    });
  });

  describe('POST /api/trade/cancel/:offerId', () => {
    test('должен отменить offer', async () => {
      const offerId = '1234567890';
      const mockOffer = createMockTradeOffer({ offerId, status: 'sent' });

      TradeOffer.findOne.mockResolvedValue(mockOffer);
      tradeOfferService.cancelTradeOffer.mockResolvedValue({
        success: true,
        newStatus: 'cancelled'
      });

      const response = await request(app)
        .post(`/api/trade/cancel/${offerId}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: true
        })
      );
    });

    test('должен вернуть 400 если offer нельзя отменить', async () => {
      const mockOffer = createMockTradeOffer({
        offerId: '12345',
        status: 'accepted'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const response = await request(app)
        .post('/api/trade/cancel/12345')
        .expect(400);

      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Cannot cancel this offer'
        })
      );
    });
  });
});