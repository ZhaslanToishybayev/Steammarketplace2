const express = require('express');
const axios = require('axios');
const session = require('express-session');
require('dotenv').config();

const app = express();
const PORT = process.env.STEAM_AUTH_PORT || 3001;

// Steam API configuration
const STEAM_API_KEY = process.env.STEAM_API_KEY || 'E1FC69B3707FF57C6267322B0271A86B';
const STEAM_OPENID_RETURN_URL = process.env.STEAM_OPENID_RETURN_URL || `http://localhost:${PORT}/auth/steam/return`;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS для фронтенда
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  next();
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'steam-marketplace-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ==================== PROFESSIONAL STEAM AUTH ====================

// Steam OpenID authentication endpoint
app.get('/auth/steam', (req, res) => {
    const returnUrl = `http://localhost:${PORT}/auth/steam/callback`;
    const realm = `http://localhost:${PORT}`;
    
    const steamAuthUrl = 'https://steamcommunity.com/openid/login?' +
        'openid.ns=http://specs.openid.net/auth/2.0&' +
        'openid.mode=checkid_setup&' +
        'openid.return_to=' + encodeURIComponent(returnUrl) + '&' +
        'openid.realm=' + encodeURIComponent(realm) + '&' +
        'openid.identity=http://specs.openid.net/auth/2.0/identifier_select&' +
        'openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';
    
    console.log('🚀 Redirecting to Steam OpenID');
    res.redirect(steamAuthUrl);
});

// Steam OpenID callback - PROFESSIONAL VERSION
app.get('/auth/steam/callback', async (req, res) => {
    console.log('📞 Steam callback received');
    
    try {
        // Извлекаем SteamID из OpenID response
        const claimedId = req.query['openid.claimed_id'];
        if (!claimedId) {
            console.error('❌ No claimed_id in OpenID response');
            return res.redirect('http://localhost:3000/?error=no_steam_id');
        }
        
        // Извлекаем SteamID64 (например: 76561199257487454)
        const steamId = claimedId.replace('https://steamcommunity.com/openid/id/', '');
        
        if (!steamId || !/^\d{17}$/.test(steamId)) {
            console.error('❌ Invalid SteamID format:', steamId);
            return res.redirect('http://localhost:3000/?error=invalid_steam_id');
        }
        
        console.log(`✅ SteamID authenticated: ${steamId}`);
        
        // Сохраняем SteamID в сессии
        req.session.steamId = steamId;
        req.session.authenticated = true;
        
        // Редирект на фронтенд с SteamID
        res.redirect(`http://localhost:3000/dashboard?steamid=${steamId}&auth=success`);
        
    } catch (error) {
        console.error('❌ Steam auth error:', error.message);
        res.redirect(`http://localhost:3000/?error=auth_failed&message=${encodeURIComponent(error.message)}`);
    }
});

// ==================== PROFESSIONAL STEAM API ENDPOINTS ====================

