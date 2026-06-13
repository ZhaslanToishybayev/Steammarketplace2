const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        const client = await pool.connect();
        try {
            const res = await client.query("UPDATE users SET balance = balance + 1000 WHERE steam_id = '76561199257487454' RETURNING balance");
            console.log('New Balance:', res.rows[0].balance);
        } finally {
            client.release();
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();
