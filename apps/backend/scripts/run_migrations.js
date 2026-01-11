const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');

// Migration files to run in order
const MIGRATIONS = [
    // '001_escrow_tables.sql',
    // '002_add_users_balance.sql',
    '003_add_stickers_column.sql'
];

async function runMigrations() {
    console.log('🚀 Starting database migrations...');
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (const file of MIGRATIONS) {
            const filePath = path.join(__dirname, '../migrations', file);
            if (fs.existsSync(filePath)) {
                console.log(`Running ${file}...`);
                const sql = fs.readFileSync(filePath, 'utf8');
                await client.query(sql);
                console.log(`✅ ${file} applied successfully.`);
            } else {
                console.warn(`⚠️ Migration file ${file} not found!`);
            }
        }

        await client.query('COMMIT');
        console.log('🎉 All migrations completed successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run if main
if (require.main === module) {
    runMigrations();
}
