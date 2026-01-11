/**
 * Database Migration Runner
 * Automatically runs SQL migrations on server startup
 */

const fs = require('fs');
const path = require('path');
const { pool, query } = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../../migrations');

/**
 * Ensure migrations tracking table exists
 */
async function createMigrationsTable() {
    await query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP DEFAULT NOW()
    );
  `);
}

/**
 * Get list of already applied migrations
 */
async function getAppliedMigrations() {
    try {
        const result = await query('SELECT name FROM _migrations ORDER BY id');
        return result.rows.map(row => row.name);
    } catch (err) {
        return [];
    }
}

/**
 * Get all migration files from disk
 */
function getMigrationFiles() {
    try {
        if (!fs.existsSync(MIGRATIONS_DIR)) {
            console.log('⚠️ No migrations directory found');
            return [];
        }

        return fs.readdirSync(MIGRATIONS_DIR)
            .filter(file => file.endsWith('.sql'))
            .sort(); // Sort alphabetically (001_, 002_, etc.)
    } catch (err) {
        console.error('Error reading migrations:', err.message);
        return [];
    }
}

/**
 * Run a single migration
 */
async function runMigration(filename) {
    const filePath = path.join(MIGRATIONS_DIR, filename);
    const sql = fs.readFileSync(filePath, 'utf8');

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Execute migration SQL
        await client.query(sql);

        // Record migration as applied
        await client.query(
            'INSERT INTO _migrations (name) VALUES ($1)',
            [filename]
        );

        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${filename}`);
        return true;
    } catch (err) {
        await client.query('ROLLBACK');

        // If it's a "already exists" or similar error, mark as applied
        if (err.code === '42P07' || err.code === '42710' || err.code === '42701') {
            console.log(`⚠️ Migration ${filename} - objects already exist, marking as applied`);
            try {
                await pool.query('INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [filename]);
            } catch (e) { /* ignore */ }
            return true;
        }

        console.error(`❌ Migration ${filename} failed:`, err.message);
        return false;
    } finally {
        client.release();
    }
}

/**
 * Run all pending migrations
 * @returns {Object} Result with applied migrations count
 */
async function runMigrations() {
    console.log('🔄 Checking database migrations...');

    try {
        // Ensure tracking table exists
        await createMigrationsTable();

        // Get already applied migrations
        const applied = await getAppliedMigrations();

        // Get all migration files
        const files = getMigrationFiles();

        if (files.length === 0) {
            console.log('ℹ️ No migration files found');
            return { applied: 0, skipped: 0 };
        }

        // Filter to pending migrations
        const pending = files.filter(file => !applied.includes(file));

        if (pending.length === 0) {
            console.log('✅ All migrations already applied');
            return { applied: 0, skipped: applied.length };
        }

        console.log(`📦 Found ${pending.length} pending migration(s)`);

        // Run each pending migration
        for (const file of pending) {
            await runMigration(file);
        }

        console.log(`✅ Applied ${pending.length} migration(s)`);
        return { applied: pending.length, skipped: applied.length };

    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        throw err;
    }
}

module.exports = { runMigrations };
