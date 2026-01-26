/**
 * Grafana Data Validator
 * Compares Prometheus metrics with Source of Truth (PostgreSQL)
 */

const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

const isDocker = process.env.NODE_ENV === 'production' || process.env.HOSTNAME;

const dbConfig = {
    user: process.env.POSTGRES_USER || 'steam_user',
    host: isDocker ? 'postgres' : 'localhost',
    database: process.env.POSTGRES_DB || 'steam_marketplace',
    password: process.env.POSTGRES_PASSWORD || 'steam_password',
    port: isDocker ? 5432 : 5435,
};

const prometheusUrl = isDocker ? 'http://prometheus:9090' : 'http://localhost:9090';

async function getPromMetric(query) {
    try {
        const res = await axios.get(`${prometheusUrl}/api/v1/query?query=${encodeURIComponent(query)}`);
        return res.data.data.result[0]?.value[1] || '0';
    } catch (e) {
        return 'ERR';
    }
}

async function validate() {
    console.log('📊 Starting Cross-Validation: Prometheus vs PostgreSQL\n');
    const pg = new Client(dbConfig);
    await pg.connect();

    const results = [];

    // 1. Bot Status
    const botDb = await pg.query("SELECT COUNT(*) FROM bots WHERE status = 'online'");
    const botProm = await getPromMetric('bots_online_total');
    results.push({ panel: 'Bot Status', db: botDb.rows[0].count, prom: botProm });

    // 2. Total Revenue
    const revDb = await pg.query("SELECT COALESCE(SUM(platform_fee), 0) as total FROM escrow_trades");
    const revProm = await getPromMetric('platform_fee_total');
    results.push({ panel: 'Total Revenue', db: parseFloat(revDb.rows[0].total).toFixed(2), prom: parseFloat(revProm).toFixed(2) });

    // 3. Trade Volume
    const volDb = await pg.query("SELECT COALESCE(SUM(price), 0) as total FROM escrow_trades");
    const volProm = await getPromMetric('trade_volume_total');
    results.push({ panel: 'Trade Volume', db: parseFloat(volDb.rows[0].total).toFixed(2), prom: parseFloat(volProm).toFixed(2) });

    // 4. Active Listings
    const listDb = await pg.query("SELECT COUNT(*) FROM listings WHERE status = 'active'");
    const listProm = await getPromMetric('active_listings_total');
    results.push({ panel: 'Active Listings', db: listDb.rows[0].count, prom: listProm });

    // 5. User Balances
    const balDb = await pg.query("SELECT COALESCE(SUM(balance), 0) as total FROM users");
    const balProm = await getPromMetric('user_balance_total');
    results.push({ panel: 'User Balances', db: parseFloat(balDb.rows[0].total).toFixed(2), prom: parseFloat(balProm).toFixed(2) });

    // 6. Bot Inventory
    const invDb = await pg.query("SELECT COUNT(*) FROM listings WHERE seller_steam_id = (SELECT steam_id FROM bots LIMIT 1)");
    const invProm = await getPromMetric('bot_inventory_size');
    results.push({ panel: 'Bot Inventory', db: invDb.rows[0].count, prom: invProm });

    // Print Results
    console.log('Panel Name'.padEnd(25) + ' | ' + 'PostgreSQL'.padEnd(15) + ' | ' + 'Prometheus'.padEnd(15) + ' | Status');
    console.log('-'.repeat(75));

    results.forEach(r => {
        const status = r.db.toString() === r.prom.toString() ? '✅ OK' : '❌ MISMATCH';
        console.log(r.panel.padEnd(25) + ' | ' + r.db.toString().padEnd(15) + ' | ' + r.prom.toString().padEnd(15) + ' | ' + status);
    });

    await pg.end();
    console.log('\nValidation Complete.');
}

validate().catch(console.error);