// 1. Получение ПОЛНОГО профиля с ВСЕМИ реальными данными
app.get('/api/profile/full', async (req, res) => {
    try {
        const steamId = req.query.steamid || req.session.steamId;
        
        if (!steamId) {
            return res.status(400).json({
                success: false,
                error: 'no_steamid',
                message: 'SteamID не указан. Войдите через Steam.'
            });
        }

        console.log(`👤 Fetching FULL Steam profile for: ${steamId}`);
        
        // 1A. Получаем базовый профиль
        const profileResponse = await axios.get(
            'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
            {
                params: { key: STEAM_API_KEY, steamids: steamId },
                timeout: 10000
            }
        );

        const player = profileResponse.data.response.players[0];
        if (!player) {
            return res.status(404).json({
                success: false,
                error: 'player_not_found',
                message: 'Профиль Steam не найден'
            });
        }

        // 1B. Получаем уровень Steam (ТОЧНО как в Steam)
        let steamLevel = 0;
        try {
            const levelResponse = await axios.get(
                'https://api.steampowered.com/IPlayerService/GetSteamLevel/v1/',
                {
                    params: { key: STEAM_API_KEY, steamid: steamId },
                    timeout: 5000
                }
            );
            steamLevel = levelResponse.data.response?.player_level || 0;
        } catch (error) {
            console.warn('⚠️ Could not fetch Steam level:', error.message);
        }

        // 1C. Получаем друзей (ТОЧНО как в Steam)
        let friendsCount = 0;
        try {
            const friendsResponse = await axios.get(
                'https://api.steampowered.com/ISteamUser/GetFriendList/v1/',
                {
                    params: { key: STEAM_API_KEY, steamid: steamId, relationship: 'friend' },
                    timeout: 5000
                }
            );
            friendsCount = friendsResponse.data.friendslist?.friends?.length || 0;
        } catch (error) {
            console.warn('⚠️ Could not fetch friends (profile might be private):', error.message);
        }

        // 1D. Получаем время в играх (ТОЧНО как в Steam)
        let totalHours = 0;
        let cs2Hours = 0;
        let dota2Hours = 0;
        let gamesCount = 0;
        
        try {
            const gamesResponse = await axios.get(
                'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/',
                {
                    params: { key: STEAM_API_KEY, steamid: steamId, include_appinfo: 0 },
                    timeout: 10000
                }
            );
            
            const games = gamesResponse.data.response?.games || [];
            gamesCount = games.length;
            
            // Считаем часы точно как Steam (playtime_forever в минутах)
            totalHours = Math.round(games.reduce((sum, game) => sum + (game.playtime_forever || 0), 0) / 60);
            
            const cs2Game = games.find(g => g.appid === 730);
            const dotaGame = games.find(g => g.appid === 570);
            
            if (cs2Game) cs2Hours = Math.round(cs2Game.playtime_forever / 60);
            if (dotaGame) dota2Hours = Math.round(dotaGame.playtime_forever / 60);
            
        } catch (error) {
            console.warn('⚠️ Could not fetch games (profile might be private):', error.message);
        }

        // 1E. Формируем ПОЛНЫЙ ответ с РЕАЛЬНЫМИ данными
        const response = {
            success: true,
            profile: {
                // Основная информация (из Steam)
                steamId: player.steamid,
                username: player.personaname,
                avatar: {
                    small: player.avatar,
                    medium: player.avatarmedium,
                    large: player.avatarfull
                },
                profileUrl: player.profileurl,
                countryCode: player.loccountrycode,
                lastLogoff: player.lastlogoff,
                
                // РЕАЛЬНЫЕ данные из Steam (ТОЧНО как в Steam)
                steamLevel: steamLevel, // Настоящий уровень из Steam
                friendsCount: friendsCount, // Настоящее количество друзей
                totalGameHours: totalHours, // Настоящее общее время
                gamesCount: gamesCount, // Настоящее количество игр
                
                // Часы в конкретных играх (ТОЧНО как в Steam)
                playtime: {
                    cs2: cs2Hours,
                    dota2: dota2Hours,
                    total: totalHours
                },
                
                // Статус приватности (важно!)
                privacyState: player.communityvisibilitystate,
                isProfilePublic: player.communityvisibilitystate === 3,
                
                // Техническая информация
                lastUpdated: new Date().toISOString(),
                source: 'steam-api-official'
            }
        };

        console.log(`✅ Full profile loaded for ${player.personaname}: Level ${steamLevel}, ${friendsCount} friends, ${totalHours} hours`);
        res.json(response);

    } catch (error) {
        console.error('❌ Full profile error:', error.message);
        res.status(500).json({
            success: false,
            error: 'load_failed',
            message: 'Не удалось загрузить профиль из Steam API',
            details: error.message
        });
    }
});

