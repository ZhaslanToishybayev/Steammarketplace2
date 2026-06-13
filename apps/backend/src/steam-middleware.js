// Middleware для обработки Steam OpenID
function setupSteamStrategy(passport) {
  const SteamStrategy = require('passport-steam').Strategy;
  const rateLimit = require('express-rate-limit');

  // Добавим rate limiting для Steam auth
  const steamAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 запросов за 15 минут с одного IP
    message: {
      error: 'Too many Steam auth attempts, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Критически важные настройки для Steam
  const port = process.env.PORT || 3001;
  const steamOptions = {
    returnURL: process.env.STEAM_RETURN_URL || `http://localhost:${port}/api/auth/steam/return`,
    realm: process.env.STEAM_REALM || `http://localhost:${port}/`,
    apiKey: process.env.STEAM_API_KEY,
    // Добавим дополнительные опции для лучшей стабильности
    stateless: true, // Для stateless аутентификации
    passReqToCallback: true // Для доступа к req в callback
  };

  console.log('🔧 Steam OpenID Config:');
  console.log('   returnURL:', steamOptions.returnURL);
  console.log('   realm:', steamOptions.realm);
  console.log('   apiKey set:', !!steamOptions.apiKey);

  const { query } = require('./config/database'); // Import DB

  passport.use(new SteamStrategy(
    steamOptions,
    async (req, identifier, profile, done) => { // Async callback с req
      try {
        console.log('👤 Steam profile received:', profile.displayName);
        console.log('🔗 Steam ID:', identifier);

        // Извлекаем steamId из OpenID идентификатора
        // Формат: https://steamcommunity.com/openid/id/7656119...
        const steamId = identifier.split('/').pop();

        if (!steamId || !/^\d{17}$/.test(steamId)) {
          return done(new Error('Invalid Steam ID format'));
        }

        const user = {
          steamId: steamId,
          username: profile.displayName || 'Steam User',
          avatar: profile.photos?.[2]?.value || // avatarfull
            profile.photos?.[1]?.value || // avatarmedium  
            profile.photos?.[0]?.value || // avatar
            'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fe/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_full.jpg',
          profileUrl: profile._json?.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
          rawProfile: process.env.NODE_ENV === 'development' ? profile._json : undefined
        };

        // Save to Database
        try {
          await query(`
                INSERT INTO users (steam_id, username, avatar, profile_url, created_at, updated_at)
                VALUES ($1, $2, $3, $4, NOW(), NOW())
                ON CONFLICT (steam_id) DO UPDATE 
                SET username = EXCLUDED.username, 
                    avatar = EXCLUDED.avatar, 
                    profile_url = EXCLUDED.profile_url,
                    updated_at = NOW()
            `, [user.steamId, user.username, user.avatar, user.profileUrl]);
          console.log(`✅ User synced to DB: ${user.username}`);
        } catch (dbErr) {
          console.error('⚠️ Failed to sync user to DB:', dbErr.message);
          // Don't fail auth just because sync failed? Or maybe we should?
          // Proceeding is safer for user experience if DB is partial.
        }

        console.log(`✅ User authenticated: ${user.username} (${user.steamId})`);
        return done(null, user);

      } catch (error) {
        console.error('❌ Error in Steam strategy:', error);
        // Для временных ошибок Steam, пробуем повторить
        if (error.message.includes('ECONNRESET') || error.message.includes('ENETUNREACH') || error.message.includes('ETIMEDOUT')) {
          console.log('🔄 Retrying Steam auth...');
          setTimeout(() => done(error), 2000); // Задержка перед повторной попыткой
        } else {
          return done(error);
        }
      }
    }
  ));
}

module.exports = { setupSteamStrategy };
