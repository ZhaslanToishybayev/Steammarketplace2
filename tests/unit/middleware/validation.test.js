/**
 * Unit tests for validation middleware
 * Тестирует middleware валидации данных
 */

const Joi = require('joi');

// Mock Joi
jest.mock('joi');

describe('Validation Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {}
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('validateListing', () => {
    test('should pass validation with valid listing data', () => {
      // Setup
      req.body = {
        assetId: '1234567890',
        classId: '730_1',
        instanceId: '0',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        iconUrl: 'https://example.com/icon.jpg',
        price: 15.99,
        description: 'A beautiful skin',
        autoAccept: true
      };

      const { validateListing } = require('../../../middleware/validation');

      // Execute
      validateListing(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should fail validation with missing required fields', () => {
      // Setup
      req.body = {
        name: 'AK-47 | Redline'
      };

      const { validateListing } = require('../../../middleware/validation');

      // Execute
      validateListing(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid price', () => {
      // Setup
      req.body = {
        assetId: '1234567890',
        classId: '730_1',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        iconUrl: 'https://example.com/icon.jpg',
        price: 0, // Invalid: less than 0.01
        description: '',
        autoAccept: false
      };

      const { validateListing } = require('../../../middleware/validation');

      // Execute
      validateListing(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation error',
        details: expect.any(String)
      });
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid iconUrl', () => {
      // Setup
      req.body = {
        assetId: '1234567890',
        classId: '730_1',
        name: 'AK-47 | Redline',
        marketName: 'AK-47 | Redline (Field-Tested)',
        iconUrl: 'not-a-valid-url', // Invalid: not a URI
        price: 15.99,
        description: '',
        autoAccept: false
      };

      const { validateListing } = require('../../../middleware/validation');

      // Execute
      validateListing(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateTradeOffer', () => {
    test('should pass validation with valid trade offer data', () => {
      // Setup
      req.body = {
        myAssetIds: ['1234567890', '0987654321'],
        theirAssetIds: ['5555555555'],
        message: 'Nice trade!'
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should pass validation with empty theirAssetIds', () => {
      // Setup
      req.body = {
        myAssetIds: ['1234567890']
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    test('should fail validation with empty myAssetIds', () => {
      // Setup
      req.body = {
        theirAssetIds: ['5555555555']
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with too many items', () => {
      // Setup
      req.body = {
        myAssetIds: Array(11).fill('1234567890'), // More than 10
        theirAssetIds: []
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid asset ID format', () => {
      // Setup
      req.body = {
        myAssetIds: ['invalid-asset-id'], // Contains non-numeric characters
        theirAssetIds: []
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with message too long', () => {
      // Setup
      req.body = {
        myAssetIds: ['1234567890'],
        message: 'x'.repeat(501) // More than 500 characters
      };

      const { validateTradeOffer } = require('../../../middleware/validation');

      // Execute
      validateTradeOffer(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateAssetIds', () => {
    test('should pass validation with valid asset IDs', () => {
      // Setup
      req.body = {
        assetIds: ['1234567890', '0987654321', '5555555555']
      };

      const { validateAssetIds } = require('../../../middleware/validation');

      // Execute
      validateAssetIds(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    test('should fail validation with empty assetIds array', () => {
      // Setup
      req.body = {
        assetIds: []
      };

      const { validateAssetIds } = require('../../../middleware/validation');

      // Execute
      validateAssetIds(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with missing assetIds', () => {
      // Setup
      req.body = {};

      const { validateAssetIds } = require('../../../middleware/validation');

      // Execute
      validateAssetIds(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with invalid asset ID format', () => {
      // Setup
      req.body = {
        assetIds: ['asset-123', '456'] // Contains non-numeric
      };

      const { validateAssetIds } = require('../../../middleware/validation');

      // Execute
      validateAssetIds(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validatePurchase', () => {
    test('should always pass validation (placeholder middleware)', () => {
      // Setup
      const { validatePurchase } = require('../../../middleware/validation');

      // Execute
      validatePurchase(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('validateTradeUrl', () => {
    test('should pass validation with valid Steam trade URL', () => {
      // Setup
      req.body = {
        tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123def456'
      };

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should pass validation with minimal valid trade URL', () => {
      // Setup
      req.body = {
        tradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=123456789'
      };

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });

    test('should fail validation with invalid URL format', () => {
      // Setup
      req.body = {
        tradeUrl: 'not-a-valid-url'
      };

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with non-Steam URL', () => {
      // Setup
      req.body = {
        tradeUrl: 'https://example.com/tradeoffer/new/?partner=123456789'
      };

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with missing partner parameter', () => {
      // Setup
      req.body = {
        tradeUrl: 'https://steamcommunity.com/tradeoffer/new/'
      };

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    test('should fail validation with missing tradeUrl', () => {
      // Setup
      req.body = {};

      const { validateTradeUrl } = require('../../../middleware/validation');

      // Execute
      validateTradeUrl(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});