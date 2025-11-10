/**
 * Unit tests for adminAuth middleware
 * Тестирует middleware админской аутентификации
 */

const jwt = require('jsonwebtoken');
const User = require('../../../models/User');

// Mock User model
jest.mock('../../../models/User');

describe('AdminAuth Middleware', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();

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

  test('should authenticate valid admin token and set user', async () => {
    // Setup
    const mockAdminUser = createMockUser({ isAdmin: true });
    req.headers.authorization = 'Bearer valid-admin-token';

    jwt.verify.mockReturnValue({ id: mockAdminUser._id });
    User.findById.mockResolvedValue(mockAdminUser);

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(jwt.verify).toHaveBeenCalledWith('valid-admin-token', process.env.JWT_SECRET);
    expect(User.findById).toHaveBeenCalledWith(mockAdminUser._id);
    expect(req.user).toBe(mockAdminUser);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token provided', async () => {
    // Setup
    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when token is undefined', async () => {
    // Setup
    req.headers.authorization = 'Bearer';
    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 404 when user not found', async () => {
    // Setup
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ id: 'non-existent-id' });
    User.findById.mockResolvedValue(null);

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 403 when user is not admin', async () => {
    // Setup
    const mockUser = createMockUser({ isAdmin: false });
    req.headers.authorization = 'Bearer valid-token';

    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockResolvedValue(mockUser);

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when JWT verification fails', async () => {
    // Setup
    req.headers.authorization = 'Bearer invalid-token';
    const error = new Error('Invalid token');
    jwt.verify.mockImplementation(() => {
      throw error;
    });

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when token is expired', async () => {
    // Setup
    req.headers.authorization = 'Bearer expired-token';
    const tokenExpiredError = new Error('Token expired');
    tokenExpiredError.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => {
      throw tokenExpiredError;
    });

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should handle database errors gracefully', async () => {
    // Setup
    const mockUser = createMockUser({ isAdmin: true });
    req.headers.authorization = 'Bearer valid-token';

    jwt.verify.mockReturnValue({ id: mockUser._id });
    User.findById.mockRejectedValue(new Error('Database error'));

    const adminAuth = require('../../../middleware/adminAuth');

    // Execute
    await adminAuth(req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });
});