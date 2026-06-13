const { pool } = require('../apps/backend/src/config/database');
const metrics = require('../apps/backend/src/services/metrics.service');

async function verify() {
    const steamId = '76561199257487454';
    const listingId = 104;
    const price = 0.03;
    const fee = 0.0015;

    console.log('--- Database Integrity Test ---');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Списание баланса
        await client.query("UPDATE users SET balance = balance - $1 WHERE steam_id = $2", [price, steamId]);
        
        // 2. Обновление листинга
        await client.query("UPDATE listings SET status = 'sold', updated_at = NOW() WHERE id = $1", [listingId]);
        
        // 3. Запись метрик (Проверяем, что функции вызываются без ошибок)
        metrics.recordTradeVolume(price);
        metrics.recordPlatformFee(fee);
        
        await client.query('COMMIT');
        console.log('✅ DB Transaction successful');
        
        // 4. Проверка результата
        const user = await client.query("SELECT balance FROM users WHERE steam_id = $1", [steamId]);
        console.log('New balance for ENTER:', user.rows[0].balance);
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Test failed:', e.message);
    } finally {
        client.release();
        process.exit(0);
    }
}
verify();
