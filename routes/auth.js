const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../utils/logger');
const steamOAuthService = require('../services/steamOAuthService');

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

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, steamId: user.steamId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    logger.info('✅ JWT token generated, redirecting to frontend');

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);

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

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, steamId: user.steamId },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

module.exports = router;