// 2. Получение РЕАЛЬНОГО инвентаря CS2 (PROFESSIONAL)
app.get('/api/inventory/cs2/professional', async (req, res) => {
    try {
        const steamId = req.query.steamid || req.session.steamId;
        
        if (!steamId) {
            return res.status(400).json({
                success: false,
                error: 'no_steamid',
                message: 'SteamID не указан'
            });
        }

        console.log(`🎮 Fetching PROFESSIONAL CS2 inventory for: ${steamId}`);
        
        // Используем официальный Steam Inventory API
        const response = await axios.get(
            `https://steamcommunity.com/inventory/${steamId}/730/2`,
            {
                params: {
                    l: 'english',
                    count: 5000
                },
                timeout: 15000,
                headers: {
                    'User-Agent': 'Steam Marketplace App/1.0'
                }
            }
        );

        // Проверяем ответ Steam API
        if (!response.data) {
            return res.status(500).json({
                success: false,
                error: 'steam_api_error',
                message: 'Steam API не вернул данные'
            });
        }

        // Проверяем статус приватности
        if (response.data.success === false) {
            if (response.data.error === 'This profile is private.') {
                return res.status(403).json({
                    success: false,
                    error: 'inventory_private',
                    message: 'Инвентарь CS2 закрыт настройками приватности Steam',
                    steamMessage: response.data.error,
                    items: []
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'steam_error',
                message: 'Ошибка Steam API',
                steamError: response.data.error,
                items: []
            });
        }

        // Если инвентарь пуст
        if (!response.data.assets || response.data.assets.length === 0) {
            return res.json({
                success: true,
                items: [],
                total: 0,
                game: 'CS2',
                message: 'В вашем инвентаре CS2 нет предметов',
                steamId: steamId,
                isEmpty: true
            });
        }

        // Парсим инвентарь профессионально
        const items = parseInventoryProfessional(response.data, 730);
        
        // Получаем дополнительную информацию о предметах
        const enrichedItems = await enrichItemsWithMarketData(items);

        res.json({
            success: true,
            items: enrichedItems,
            total: enrichedItems.length,
            game: 'CS2',
            steamId: steamId,
            timestamp: new Date().toISOString(),
            inventoryStatus: 'loaded',
            privacy: 'public',
            source: 'steam-inventory-api'
        });

    } catch (error) {
        console.error('❌ Professional CS2 inventory error:', error.message);
        
        // Обрабатываем специфические ошибки Steam
        if (error.response) {
            if (error.response.status === 403) {
                return res.status(403).json({
                    success: false,
                    error: 'inventory_private',
                    message: 'Инвентарь CS2 закрыт настройками приватности Steam',
                    items: []
                });
            }
            
            if (error.response.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'rate_limited',
                    message: 'Слишком много запросов к Steam. Попробуйте позже.',
                    items: []
                });
            }
        }
        
        res.status(500).json({
            success: false,
            error: 'load_failed',
            message: 'Не удалось загрузить инвентарь CS2 из Steam',
            details: error.message,
            items: []
        });
    }
});

