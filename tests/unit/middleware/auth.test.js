/**
 * Unit tests for auth middleware
 * Тестирует middleware аутентификации и авторизации
 */

const jwt = require('jsonwebtoken');
const User = require('../../../models/User');

describe('Auth Middleware - authenticateToken', () => {
  let req;
  let res;
  let next;
  let authenticateToken;
  let requireAdmin;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup module mocks
    jest.doMock('../../../models/User', () => ({
      __esModule: true,
      default: User
    }));
    jest.doMock('../../../utils/logger', () => ({
      error: jest.fn()
    }));

    // Require middleware after mocks are set up
    const authModule = require('../../../middleware/auth');
    authenticateToken = authModule.authenticateToken;
    requireAdmin = authModule.requireAdmin;

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

  describe('authenticateToken', () => {
    test('should authenticate valid token and set user', async () => {
      // Setup
      const mockUser = createMockUser();
      req.headers.authorization = 'Bearer valid-jwt-token';

      jwt.verify.mockReturnValue({ id: mockUser._id });
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', process.env.JWT_SECRET);
      expect(User.findById).toHaveBeenCalledWith(mockUser._id);
      expect(req.user).toEqual({ id: mockUser._id.toString(), steamId: mockUser.steamId });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 401 when no authorization header', async () => {
      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when token is undefined', async () => {
      // Setup
      req.headers.authorization = 'Bearer';

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 401 when user not found', async () => {
      // Setup
      req.headers.authorization = 'Bearer valid-jwt-token';
      jwt.verify.mockReturnValue({ id: 'non-existent-id' });
      User.findById.mockResolvedValue(null);

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when user is banned', async () => {
      // Setup
      const mockBannedUser = createMockUser({ isBanned: true });
      req.headers.authorization = 'Bearer valid-jwt-token';

      jwt.verify.mockReturnValue({ id: mockBannedUser._id });
      User.findById.mockResolvedValue(mockBannedUser);

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Account is banned' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when JWT verification fails', async () => {
      // Setup
      req.headers.authorization = 'Bearer invalid-jwt-token';
      const error = new Error('Invalid token');
      jwt.verify.mockImplementation(() => {
        throw error;
      });

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when token is expired', async () => {
      // Setup
      req.headers.authorization = 'Bearer expired-jwt-token';
      const tokenExpiredError = new Error('Token expired');
      tokenExpiredError.name = 'TokenExpiredError';
      jwt.verify.mockImplementation(() => {
        throw tokenExpiredError;
      });

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      // Setup
      const mockUser = createMockUser();
      req.headers.authorization = 'Bearer valid-jwt-token';

      jwt.verify.mockReturnValue({ id: mockUser._id });
      User.findById.mockRejectedValue(new Error('Database error'));

      // Execute
      await authenticateToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    beforeEach(() => {
      // Set up authenticated user in req
      req.user = { id: '507f1f77bcf86cd799439011', steamId: '76561198782060203' };
    });

    test('should allow access when user is admin', async () => {
      // Setup
      const mockAdminUser = createMockUser({ isAdmin: true });
      User.findById.mockResolvedValue(mockAdminUser);

      // Execute
      await requireAdmin(req, res, next);

      // Assert
      expect(User.findById).toHaveBeenCalledWith(req.user.id);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    test('should return 403 when user is not admin', async () => {
      // Setup
      const mockUser = createMockUser({ isAdmin: false });
      User.findById.mockResolvedValue(mockUser);

      // Execute
      await requireAdmin(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 403 when user not found in database', async () => {
      // Setup
      User.findById.mockResolvedValue(null);

      // Execute
      await requireAdmin(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(next).not.toHaveBeenCalled();
    });

    test('should return 500 on database error', async () => {
      // Setup
      const logger = require('../../../utils/logger');
      User.findById.mockRejectedValue(new Error('Database connection failed'));

      // Execute
      await requireAdmin(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Authorization check failed' });
      expect(logger.error).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});