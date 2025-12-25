const { pool } = require('./src/config/database');

async function resetDb() {
    try {
        console.log('🗑️ Dropping all tables...');
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        console.log('✅ Database reset successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error resetting DB:', err);
        process.exit(1);
    }
}

resetDb();
