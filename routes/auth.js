const express = require('express');
const User = require('../models/User');
const logger = require('../utils/logger');
const steamOAuthService = require('../services/steamOAuthService');
const tokenService = require('../services/tokenService');

const router = express.Router();

/**
 * @swagger
 * /api/auth/steam:
 *   get:
 *     summary: Initiate Steam OAuth login
 *     description: Redirects user to Steam for authentication
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to Steam login
 */
router.get('/steam', (req, res) => {
  try {
    logger.info('🔑 Initiating Steam OAuth flow');

    const { url, state } = steamOAuthService.getAuthorizationUrl();

    // Store state in session for verification
    req.session.oauthState = state;

    logger.info('✅ Redirecting to Steam for authentication');
    res.redirect(url);
  } catch (error) {
    logger.error('❌ Error initiating OAuth flow:', error.message);
    res.status(500).json({ error: 'Failed to initiate authentication' });
  }
});

/**
 * @swagger
 * /api/auth/steam/callback:
 *   get:
 *     summary: Steam OAuth callback
 *     description: Handles Steam OAuth callback and creates JWT token
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect to frontend with JWT token
 */
router.get('/steam/callback', async (req, res) => {
  try {
    logger.info('🔄 Processing Steam OAuth callback');

    const { code, state, error } = req.query;

    // Check for OAuth errors
    if (error) {
      logger.error('❌ OAuth error:', error);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error)}`);
    }

    // Verify state parameter
    if (state !== req.session.oauthState) {
      logger.error('❌ Invalid state parameter');
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=Invalid state parameter`);
    }

    // Verify OAuth response and get tokens
    const verification = await steamOAuthService.verifyOAuthResponse(req.query);

    if (!verification.isValid) {
      logger.error('❌ OAuth verification failed:', verification.error);
      return res.redirect(`${process.env.CLIENT_URL}/auth/error?message=Authentication failed`);
    }

    const { steamId, accessToken, refreshToken } = verification;
    logger.info('✅ OAuth verified', { steamId });

    // Get user info from Steam using SteamID
    const userInfo = await steamOAuthService.getUserInfo(steamId);

    // Find or create user
    let user = await User.findOne({ steamId: steamId });

    if (!user) {
      // Check if this is the first user - make them admin
      const totalUsers = await User.countDocuments();

      user = new User({
        steamId,
        steamName: userInfo.username,
        username: userInfo.username,
        displayName: userInfo.displayName,
        avatar: userInfo.avatar,
        profileUrl: userInfo.profileUrl,
        steamAccessToken: accessToken,
        steamRefreshToken: refreshToken,
        isAdmin: totalUsers === 0 // First user is admin
      });

      await user.save();
      logger.info(`✅ New user registered: ${steamId} ${user.isAdmin ? '(ADMIN)' : ''}`);
    } else {
      // Update user info and tokens
      user.steamName = userInfo.username;
      user.username = userInfo.username;
      user.displayName = userInfo.displayName;
      user.avatar = userInfo.avatar;
      user.profileUrl = userInfo.profileUrl;
      user.steamAccessToken = accessToken;
      user.steamRefreshToken = refreshToken;
      await user.save();
      logger.info(`✅ User updated: ${steamId}`);
    }

    // Generate token pair (access + refresh)
    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const tokenPair = await tokenService.generateTokenPair(user, userAgent, ipAddress);

    logger.info('✅ Token pair generated, redirecting to frontend');

    // Redirect to frontend with tokens
    res.redirect(
      `${process.env.CLIENT_URL}/auth/success?accessToken=${tokenPair.accessToken}&refreshToken=${tokenPair.refreshToken}&expiresIn=900`
    );

  } catch (error) {
    logger.error('❌ Error in OAuth callback:', error);
    res.redirect(`${process.env.CLIENT_URL}/auth/error?message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * @swagger
 * /api/auth/test-user:
 *   post:
 *     summary: Get test user token
 *     description: Returns JWT token for test user (development only)
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Test user token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: JWT token
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     username:
 *                       type: string
 *                     steamId:
 *                       type: string
 *                     hasAccessToken:
 *                       type: boolean
 *       404:
 *         description: Test user not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/test-user', async (req, res) => {
  try {
    const user = await User.findOne({ steamId: '76561198782060203' });

    if (!user) {
      return res.status(404).json({ error: 'Test user not found' });
    }

    // Generate token pair
    const tokenPair = await tokenService.generateTokenPair(user, 'test-user-agent', '127.0.0.1');

    res.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: 900,
      user: {
        id: user._id,
        username: user.username,
        steamId: user.steamId,
        hasAccessToken: !!user.steamAccessToken
      }
    });
  } catch (error) {
    logger.error('Error creating test user token:', error);
    res.status(500).json({ error: 'Failed to create test token' });
  }
});

// Get OAuth access token for current user
router.get('/oauth-token', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      hasToken: !!user.steamAccessToken,
      token: user.steamAccessToken || null
    });
  } catch (error) {
    logger.error('Error fetching OAuth token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Get current user
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     description: Returns current authenticated user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: No token provided
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = tokenService.verifyAccessToken(token);
    const user = await User.findById(decoded.id).select('-steamInventory');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    logger.error('Error fetching user:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     description: Logs out the current user
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Logged out successfully"
 *       500:
 *         description: Logout failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Use refresh token to get new access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token
 *     responses:
 *       200:
 *         description: New tokens generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *       401:
 *         description: Invalid refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // В реальном приложении нужно передать userId из безопасного источника
    // Например, из зашифрованного JWT в refresh токене
    // Для простоты примера, берем из заголовка (НЕ БЕЗОПАСНО для production!)
    const userId = req.headers['x-user-id'];

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const userAgent = req.headers['user-agent'] || null;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const tokenPair = await tokenService.refreshTokens(
      refreshToken,
      userId,
      userAgent,
      ipAddress
    );

    res.json({
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      expiresIn: 900 // 15 минут
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     description: Revoke all refresh tokens for current user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully logged out from all devices
 *       401:
 *         description: Unauthorized
 */
router.post('/logout-all', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = tokenService.verifyAccessToken(token);
    await tokenService.revokeAllUserTokens(decoded.id);

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    logger.error('Logout all failed:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;