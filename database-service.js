// DATABASE INTEGRATION - PostgreSQL Setup
// =====================================
// Replace in-memory storage with PostgreSQL database

const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  user: 'steam_user',
  host: 'localhost',
  database: 'steam_marketplace',
  password: 'steam_password',
  port: 5432,
};

// Initialize database connection pool
const pool = new Pool(dbConfig);

// Database initialization queries
const initDatabase = async () => {
  try {
    console.log('🗄️ Initializing PostgreSQL database...');

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        steam_id VARCHAR(20) UNIQUE NOT NULL,
        nickname VARCHAR(255) NOT NULL,
        avatar TEXT,
        profile_url TEXT,
        trade_url TEXT,
        api_key VARCHAR(255) UNIQUE,
        api_key_last_verified TIMESTAMP,
        api_key_status VARCHAR(50) DEFAULT 'active',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create user_stats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        total_trades INTEGER DEFAULT 0,
        successful_trades INTEGER DEFAULT 0,
        cancelled_trades INTEGER DEFAULT 0,
        total_spent DECIMAL(10,2) DEFAULT 0.00,
        total_earned DECIMAL(10,2) DEFAULT 0.00,
        items_listed INTEGER DEFAULT 0,
        items_sold INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create inventory_cache table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS inventory_cache (
        id SERIAL PRIMARY KEY,
        steam_id VARCHAR(20) NOT NULL,
        app_id VARCHAR(10) NOT NULL,
        inventory_data JSONB,
        method_used VARCHAR(50),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(steam_id, app_id)
      )
    `);

    // Create trading_listings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trading_listings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        steam_id VARCHAR(20) NOT NULL,
        asset_id VARCHAR(50) NOT NULL,
        class_id VARCHAR(50) NOT NULL,
        instance_id VARCHAR(50),
        app_id VARCHAR(10) NOT NULL,
        item_name VARCHAR(255),
        item_type VARCHAR(100),
        rarity VARCHAR(50),
        quality VARCHAR(50),
        exterior VARCHAR(50),
        tradable BOOLEAN DEFAULT true,
        marketable BOOLEAN DEFAULT true,
        price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP
      )
    `);

    // Create trade_offers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trade_offers (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER REFERENCES trading_listings(id) ON DELETE CASCADE,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        offered_price DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        message TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_steam_id ON users(steam_id);
      CREATE INDEX IF NOT EXISTS idx_inventory_cache_steam_app ON inventory_cache(steam_id, app_id);
      CREATE INDEX IF NOT EXISTS idx_listings_user_id ON trading_listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_listings_status ON trading_listings(status);
    `);

    console.log('✅ Database tables created successfully');

    // Insert default admin user if doesn't exist
    const adminSteamId = '76561198012345678';
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE steam_id = $1',
      [adminSteamId]
    );

    if (existingUser.rows.length === 0) {
      await pool.query(`
        INSERT INTO users (
          steam_id, nickname, avatar, profile_url, trade_url, api_key,
          api_key_last_verified, api_key_status, is_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9
        )
      `, [
        adminSteamId,
        'AdminUser',
        'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/fallback/fallback_bighead.png',
        'https://steamcommunity.com/profiles/76561198012345678',
        'https://steamcommunity.com/trade/123456789/tradeoffers/',
        'admin_api_key_12345',
        new Date().toISOString(),
        'active',
        true
      ]);

      // Insert default stats
      const userResult = await pool.query('SELECT id FROM users WHERE steam_id = $1', [adminSteamId]);
      const userId = userResult.rows[0].id;

      await pool.query(`
        INSERT INTO user_stats (user_id, total_trades, successful_trades, cancelled_trades, total_spent, total_earned, items_listed, items_sold)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [userId, 15, 12, 3, 250.50, 320.00, 8, 5]);

      console.log('✅ Default admin user created');
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
    throw error;
  }
};

