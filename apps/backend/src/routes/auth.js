const express = require('express');
const passport = require('passport');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const auditService = require('../services/audit.service');

// Steam login
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3001}`;

console.log('🔧 Auth routes loaded with FRONTEND_URL:', FRONTEND_URL);
console.log('🔧 Auth routes loaded with BACKEND_URL:', BACKEND_URL);

// Simple retry function for HTTP requests
const retryRequest = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      console.log(`🔄 Retrying request... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryRequest(fn, retries - 1, delay * 2); // Увеличиваем задержку
    }
    throw error;
  }
};

// Rate limiting для Steam аутентификации
const steamAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 5, // максимум 5 попыток аутентификации за 15 минут
  message: {
    error: 'Too many authentication attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Steam login с rate limiting
router.get('/steam', steamAuthLimiter,
  passport.authenticate('steam', { failureRedirect: `${FRONTEND_URL}?auth=failed` })
);

// Steam callback - ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ
router.get('/steam/return',
  passport.authenticate('steam', {
    failureRedirect: `${FRONTEND_URL}?auth=failed`,
    failureMessage: true
  }),
  async (req, res) => {
    try {
      let user = req.user;

      // Fallback: if passport didn't populate req.user, extract from OpenID params
      if (!user) {
        const claimedId = req.query['openid.claimed_id'] || req.query.openid_claimed_id;
        const steamId = claimedId ? String(claimedId).split('/').pop() : null;
        if (!steamId || !/^\d{17}$/.test(steamId)) {
          throw new Error('No user authenticated');
        }

        // Try to fetch player summary from Steam Web API with retry
        let username = `Steam User ${steamId}`;
        let avatar = '';
        let profileUrl = `https://steamcommunity.com/profiles/${steamId}`;
        const apiKey = process.env.STEAM_API_KEY;
        if (apiKey) {
          try {
            const resp = await retryRequest(async () => {
              return await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
                params: { key: apiKey, steamids: steamId },
                timeout: 10000, // Увеличим timeout до 10 секунд
              });
            }, 3, 1000); // 3 попытки с задержкой 1 секунда

            const player = resp.data?.response?.players?.[0];
            if (player) {
              username = player.personaname || username;
              avatar = player.avatarfull || player.avatar || '';
              profileUrl = player.profileurl || profileUrl;
            }
          } catch (e) {
            console.warn('Steam player summary fetch failed:', e.message);
            // Используем fallback значения
          }
        }

        user = { steamId, username, avatar, profileUrl };

        // Sync user to database
        const { query } = require('../config/database');
        await query(`
          INSERT INTO users (steam_id, username, avatar, profile_url, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          ON CONFLICT (steam_id) DO UPDATE 
          SET username = EXCLUDED.username, 
              avatar = EXCLUDED.avatar, 
              profile_url = EXCLUDED.profile_url,
              updated_at = NOW()
        `, [steamId, username, avatar, profileUrl]);

        // Attach to session for subsequent authenticated endpoints
        await new Promise((resolve, reject) => {
          req.login(user, err => (err ? reject(err) : resolve(null)));
        });
      }

      console.log('✅ Steam auth SUCCESS for user:', user.steamId);

      const baseUrl = FRONTEND_URL;
      const params = new URLSearchParams({
        auth: 'success',
        steamid: user.steamId,
        username: encodeURIComponent(user.username),
        avatar: encodeURIComponent(user.avatar || ''),
        profileurl: encodeURIComponent(user.profileUrl || `https://steamcommunity.com/profiles/${user.steamId}`)
      });

      const redirectUrl = `${baseUrl}?${params.toString()}`;
      console.log('🔗 Redirecting to:', redirectUrl);

        // Force session save before redirect to prevent race conditions
      req.session.save(async (err) => {
        if (err) {
          console.error('❌ Session save error:', err);
          return res.redirect(`${FRONTEND_URL}?auth=session_error`);
        }
        
        // Audit Log
        try {
            await auditService.log(user.steamId, 'USER_LOGIN', null, {}, req.ip);
        } catch (e) {} // Don't block login on log error

        console.log('💾 Session saved successfully. Session ID:', req.sessionID);
        res.redirect(redirectUrl);
      });

    } catch (error) {
      console.error('❌ Auth callback error:', error.message);
      const errorUrl = `${FRONTEND_URL}?auth=error&message=` + encodeURIComponent(error.message);
      res.redirect(errorUrl);
    }
  }
);

// Простые endpoint'ы

router.get('/check', (req, res) => {
  console.log('[AuthCheck] Cookies:', req.cookies);
  console.log('[AuthCheck] Session ID:', req.sessionID);
  console.log('[AuthCheck] Passport User:', req.user ? req.user.steamId : 'null');
  console.log('[AuthCheck] Authenticated:', req.isAuthenticated());
  res.json({
    authenticated: req.isAuthenticated(),
    user: req.user || null
  });
});

router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ success: true });
  });
});

module.exports = router;
