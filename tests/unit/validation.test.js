/**
 * Unit тесты для validation middleware
 */

const { validateTradeOffer, validateAssetIds, validateTradeUrl } = require('../../middleware/validation');

describe('Validation Middleware', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = jest.fn();
  });

  describe('validateTradeOffer', () => {
    test('должен пропустить валидные данные', () => {
      mockRequest.body = {
        myAssetIds: ['12345', '67890'],
        theirAssetIds: ['11111'],
        message: 'Test trade offer'
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body).toBeDefined();
    });

    test('должен отклонить отсутствующие myAssetIds', () => {
      mockRequest.body = {
        theirAssetIds: ['11111'],
        message: 'Test'
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить слишком много предметов', () => {
      const manyAssets = Array(15).fill().map((_, i) => `asset${i}`);
      mockRequest.body = {
        myAssetIds: manyAssets
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить невалидные assetIds', () => {
      mockRequest.body = {
        myAssetIds: ['invalid_id']
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить слишком длинное сообщение', () => {
      const longMessage = 'x'.repeat(501);
      mockRequest.body = {
        myAssetIds: ['12345'],
        message: longMessage
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен принять пустые theirAssetIds', () => {
      mockRequest.body = {
        myAssetIds: ['12345']
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.body.theirAssetIds).toEqual([]);
    });

    test('должен принять пустое сообщение', () => {
      mockRequest.body = {
        myAssetIds: ['12345'],
        message: ''
      };

      validateTradeOffer(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateAssetIds', () => {
    test('должен пропустить валидные assetIds', () => {
      mockRequest.body = {
        assetIds: ['12345', '67890', '11111']
      };

      validateAssetIds(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('должен отклонить пустой массив', () => {
      mockRequest.body = {
        assetIds: []
      };

      validateAssetIds(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить отсутствующий массив', () => {
      mockRequest.body = {};

      validateAssetIds(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить невалидные assetIds', () => {
      mockRequest.body = {
        assetIds: ['abc', '123invalid']
      };

      validateAssetIds(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('validateTradeUrl', () => {
    test('должен пропустить валидный trade URL', () => {
      mockRequest.body = {
        tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=12345&token=abcdef'
      };

      validateTradeUrl(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('должен пропустить trade URL без токена', () => {
      mockRequest.body = {
        tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=12345'
      };

      validateTradeUrl(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('должен отклонить невалидный URL', () => {
      mockRequest.body = {
        tradeUrl: 'https://example.com/invalid'
      };

      validateTradeUrl(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid trade URL format'
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен отклонить отсутствующий tradeUrl', () => {
      mockRequest.body = {};

      validateTradeUrl(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