// Database service methods
const DatabaseService = {
  // Users
  async getUserById(id) {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  },

  async getUserBySteamId(steamId) {
    const result = await pool.query('SELECT * FROM users WHERE steam_id = $1', [steamId]);
    return result.rows[0];
  },

  async createUser(userData) {
    const {
      steamId, nickname, avatar, profileUrl, tradeUrl, apiKey,
      apiKeyLastVerified, apiKeyStatus, isActive
    } = userData;

    const result = await pool.query(`
      INSERT INTO users (
        steam_id, nickname, avatar, profile_url, trade_url, api_key,
        api_key_last_verified, api_key_status, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) RETURNING *
    `, [steamId, nickname, avatar, profileUrl, tradeUrl, apiKey, apiKeyLastVerified, apiKeyStatus, isActive]);

    // Create default stats
    await pool.query(`
      INSERT INTO user_stats (user_id, total_trades, successful_trades, cancelled_trades, total_spent, total_earned, items_listed, items_sold)
      VALUES ($1, 0, 0, 0, 0.00, 0.00, 0, 0)
    `, [result.rows[0].id]);

    return result.rows[0];
  },

  async updateUser(id, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await pool.query(
      `UPDATE users SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...Object.values(updates)]
    );

    return result.rows[0];
  },

  // Inventory Cache
  async getInventoryCache(steamId, appId) {
    const result = await pool.query(
      'SELECT * FROM inventory_cache WHERE steam_id = $1 AND app_id = $2',
      [steamId, appId]
    );
    return result.rows[0];
  },

  async setInventoryCache(steamId, appId, inventoryData, method) {
    await pool.query(`
      INSERT INTO inventory_cache (steam_id, app_id, inventory_data, method_used, last_updated)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (steam_id, app_id)
      DO UPDATE SET
        inventory_data = EXCLUDED.inventory_data,
        method_used = EXCLUDED.method_used,
        last_updated = EXCLUDED.last_updated
    `, [steamId, appId, JSON.stringify(inventoryData), method]);
  },

  // Trading Listings
  async createTradingListing(listingData) {
    const {
      userId, steamId, assetId, classId, instanceId, appId,
      itemName, itemType, rarity, quality, exterior,
      tradable, marketable, price, currency, expiresAt
    } = listingData;

    const result = await pool.query(`
      INSERT INTO trading_listings (
        user_id, steam_id, asset_id, class_id, instance_id, app_id,
        item_name, item_type, rarity, quality, exterior,
        tradable, marketable, price, currency, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
      ) RETURNING *
    `, [
      userId, steamId, assetId, classId, instanceId, appId,
      itemName, itemType, rarity, quality, exterior,
      tradable, marketable, price, currency, expiresAt
    ]);

    return result.rows[0];
  },

  async getUserListings(userId) {
    const result = await pool.query(`
      SELECT * FROM trading_listings
      WHERE user_id = $1 AND status = 'active'
      ORDER BY created_at DESC
    `, [userId]);

    return result.rows;
  },

  async getAllActiveListings(limit = 100) {
    const result = await pool.query(`
      SELECT tl.*, u.nickname as seller_name
      FROM trading_listings tl
      JOIN users u ON tl.user_id = u.id
      WHERE tl.status = 'active'
      ORDER BY tl.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  },

  async updateListingStatus(listingId, status) {
    const result = await pool.query(
      'UPDATE trading_listings SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, listingId]
    );
    return result.rows[0];
  },

  // User Stats
  async getUserStats(userId) {
    const result = await pool.query(`
      SELECT us.* FROM user_stats us
      WHERE us.user_id = $1
    `, [userId]);

    return result.rows[0];
  },

  async updateUserStats(userId, statsUpdates) {
    const setClause = Object.keys(statsUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const result = await pool.query(`
      UPDATE user_stats SET ${setClause}, updated_at = NOW() WHERE user_id = $1 RETURNING *
    `, [userId, ...Object.values(statsUpdates)]);

    return result.rows[0];
  }
};

// Test database connection
const testDatabaseConnection = async () => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', result.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
};

module.exports = {
  pool,
  initDatabase,
  testDatabaseConnection,
  DatabaseService
};