/**
 * Database Configuration
 * PostgreSQL connection for escrow system
 */

const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USER || 'steam_user',
    password: process.env.POSTGRES_PASSWORD || 'steam_password',
    database: process.env.POSTGRES_DB || 'steam_marketplace',
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE || '10000'),
    connectionTimeoutMillis: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
});

// Test connection on startup
pool.on('connect', () => {
    console.log('📦 PostgreSQL connected');
});

pool.on('error', (err) => {
    console.error('❌ PostgreSQL pool error:', err.message);

    // Attempt to reconnect on connection errors
    if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ENOTFOUND') {
        console.log('🔄 Database connection lost. Pool will auto-reconnect on next query.');
    }

    // Log critical errors but don't crash - let the pool recover
    if (err.fatal) {
        console.error('🚨 Fatal database error. Manual intervention may be required.');
    }
});

/**
 * Execute a query
 * @param {string} text SQL query
 * @param {Array} params Query parameters
 * @returns {Promise<Object>} Query result
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.LOG_LEVEL === 'debug') {
        console.log('📝 Query executed:', { text, duration: `${duration}ms`, rows: result.rowCount });
    }

    return result;
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
    return pool.connect();
}

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const result = await query('SELECT NOW()');
        console.log('✅ Database connection test passed:', result.rows[0].now);
        return true;
    } catch (err) {
        console.error('❌ Database connection test failed:', err.message);
        return false;
    }
}

/**
 * Initialize database tables if they don't exist
 */
async function initializeTables() {
    try {
        // Check if escrow_trades table exists
        const result = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'escrow_trades'
      );
    `);

        if (result.rows[0].exists) {
            console.log('✅ Escrow tables already exist');
            return true;
        }

        console.log('⚠️ Escrow tables not found. Run migrations/001_escrow_tables.sql');
        return false;
    } catch (err) {
        console.error('❌ Failed to check tables:', err.message);
        return false;
    }
}

module.exports = {
    pool,
    query,
    getClient,
    testConnection,
    initializeTables,
};
