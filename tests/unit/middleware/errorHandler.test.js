/**
 * Unit tests for errorHandler middleware
 * Тестирует middleware обработки ошибок
 */

// Mock Sentry
const mockSentry = {
  captureException: jest.fn()
};

// Mock logger
const mockLogger = {
  error: jest.fn()
};

// Mock the config modules
jest.mock('../../../config/sentry', () => ({
  Sentry: mockSentry
}));

jest.mock('../../../utils/logger', () => mockLogger);

describe('Error Handler Middleware', () => {
  let req;
  let res;
  let next;
  let errorHandler;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      url: '/api/test',
      method: 'GET',
      ip: '127.0.0.1',
      get: jest.fn((header) => {
        const headers = {
          'user-agent': 'Mozilla/5.0 (Test Browser)'
        };
        return headers[header.toLowerCase()];
      })
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();

    errorHandler = require('../../../middleware/errorHandler');
  });

  test('should handle Mongoose ValidationError', () => {
    // Setup
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {
      field1: { message: 'Field 1 is required' },
      field2: { message: 'Field 2 is invalid' }
    };

    // Execute
    errorHandler(validationError, req, res, next);

    // Assert
    expect(mockSentry.captureException).toHaveBeenCalledWith(validationError, {
      tags: { url: req.url, method: req.method },
      extra: { ip: req.ip, userAgent: req.get('User-Agent') }
    });
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      details: ['Field 1 is required', 'Field 2 is invalid']
    });
  });

  test('should handle Mongoose duplicate key error', () => {
    // Setup
    const duplicateError = new Error('Duplicate key');
    duplicateError.code = 11000;

    // Execute
    errorHandler(duplicateError, req, res, next);

    // Assert
    expect(mockSentry.captureException).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate entry',
      details: 'Resource already exists'
    });
  });

  test('should handle JsonWebTokenError', () => {
    // Setup
    const jwtError = new Error('Invalid token');
    jwtError.name = 'JsonWebTokenError';

    // Execute
    errorHandler(jwtError, req, res, next);

    // Assert
    expect(mockSentry.captureException).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid token'
    });
  });

  test('should handle TokenExpiredError', () => {
    // Setup
    const expiredError = new Error('Token expired');
    expiredError.name = 'TokenExpiredError';

    // Execute
    errorHandler(expiredError, req, res, next);

    // Assert
    expect(mockSentry.captureException).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Token expired'
    });
  });

  test('should handle custom error with status code', () => {
    // Setup
    const customError = new Error('Custom error message');
    customError.status = 404;

    // Execute
    errorHandler(customError, req, res, next);

    // Assert
    expect(mockSentry.captureException).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Custom error message'
    });
  });

  test('should return generic error in production mode', () => {
    // Setup
    process.env.NODE_ENV = 'production';
    const error = new Error('Detailed error message');
    error.stack = 'Error stack trace';

    // Execute
    errorHandler(error, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Internal server error'
    });
    process.env.NODE_ENV = 'test';
  });

  test('should return detailed error in development mode', () => {
    // Setup
    process.env.NODE_ENV = 'development';
    const error = new Error('Detailed error message');
    error.stack = 'Error stack trace';

    // Execute
    errorHandler(error, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Detailed error message'
    });
    process.env.NODE_ENV = 'test';
  });

  test('should handle error without status code (defaults to 500)', () => {
    // Setup
    const error = new Error('Unknown error');
    error.status = undefined;

    // Execute
    errorHandler(error, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Unknown error'
    });
  });

  test('should handle error with complex duplicate key', () => {
    // Setup
    const duplicateError = new Error('Duplicate key');
    duplicateError.code = 11000;
    duplicateError.keyValue = { email: 'test@example.com' };

    // Execute
    errorHandler(duplicateError, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Duplicate entry',
      details: 'Resource already exists'
    });
  });

  test('should handle Sentry being disabled', () => {
    // Setup
    jest.doMock('../../../config/sentry', () => ({
      Sentry: null
    }));

    const error = new Error('Test error');
    const errorHandlerNew = require('../../../middleware/errorHandler');

    // Execute
    errorHandlerNew(error, req, res, next);

    // Assert
    expect(mockSentry.captureException).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('should log error with proper context', () => {
    // Setup
    const error = new Error('Test error');
    error.stack = 'Error stack trace';

    // Execute
    errorHandler(error, req, res, next);

    // Assert
    expect(mockLogger.error).toHaveBeenCalledWith('Error occurred:', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
  });

  test('should handle ValidationError with single error', () => {
    // Setup
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {
      field1: { message: 'Field 1 is required' }
    };

    // Execute
    errorHandler(validationError, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Validation Error',
      details: ['Field 1 is required']
    });
  });
});