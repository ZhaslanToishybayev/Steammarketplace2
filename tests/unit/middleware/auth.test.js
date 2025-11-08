// Mock dependencies
jest.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let req;
  let res;
  let next;
  let authMiddleware;

  beforeEach(() => {
    req = {
      headers: {},
      user: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should pass when valid token provided', () => {
    const jwt = require('jsonwebtoken');
    jwt.verify = jest.fn().mockReturnValue({ userId: '123' });
    req.headers.authorization = 'Bearer valid-token';

    authMiddleware = require('../../../middleware/auth');

    authMiddleware(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 when no token provided', () => {
    authMiddleware = require('../../../middleware/auth');

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No token provided'
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when invalid token provided', () => {
    const jwt = require('jsonwebtoken');
    jwt.verify = jest.fn().mockImplementation(() => {
      throw new Error('Invalid token');
    });
    req.headers.authorization = 'Bearer invalid-token';

    authMiddleware = require('../../../middleware/auth');

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid token'
    });
    expect(next).not.toHaveBeenCalled();
  });
});
