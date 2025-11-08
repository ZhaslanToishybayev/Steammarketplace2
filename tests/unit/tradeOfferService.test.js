/**
 * Unit тесты для tradeOfferService
 */

const TradeOffer = require('../../models/TradeOffer');
const tradeOfferService = require('../../services/tradeOfferService');

// Мокаем модель TradeOffer
jest.mock('../../models/TradeOffer');

describe('TradeOfferService', () => {
  let mockRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = {
      io: { emit: jest.fn() },
      steamBotManager: {
        getBotForUser: jest.fn(),
        getBotById: jest.fn()
      }
    };
  });

  describe('createTradeOffer', () => {
    test('должен создать trade offer', async () => {
      const steamId = '76561198782060203';
      const tradeData = {
        myAssetIds: ['12345', '67890'],
        theirAssetIds: ['11111'],
        message: 'Test trade offer'
      };

      const mockBot = {
        makeOffer: jest.fn().mockImplementation((options, callback) => {
          callback(null, { id: '1234567890' });
        })
      };

      mockRequest.steamBotManager.getBotForUser.mockReturnValue(mockBot);

      const mockSavedOffer = createMockTradeOffer({
        steamId,
        itemsGiven: tradeData.myAssetIds,
        itemsReceived: tradeData.theirAssetIds,
        message: tradeData.message
      });

      TradeOffer.mockImplementation(() => mockSavedOffer);
      mockSavedOffer.save.mockResolvedValue(mockSavedOffer);

      const result = await tradeOfferService.createTradeOffer(
        steamId,
        tradeData,
        mockRequest
      );

      expect(result).toEqual(
        expect.objectContaining({
          offerId: '1234567890'
        })
      );

      expect(mockRequest.io.emit).toHaveBeenCalledWith(
        'tradeOfferCreated',
        expect.objectContaining({
          offerId: '1234567890'
        })
      );

      expect(mockSavedOffer.save).toHaveBeenCalled();
    });

    test('должен обработать ошибку Steam API', async () => {
      const steamId = '76561198782060203';
      const tradeData = {
        myAssetIds: ['12345'],
        theirAssetIds: []
      };

      const mockBot = {
        makeOffer: jest.fn().mockImplementation((options, callback) => {
          callback(new Error('Steam API error'), null);
        })
      };

      mockRequest.steamBotManager.getBotForUser.mockReturnValue(mockBot);

      await expect(
        tradeOfferService.createTradeOffer(steamId, tradeData, mockRequest)
      ).rejects.toThrow('Steam API error');
    });

    test('должен обработать отсутствие бота', async () => {
      const steamId = '76561198782060203';
      const tradeData = {
        myAssetIds: ['12345'],
        theirAssetIds: []
      };

      mockRequest.steamBotManager.getBotForUser.mockReturnValue(null);

      await expect(
        tradeOfferService.createTradeOffer(steamId, tradeData, mockRequest)
      ).rejects.toThrow('No available bot for user');
    });

    test('должен обработать ошибку сохранения в БД', async () => {
      const steamId = '76561198782060203';
      const tradeData = {
        myAssetIds: ['12345'],
        theirAssetIds: []
      };

      const mockBot = {
        makeOffer: jest.fn().mockImplementation((options, callback) => {
          callback(null, { id: '1234567890' });
        })
      };

      mockRequest.steamBotManager.getBotForUser.mockReturnValue(mockBot);

      const mockSavedOffer = createMockTradeOffer({ steamId });
      TradeOffer.mockImplementation(() => mockSavedOffer);
      mockSavedOffer.save.mockRejectedValue(new Error('DB error'));

      await expect(
        tradeOfferService.createTradeOffer(steamId, tradeData, mockRequest)
      ).rejects.toThrow('DB error');
    });
  });

  describe('acceptTradeOffer', () => {
    test('должен принять trade offer', async () => {
      const offerId = '1234567890';
      const steamId = '76561198782060203';

      const mockOffer = createMockTradeOffer({
        offerId,
        steamId,
        status: 'sent'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const mockBot = {
        getOffer: jest.fn().mockReturnValue({
          accept: jest.fn().mockImplementation((err, result) => {
            callback(null, result);
          })
        })
      };

      mockRequest.steamBotManager.getBotById.mockReturnValue(mockBot);

      mockOffer.status = 'accepted';
      mockOffer.save = jest.fn().mockResolvedValue(mockOffer);

      const result = await tradeOfferService.acceptTradeOffer(
        offerId,
        steamId
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          newStatus: 'accepted'
        })
      );

      expect(mockOffer.status).toBe('accepted');
      expect(mockOffer.save).toHaveBeenCalled();
    });

    test('должен вернуть ошибку если offer не найден', async () => {
      TradeOffer.findOne.mockResolvedValue(null);

      await expect(
        tradeOfferService.acceptTradeOffer('99999', '12345')
      ).rejects.toThrow('Trade offer not found');
    });

    test('должен вернуть ошибку если offer не принадлежит пользователю', async () => {
      const mockOffer = createMockTradeOffer({
        offerId: '12345',
        steamId: '76561198782060204'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      await expect(
        tradeOfferService.acceptTradeOffer('12345', '76561198782060203')
      ).rejects.toThrow('Not authorized to accept this offer');
    });

    test('должен обработать ошибку при принятии', async () => {
      const mockOffer = createMockTradeOffer({
        offerId: '12345',
        steamId: '76561198782060203',
        status: 'sent'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const mockBot = {
        getOffer: jest.fn().mockReturnValue({
          accept: jest.fn().mockImplementation((err, result) => {
            err(new Error('Accept failed'));
          })
        })
      };

      mockRequest.steamBotManager.getBotById.mockReturnValue(mockBot);

      await expect(
        tradeOfferService.acceptTradeOffer('12345', '76561198782060203')
      ).rejects.toThrow('Accept failed');
    });
  });

  describe('declineTradeOffer', () => {
    test('должен отклонить trade offer', async () => {
      const offerId = '1234567890';
      const steamId = '76561198782060203';

      const mockOffer = createMockTradeOffer({
        offerId,
        steamId,
        status: 'sent'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const mockBot = {
        getOffer: jest.fn().mockReturnValue({
          decline: jest.fn().mockImplementation((callback) => {
            callback(null);
          })
        })
      };

      mockRequest.steamBotManager.getBotById.mockReturnValue(mockBot);

      mockOffer.status = 'declined';
      mockOffer.save = jest.fn().mockResolvedValue(mockOffer);

      const result = await tradeOfferService.declineTradeOffer(
        offerId,
        steamId
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          newStatus: 'declined'
        })
      );

      expect(mockOffer.status).toBe('declined');
      expect(mockOffer.save).toHaveBeenCalled();
    });
  });

  describe('cancelTradeOffer', () => {
    test('должен отменить trade offer', async () => {
      const offerId = '1234567890';
      const steamId = '76561198782060203';

      const mockOffer = createMockTradeOffer({
        offerId,
        steamId,
        status: 'sent'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const mockBot = {
        getOffer: jest.fn().mockReturnValue({
          cancel: jest.fn().mockImplementation((callback) => {
            callback(null);
          })
        })
      };

      mockRequest.steamBotManager.getBotById.mockReturnValue(mockBot);

      mockOffer.status = 'cancelled';
      mockOffer.save = jest.fn().mockResolvedValue(mockOffer);

      const result = await tradeOfferService.cancelTradeOffer(
        offerId,
        steamId
      );

      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          newStatus: 'cancelled'
        })
      );

      expect(mockOffer.status).toBe('cancelled');
      expect(mockOffer.save).toHaveBeenCalled();
    });

    test('должен отклонить отмену для принятых offer', async () => {
      const mockOffer = createMockTradeOffer({
        offerId: '12345',
        steamId: '76561198782060203',
        status: 'accepted'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      await expect(
        tradeOfferService.cancelTradeOffer('12345', '76561198782060203')
      ).rejects.toThrow('Cannot cancel offer with status: accepted');
    });
  });

  describe('updateOfferStatus', () => {
    test('должен обновить статус offer', async () => {
      const offerId = '1234567890';
      const newStatus = 'sent';

      const mockOffer = createMockTradeOffer({
        offerId,
        status: 'created'
      });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      mockOffer.status = newStatus;
      mockOffer.save = jest.fn().mockResolvedValue(mockOffer);

      const result = await tradeOfferService.updateOfferStatus(
        offerId,
        newStatus
      );

      expect(result).toEqual(mockOffer);
      expect(mockOffer.status).toBe(newStatus);
      expect(mockOffer.save).toHaveBeenCalled();
    });

    test('должен вернуть null если offer не найден', async () => {
      TradeOffer.findOne.mockResolvedValue(null);

      const result = await tradeOfferService.updateOfferStatus(
        '99999',
        'sent'
      );

      expect(result).toBeNull();
    });
  });

  describe('getTradeHistory', () => {
    test('должен вернуть историю trade offers', async () => {
      const steamId = '76561198782060203';
      const mockOffers = [
        createMockTradeOffer({ offerId: '1', steamId }),
        createMockTradeOffer({ offerId: '2', steamId })
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockOffers)
      };

      TradeOffer.find.mockReturnValue(mockQuery);

      const result = await tradeOfferService.getTradeHistory(steamId, 10);

      expect(result).toEqual(mockOffers);
      expect(TradeOffer.find).toHaveBeenCalledWith({ steamId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('getOffer', () => {
    test('должен вернуть конкретный offer', async () => {
      const offerId = '1234567890';
      const mockOffer = createMockTradeOffer({ offerId });

      TradeOffer.findOne.mockResolvedValue(mockOffer);

      const result = await tradeOfferService.getOffer(offerId);

      expect(result).toEqual(mockOffer);
      expect(TradeOffer.findOne).toHaveBeenCalledWith({ offerId });
    });

    test('должен вернуть null если offer не найден', async () => {
      TradeOffer.findOne.mockResolvedValue(null);

      const result = await tradeOfferService.getOffer('99999');

      expect(result).toBeNull();
    });
  });

  describe('getUserOffers', () => {
    test('должен вернуть все offer пользователя', async () => {
      const steamId = '76561198782060203';
      const mockOffers = [
        createMockTradeOffer({ steamId }),
        createMockTradeOffer({ steamId })
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockOffers)
      };

      TradeOffer.find.mockReturnValue(mockQuery);

      const result = await tradeOfferService.getUserOffers(steamId);

      expect(result).toEqual(mockOffers);
      expect(TradeOffer.find).toHaveBeenCalledWith({ steamId });
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });
});