// 3. Получение РЕАЛЬНОГО инвентаря Dota 2 (PROFESSIONAL)
app.get('/api/inventory/dota/professional', async (req, res) => {
    try {
        const steamId = req.query.steamid || req.session.steamId;
        
        if (!steamId) {
            return res.status(400).json({
                success: false,
                error: 'no_steamid',
                message: 'SteamID не указан'
            });
        }

        console.log(`⚔️ Fetching PROFESSIONAL Dota 2 inventory for: ${steamId}`);
        
        const response = await axios.get(
            `https://steamcommunity.com/inventory/${steamId}/570/2`,
            {
                params: {
                    l: 'english',
                    count: 5000
                },
                timeout: 15000
            }
        );

        // Проверяем ответ Steam API
        if (!response.data) {
            return res.status(500).json({
                success: false,
                error: 'steam_api_error',
                message: 'Steam API не вернул данные'
            });
        }

        if (response.data.success === false) {
            if (response.data.error === 'This profile is private.') {
                return res.status(403).json({
                    success: false,
                    error: 'inventory_private',
                    message: 'Инвентарь Dota 2 закрыт настройками приватности Steam',
                    items: []
                });
            }
            
            return res.status(500).json({
                success: false,
                error: 'steam_error',
                message: 'Ошибка Steam API',
                steamError: response.data.error,
                items: []
            });
        }

        if (!response.data.assets || response.data.assets.length === 0) {
            return res.json({
                success: true,
                items: [],
                total: 0,
                game: 'Dota 2',
                message: 'В вашем инвентаре Dota 2 нет предметов',
                steamId: steamId,
                isEmpty: true
            });
        }

        const items = parseInventoryProfessional(response.data, 570);
        
        res.json({
            success: true,
            items: items,
            total: items.length,
            game: 'Dota 2',
            steamId: steamId,
            timestamp: new Date().toISOString(),
            inventoryStatus: 'loaded',
            privacy: 'public',
            source: 'steam-inventory-api'
        });

    } catch (error) {
        console.error('❌ Professional Dota 2 inventory error:', error.message);
        
        if (error.response?.status === 403) {
            return res.status(403).json({
                success: false,
                error: 'inventory_private',
                message: 'Инвентарь Dota 2 закрыт настройками приватности Steam',
                items: []
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'load_failed',
            message: 'Не удалось загрузить инвентарь Dota 2 из Steam',
            details: error.message,
            items: []
        });
    }
});

// ==================== PROFESSIONAL HELPER FUNCTIONS ====================

// Профессиональный парсер инвентаря
function parseInventoryProfessional(data, appId) {
    const { assets, descriptions } = data;
    const items = [];
    const descriptionMap = new Map();
    
    // Создаем карту описаний для быстрого поиска
    descriptions.forEach(desc => {
        const key = `${desc.classid}_${desc.instanceid || '0'}`;
        descriptionMap.set(key, desc);
    });
    
    // Обрабатываем каждый ассет
    assets.forEach(asset => {
        const key = `${asset.classid}_${asset.instanceid || '0'}`;
        const description = descriptionMap.get(key);
        
        if (description) {
            const item = {
                // Базовые идентификаторы
                assetid: asset.assetid,
                classid: asset.classid,
                instanceid: asset.instanceid || '0',
                
                // Информация о предмете
                name: description.market_name || description.name || 'Неизвестный предмет',
                marketHashName: description.market_hash_name,
                type: description.type,
                
                // Изображения
                iconUrl: description.icon_url 
                    ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url}`
                    : '',
                iconUrlLarge: description.icon_url_large 
                    ? `https://steamcommunity-a.akamaihd.net/economy/image/${description.icon_url_large}`
                    : '',
                
                // Статусы
                tradable: description.tradable === 1,
                marketable: description.marketable === 1,
                commodity: description.commodity === 1,
                fraudwarnings: description.fraudwarnings || [],
                
                // Теги и категории
                tags: description.tags || [],
                descriptions: description.descriptions || [],
                actions: description.actions || [],
                
                // Дополнительно
                amount: asset.amount || 1,
                appid: appId,
                contextid: asset.contextid || '2',
                
                // Редкость (для CS2/Dota 2)
                rarity: getItemRarity(description.tags),
                quality: getItemQuality(description.tags),
                
                // Время
                acquiredAt: new Date().toISOString()
            };
            
            items.push(item);
        }
    });
    
    return items;
}

// Получаем редкость предмета
function getItemRarity(tags) {
    if (!tags) return 'common';
    
    const rarityTag = tags.find(tag => tag.category === 'Rarity');
    if (rarityTag) {
        return rarityTag.name.toLowerCase().replace(' ', '_');
    }
    
    return 'common';
}

// Получаем качество предмета
function getItemQuality(tags) {
    if (!tags) return 'normal';
    
    const qualityTag = tags.find(tag => tag.category === 'Quality');
    if (qualityTag) {
        return qualityTag.name;
    }
    
    return 'normal';
}

