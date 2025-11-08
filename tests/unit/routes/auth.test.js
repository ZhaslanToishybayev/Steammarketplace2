describe('Auth Routes', () => {
  describe('GET /auth/steam', () => {
    test('should redirect to Steam for authentication', () => {
      const passport = require('passport');
      passport.authenticate = jest.fn().mockReturnValue((req, res, next) => {});

      const authRoutes = require('../../../routes/auth');

      const req = {};
      const res = {
        redirect: jest.fn()
      };
      const next = jest.fn();

      authRoutes.router.get('/steam', authRoutes.authenticateSteam);

      expect(passport.authenticate).toHaveBeenCalledWith('steam', {
        failureRedirect: '/login'
      });
    });
  });

  describe('GET /auth/steam/return', () => {
    test('should generate token and redirect on successful auth', async () => {
      const jwt = require('jsonwebtoken');
      const passport = require('passport');

      const mockUser = {
        _id: 'user123',
        steamId: '76561198000000000',
        username: 'TestUser'
      };

      passport.authenticate = jest.fn().mockReturnValue((req, res, next) => {
        req.user = mockUser;
        next();
      });

      jwt.sign = jest.fn().mockReturnValue('mock-jwt-token');

      const authRoutes = require('../../../routes/auth');

      const req = { user: mockUser };
      const res = {
        redirect: jest.fn()
      };

      await authRoutes.steamReturn(req, res);

      expect(jwt.sign).toHaveBeenCalledWith(
        { userId: 'user123' },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      expect(res.redirect).toHaveBeenCalledWith(
        `http://localhost:5173/auth/callback?token=mock-jwt-token`
      );
    });
  });

  describe('GET /me', () => {
    test('should return user profile', () => {
      const authRoutes = require('../../../routes/auth');
      const User = require('../../../models/User');

      User.findOne = jest.fn().mockResolvedValue({
        steamId: '76561198000000000',
        username: 'TestUser',
        wallet: { balance: 100 }
      });

      const req = { user: { userId: 'user123' } };
      const res = {
        json: jest.fn()
      };

      authRoutes.getMe(req, res);

      expect(User.findOne).toHaveBeenCalledWith({ _id: 'user123' });
      expect(res.json).toHaveBeenCalled();
    });

    test('should return 404 when user not found', () => {
      const authRoutes = require('../../../routes/auth');
      const User = require('../../../models/User');

      User.findOne = jest.fn().mockResolvedValue(null);

      const req = { user: { userId: 'user123' } };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      authRoutes.getMe(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });
  });
});
