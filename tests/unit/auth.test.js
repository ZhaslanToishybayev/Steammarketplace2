/**
 * Unit тесты для middleware аутентификации
 */

const { authenticateToken, requireAdmin } = require('../../middleware/auth');
const User = require('../../models/User');

// Мокаем модель User
jest.mock('../../models/User');

describe('Auth Middleware', () => {
  let mockRequest;
  let mockResponse;
  let mockNext;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest = createMockRequest();
    mockResponse = createMockResponse();
    mockNext = jest.fn();
  });

  describe('authenticateToken', () => {
    test('должен аутентифицировать пользователя с валидным токеном', async () => {
      const mockUser = createMockUser();
      const token = 'valid_jwt_token';
      mockRequest.headers.authorization = `Bearer ${token}`;

      // Мокаем JWT verify
      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: mockUser._id });

      // Мокаем поиск пользователя
      User.findById.mockResolvedValue(mockUser);

      await authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe(mockUser._id);
      expect(mockRequest.user.steamId).toBe(mockUser.steamId);
    });

    test('должен вернуть 401 если токен отсутствует', async () => {
      await authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Access token required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен вернуть 401 если токен невалидный', async () => {
      mockRequest.headers.authorization = 'Bearer invalid_token';

      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен вернуть 401 если пользователь не найден', async () => {
      const token = 'valid_jwt_token';
      mockRequest.headers.authorization = `Bearer ${token}`;

      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: 'nonexistent_id' });
      User.findById.mockResolvedValue(null);

      await authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'User not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен вернуть 403 если пользователь заблокирован', async () => {
      const mockUser = createMockUser({ isBanned: true });
      const token = 'valid_jwt_token';
      mockRequest.headers.authorization = `Bearer ${token}`;

      const jwt = require('jsonwebtoken');
      jest.spyOn(jwt, 'verify').mockReturnValue({ id: mockUser._id });
      User.findById.mockResolvedValue(mockUser);

      await authenticateToken(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Account is banned' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin', () => {
    test('должен разрешить доступ администратору', async () => {
      const mockUser = createMockUser({ isAdmin: true });
      mockRequest.user = { id: mockUser._id, steamId: mockUser.steamId };

      User.findById.mockResolvedValue(mockUser);

      await requireAdmin(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    test('должен вернуть 403 обычному пользователю', async () => {
      const mockUser = createMockUser({ isAdmin: false });
      mockRequest.user = { id: mockUser._id, steamId: mockUser.steamId };

      User.findById.mockResolvedValue(mockUser);

      await requireAdmin(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Admin access required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('должен вернуть 500 если пользователь не найден', async () => {
      mockRequest.user = { id: 'nonexistent_id', steamId: 'test' };

      User.findById.mockResolvedValue(null);

      await requireAdmin(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Authorization check failed' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
