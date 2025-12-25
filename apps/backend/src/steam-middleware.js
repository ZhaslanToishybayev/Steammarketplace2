// Middleware для обработки Steam OpenID
function setupSteamStrategy(passport) {
  const SteamStrategy = require('passport-steam').Strategy;

  // Критически важные настройки для Steam
  const port = process.env.PORT || 3001;
  const defaultBase = `http://localhost:3000`;
  const steamOptions = {
    returnURL: process.env.STEAM_RETURN_URL || `http://localhost:3000/api/auth/steam/return`,
    realm: process.env.STEAM_REALM || `http://localhost:3000/`,
    apiKey: process.env.STEAM_API_KEY || 'E1FC69B3707FF57C6267322B0271A86B'
  };

  console.log('🔧 Steam OpenID Config:');
  console.log('   returnURL:', steamOptions.returnURL);
  console.log('   realm:', steamOptions.realm);

  const { query } = require('./config/database'); // Import DB

  passport.use(new SteamStrategy(
    steamOptions,
    async (identifier, profile, done) => { // Async callback
      try {
        console.log('👤 Steam profile received:', profile.displayName);

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
        return done(error);
      }
    }
  ));
}

module.exports = { setupSteamStrategy };