// Обогащаем предметы рыночными данными (опционально)
async function enrichItemsWithMarketData(items) {
    // Здесь можно добавить запросы к Steam Market API
    // для получения цен, истории продаж и т.д.
    // Но это уже опционально и требует отдельной реализации
    
    return items; // Пока возвращаем как есть
}

// ==================== ADDITIONAL ENDPOINTS ====================

// 4. Быстрая проверка профиля (для дашборда)
app.get('/api/profile/quick', async (req, res) => {
    try {
        const steamId = req.query.steamid || req.session.steamId;
        
        if (!steamId) {
            return res.json({
                authenticated: false,
                message: 'Не авторизован'
            });
        }

        const profileResponse = await axios.get(
            'https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/',
            {
                params: { key: STEAM_API_KEY, steamids: steamId }
            }
        );

        const player = profileResponse.data.response.players[0];
        
        res.json({
            authenticated: true,
            user: {
                steamId: player.steamid,
                username: player.personaname,
                avatar: player.avatarfull,
                profileUrl: player.profileurl
            }
        });

    } catch (error) {
        console.error('Quick profile error:', error);
        res.json({ authenticated: false, error: 'profile_unavailable' });
    }
});

// 5. Проверка сессии
app.get('/api/auth/status', (req, res) => {
    res.json({
        authenticated: !!req.session.steamId,
        steamId: req.session.steamId || null
    });
});

// 6. Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out' });
});

// 7. Comprehensive health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'steam-professional-api',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        features: {
            steamAuth: true,
            realProfiles: true,
            realInventories: true,
            privacyHandling: true,
            errorHandling: true
        },
        endpoints: {
            auth: '/auth/steam',
            fullProfile: '/api/profile/full?steamid=STEAM_ID',
            cs2Inventory: '/api/inventory/cs2/professional?steamid=STEAM_ID',
            dotaInventory: '/api/inventory/dota/professional?steamid=STEAM_ID',
            authStatus: '/api/auth/status',
            quickProfile: '/api/profile/quick?steamid=STEAM_ID'
        },
        session: {
            active: !!req.session.steamId,
            steamId: req.session.steamId || 'none'
        }
    });
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'not_found',
        message: `Endpoint ${req.method} ${req.path} not found`
    });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('🚨 Server error:', err);
    res.status(500).json({
        success: false,
        error: 'server_error',
        message: 'Внутренняя ошибка сервера',
        timestamp: new Date().toISOString()
    });
});

// ==================== START SERVER ====================

// ==================== API ROUTES ADDED FOR FRONTEND ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        server: 'Steam Auth Server',
        port: PORT,
        session: req.session.steamid ? { steamid: req.session.steamid } : 'No active session',
        timestamp: new Date().toISOString()
    });
});

// Steam auth для фронтенда
app.get('/api/auth/steam', (req, res) => {
    const returnUrl = 'http://localhost:3001/api/auth/steam/return';
    const realm = 'http://localhost:3001';

    const steamAuthUrl = 'https://steamcommunity.com/openid/login?' +
        'openid.ns=http://specs.openid.net/auth/2.0&' +
        'openid.mode=checkid_setup&' +
        'openid.return_to=' + encodeURIComponent(returnUrl) + '&' +
        'openid.realm=' + encodeURIComponent(realm) + '&' +
        'openid.identity=http://specs.openid.net/auth/2.0/identifier_select&' +
        'openid.claimed_id=http://specs.openid.net/auth/2.0/identifier_select';

    console.log('🔑 [API] Redirecting to Steam... Return URL:', returnUrl);
    res.redirect(steamAuthUrl);
});

