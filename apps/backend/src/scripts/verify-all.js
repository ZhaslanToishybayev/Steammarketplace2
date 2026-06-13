/**
 * System Verification Script (Smoke Test)
 * Checks health of DB, Redis, Bot, and Monitoring services.
 */

const axios = require('axios');
const { Client } = require('pg');
const Redis = require('ioredis');
require('dotenv').config();

// Configuration from environment
const isDocker = process.env.NODE_ENV === 'production' || process.env.HOSTNAME;

const dbConfig = {
    user: process.env.POSTGRES_USER || 'steam_user',
    host: isDocker ? 'postgres' : 'localhost', 
    database: process.env.POSTGRES_DB || 'steam_marketplace',
    password: process.env.POSTGRES_PASSWORD || 'steam_password',
    port: isDocker ? 5432 : 5435, 
};

const redisUrl = isDocker ? 'redis://redis:6379' : 'redis://localhost:6385';
const apiBase = isDocker ? 'http://localhost:3001' : 'http://localhost:3001';
const prometheusUrl = isDocker ? 'http://prometheus:9090' : 'http://localhost:9090';
const grafanaUrl = isDocker ? 'http://grafana:3000' : 'http://localhost:3300';

async function verify() {
    console.log('🔍 Starting System Smoke Test...\n');
    let allOk = true;

    // 1. Check Database
    console.log('1️⃣ Checking PostgreSQL...');
    const client = new Client(dbConfig);
    try {
        await client.connect();
        const res = await client.query('SELECT COUNT(*) FROM users');
        console.log(`✅ DB Connected. Total users: ${res.rows[0].count}`);
        await client.end();
    } catch (err) {
        console.error(`❌ DB Connection failed: ${err.message}`);
        allOk = false;
    }

    // 2. Check Redis
    console.log('\n2️⃣ Checking Redis...');
    const redis = new Redis(redisUrl);
    try {
        const pong = await redis.ping();
        const dbsize = await redis.dbsize();
        console.log(`✅ Redis Connected (${pong}). Keys in DB: ${dbsize}`);
        redis.disconnect();
    } catch (err) {
        console.error(`❌ Redis Connection failed: ${err.message}`);
        allOk = false;
    }

    // 3. Check Backend API
    console.log('\n3️⃣ Checking Backend API...');
    try {
        const res = await axios.get(`${apiBase}/api/health`, { timeout: 2000 });
        console.log(`✅ API Healthy: ${res.data.status}`);
        if (!res.data.steam_configured) {
            console.warn('⚠️ Warning: Steam API not fully configured in backend');
        }
    } catch (err) {
        console.error(`❌ API Health check failed: ${err.message}`);
        allOk = false;
    }

    // 4. Check Monitoring (Prometheus)
    console.log('\n4️⃣ Checking Prometheus...');
    try {
        const res = await axios.get(`${prometheusUrl}/-/healthy`, { timeout: 2000 });
        const targets = await axios.get(`${prometheusUrl}/api/v1/targets`);
        const upTargets = targets.data.data.activeTargets.filter(t => t.health === 'up').length;
        const totalTargets = targets.data.data.activeTargets.length;
        console.log(`✅ Prometheus Healthy. Targets UP: ${upTargets}/${totalTargets}`);
    } catch (err) {
        console.error(`❌ Prometheus check failed: ${err.message}`);
        allOk = false;
    }

    // 5. Check Bot Status (via API)
    console.log('\n5️⃣ Checking Steam Bot Status...');
    try {
        // Query Prometheus for bot status
        const res = await axios.get(`${prometheusUrl}/api/v1/query?query=bots_online_total`);
        const online = (res.data.data.result[0] && res.data.data.result[0].value) ? res.data.data.result[0].value[1] : '0';
        console.log(`✅ Online Bots (Prometheus): ${online}`);
        
        const inventoryRes = await axios.get(`${prometheusUrl}/api/v1/query?query=bot_inventory_size`);
        const items = (inventoryRes.data.data.result[0] && inventoryRes.data.data.result[0].value) ? inventoryRes.data.data.result[0].value[1] : '0';
        console.log(`✅ Bot Inventory Size: ${items} items`);
    } catch (err) {
        console.error(`❌ Bot Status check failed: ${err.message}`);
    }

    // 6. Check Grafana
    console.log('\n6️⃣ Checking Grafana Dashboard...');
    try {
        const res = await axios.get(`${grafanaUrl}/api/health`, { timeout: 2000 });
        console.log(`✅ Grafana Healthy: version ${res.data.version}`);
    } catch (err) {
        console.error(`❌ Grafana check failed: ${err.message}`);
        allOk = false;
    }

    console.log('\n-----------------------------------');
    if (allOk) {
        console.log('🏆 SYSTEM STATUS: PERFECT ✅');
    } else {
        console.log('⚠️ SYSTEM STATUS: ISSUES FOUND ❌');
    }
    console.log('-----------------------------------\n');
}

verify().catch(console.error);
