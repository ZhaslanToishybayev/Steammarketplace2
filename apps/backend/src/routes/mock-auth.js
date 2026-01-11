// Mock Steam Auth for testing
const express = require('express');
const router = express.Router();

// Mock Steam login
router.get('/steam/mock', (req, res) => {
  const steamId = req.query.steamId || '76561198000000001';
  
  const mockUser = {
    steamId: steamId,
    username: 'TestUser',
    avatar: 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
    profileUrl: `https://steamcommunity.com/profiles/${steamId}`
  };

  // Login via Passport
  req.login(mockUser, (err) => {
      if (err) {
          console.error('Mock login error:', err);
          return res.status(500).send('Login failed');
      }

      // Redirect to frontend with success
      const FRONTEND_URL = process.env.FRONTEND_URL || 'https://localhost';
      const params = new URLSearchParams({
        auth: 'success',
        steamid: mockUser.steamId,
        username: encodeURIComponent(mockUser.username),
        avatar: encodeURIComponent(mockUser.avatar || ''),
        profileurl: encodeURIComponent(mockUser.profileUrl)
      });

      const redirectUrl = `${FRONTEND_URL}?${params.toString()}`;
      console.log('🔗 Mock redirect to:', redirectUrl);
      res.redirect(redirectUrl);
  });
});

// Check mock auth
router.get('/mock-check', (req, res) => {
  res.json({
    authenticated: !!req.session.user,
    user: req.session.user || null
  });
});

module.exports = router;