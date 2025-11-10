const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const RefreshToken = require('../models/RefreshToken');
const logger = require('../utils/logger');

/**
 * Token Service
 * Управляет access и refresh токенами с поддержкой ротации
 */
class TokenService {
  /**
   * Генерирует пару токенов (access + refresh)
   * @param {Object} user - объект пользователя
   * @param {string} userAgent - User-Agent из запроса
   * @param {string} ipAddress - IP адрес пользователя
   * @returns {Object} - access token, refresh token, familyId
   */
  async generateTokenPair(user, userAgent = null, ipAddress = null) {
    // Генерируем family ID для группы связанных refresh токенов
    const familyId = uuidv4();

    // Создаем refresh токен
    const { token: refreshTokenValue } = await RefreshToken.createToken(
      user._id,
      familyId,
      userAgent,
      ipAddress
    );

    // Генерируем access токен
    const accessToken = this.generateAccessToken(user);

    logger.info('Token pair generated', {
      userId: user._id,
      familyId,
      hasUserAgent: !!userAgent
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      familyId
    };
  }

  /**
   * Генерирует access токен
   * @param {Object} user - объект пользователя
   * @returns {string} - JWT access токен
   */
  generateAccessToken(user) {
    const payload = {
      id: user._id.toString(),
      steamId: user.steamId,
      role: user.role,
      type: 'access'
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '15m', // 15 минут
      issuer: 'steam-marketplace',
      audience: 'steam-marketplace-users'
    });

    return token;
  }

  /**
   * Обновляет токены (refresh flow)
   * @param {string} refreshTokenValue - значение refresh токена
   * @param {string} userId - ID пользователя
   * @param {string} userAgent - User-Agent
   * @param {string} ipAddress - IP адрес
   * @returns {Object} - новые access и refresh токены
   */
  async refreshTokens(refreshTokenValue, userId, userAgent = null, ipAddress = null) {
    // Находим и верифицируем refresh токен
    const currentRefreshToken = await RefreshToken.verifyToken(refreshTokenValue, userId);

    if (!currentRefreshToken) {
      throw new Error('Invalid refresh token');
    }

    // Проверяем, что токен не отозван
    if (currentRefreshToken.revokedAt) {
      logger.warn('Attempt to use revoked refresh token', {
        userId,
        refreshTokenId: currentRefreshToken._id
      });
      // Отзываем все токены пользователя при попытке использовать отозванный токен
      await RefreshToken.revokeAllUserTokens(userId);
      throw new Error('Refresh token has been revoked');
    }

    // Генерируем новую пару токенов
    const user = await require('../models/User').findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const tokenPair = await this.generateTokenPair(user, userAgent, ipAddress);

    // Отзываем старый refresh токен и помечаем его заменённым новым
    await currentRefreshToken.revoke(tokenPair.refreshToken);

    logger.info('Tokens refreshed successfully', {
      userId,
      familyId: tokenPair.familyId
    });

    return tokenPair;
  }

  /**
   * Отзывает refresh токен
   * @param {string} refreshTokenValue - значение refresh токена
   * @param {string} userId - ID пользователя
   */
  async revokeRefreshToken(refreshTokenValue, userId) {
    const refreshToken = await RefreshToken.verifyToken(refreshTokenValue, userId);

    if (refreshToken) {
      await refreshToken.revoke();
      logger.info('Refresh token revoked', {
        userId,
        tokenId: refreshToken._id
      });
    }
  }

  /**
   * Отзывает все токены пользователя (logout со всех устройств)
   * @param {string} userId - ID пользователя
   */
  async revokeAllUserTokens(userId) {
    await RefreshToken.revokeAllUserTokens(userId);
    logger.info('All user tokens revoked', { userId });
  }

  /**
   * Отзывает семейство токенов
   * @param {string} familyId - ID семейства
   */
  async revokeTokenFamily(familyId) {
    await RefreshToken.revokeTokenFamily(familyId);
    logger.info('Token family revoked', { familyId });
  }

  /**
   * Верифицирует access токен
   * @param {string} token - JWT токен
   * @returns {Object} - payload токена
   */
  verifyAccessToken(token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'steam-marketplace',
        audience: 'steam-marketplace-users'
      });

      // Проверяем, что это действительно access токен
      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Invalid token');
      }
      throw error;
    }
  }

  /**
   * Middleware для аутентификации с поддержкой refresh токенов
   */
  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const refreshToken = req.headers['x-refresh-token'];

    // Если access токен истёк и есть refresh токен - пытаемся обновить
    if (!authHeader && refreshToken) {
      return this.handleTokenRefresh(req, res, next);
    }

    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const payload = this.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (error) {
      if (error.message === 'Token expired' && refreshToken) {
        return this.handleTokenRefresh(req, res, next);
      }
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  /**
   * Обрабатывает обновление токенов через refresh
   */
  async handleTokenRefresh(req, res, next) {
    const refreshToken = req.headers['x-refresh-token'];

    if (!refreshToken) {
      return res.status(403).json({ error: 'Refresh token required' });
    }

    try {
      const userId = req.headers['x-user-id'];
      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const userAgent = req.headers['user-agent'] || null;
      const ipAddress = req.ip || req.connection.remoteAddress;

      const tokenPair = await this.refreshTokens(
        refreshToken,
        userId,
        userAgent,
        ipAddress
      );

      // Возвращаем новые токены
      res.json({
        accessToken: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken,
        expiresIn: 900 // 15 минут в секундах
      });
    } catch (error) {
      logger.error('Token refresh failed', {
        error: error.message,
        userAgent: req.headers['user-agent']
      });
      res.status(403).json({ error: 'Cannot refresh token' });
    }
  }

  /**
   * Очищает просроченные refresh токены
   */
  async cleanupExpiredTokens() {
    const deletedCount = await RefreshToken.cleanupExpired();
    logger.info('Expired tokens cleaned up', { deletedCount });
  }
}

module.exports = new TokenService();