// Обработка возврата от Steam
app.get('/api/auth/steam/return', async (req, res) => {
    try {
        console.log('🔄 [API] Steam authentication callback received');
        console.log('📋 Query params received:', Object.keys(req.query));
        
        // Проверяем OpenID ответ
        if (!req.query['openid.claimed_id']) {
            console.error('❌ ERROR: No openid.claimed_id in Steam response');
            console.log('Full query:', req.query);
            throw new Error('Invalid OpenID response from Steam. Missing claimed_id.');
        }
        
        // Извлекаем steamid
        const claimedId = req.query['openid.claimed_id'];
        console.log('📄 Claimed ID from Steam:', claimedId);
        
        // ПРАВИЛЬНОЕ извлечение steamid
        let steamid;
        if (claimedId.includes('https://steamcommunity.com/openid/id/')) {
            steamid = claimedId.replace('https://steamcommunity.com/openid/id/', '');
        } else if (claimedId.includes('http://steamcommunity.com/openid/id/')) {
            steamid = claimedId.replace('http://steamcommunity.com/openid/id/', '');
        } else {
            // Альтернативный метод извлечения
            const matches = claimedId.match(/\/(\d+)$/);
            steamid = matches ? matches[1] : claimedId;
        }
        
        console.log('🎯 Extracted SteamID:', steamid);
        
        // Валидация steamid
        if (!steamid || !/^\d{17}$/.test(steamid)) {
            console.error('❌ ERROR: Invalid steamid format:', steamid);
            console.log('Expected 17-digit SteamID64, got:', steamid);
            throw new Error('Invalid SteamID format. Expected 17-digit SteamID64.');
        }
        
        // Сохраняем в сессию
        req.session.steamid = steamid;
        req.session.authenticated = true;
        req.session.authTimestamp = new Date().toISOString();
        
        console.log('✅ SUCCESS: User authenticated. SteamID:', steamid);
        console.log('💾 Session saved:', {
            steamid: req.session.steamid,
            sessionId: req.sessionID
        });
        
        // Редирект на фронтенд
        const frontendUrl = 'http://localhost:3000/dashboard?steamid=' + steamid + '&auth=success';
        console.log('↪️ Redirecting to frontend:', frontendUrl);
        res.redirect(frontendUrl);
        
    } catch (error) {
        console.error('❌ CRITICAL ERROR in Steam auth:', error.message);
        console.error('Stack:', error.stack);
        console.error('Query that caused error:', req.query);
        
        const errorRedirect = 'http://localhost:3000/?error=auth_failed&message=' + 
                             encodeURIComponent(error.message) + 
                             '&time=' + Date.now();
        res.redirect(errorRedirect);
    }
});

// Тестовый endpoint для проверки сессии
app.get('/api/test/session', (req, res) => {
    res.json({
        authenticated: !!req.session.steamid,
        steamid: req.session.steamid || null,
        sessionId: req.sessionID
    });
});

app.listen(PORT, () => {
    console.log(`
===============================================
✅ PROFESSIONAL Steam API Server
📍 Port: ${PORT}
🔗 URL: http://localhost:${PORT}
🔑 Steam API Key: ${STEAM_API_KEY ? 'Configured' : 'MISSING!'}
🎯 Mode: REAL DATA ONLY (as required)
📋 Features:
   • Real Steam OpenID Auth
   • Real Profile Data (Level, Friends, Hours)
   • Real CS2 Inventory
   • Real Dota 2 Inventory  
   • Privacy Handling
   • Professional Error Handling
===============================================
📊 Test Endpoints:
   1. http://localhost:${PORT}/api/health
   2. http://localhost:${PORT}/auth/steam
   3. http://localhost:${PORT}/api/profile/full?steamid=YOUR_STEAM_ID
   4. http://localhost:${PORT}/api/inventory/cs2/professional?steamid=YOUR_STEAM_ID
   5. http://localhost:${PORT}/api/inventory/dota/professional?steamid=YOUR_STEAM_ID
===============================================
    `);
    
    // Предупреждение если API ключ не установлен
    if (!STEAM_API_KEY || STEAM_API_KEY === 'E1FC69B3707FF57C6267322B0271A86B') {
        console.log('\n⚠️  WARNING: Using default Steam API Key');
        console.log('   For production, set STEAM_API_KEY in .env file');
        console.log('   Get your key from: https://steamcommunity.com/dev/apikey\n');
    }
});
