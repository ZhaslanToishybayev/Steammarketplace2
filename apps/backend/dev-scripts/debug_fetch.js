const axios = require('axios');
const { proxyService } = require('./src/services/proxy.service');
const steaminventory = require('get-steam-inventory');

const STEAM_ID = '76561198034202275'; // S1mple (Public)
const APP_ID = '730';
const CONTEXT_ID = '2';
const API_KEY = 'E1FC69B3707FF57C6267322B0271A86B';

async function testStrategies() {
    console.log(`🔍 Testing Inventory Fetch for ${STEAM_ID}...`);
    console.log(`ℹ️  Proxies loaded: ${proxyService.proxies.length}`);

    // 1. API
    try {
        console.log('\n--- Strategy 1: Steam Web API (Direct/Proxy) ---');
        const url = `https://api.steampowered.com/IEconService/GetInventoryItemsWithDescriptions/v1/?key=${API_KEY}&steamid=${STEAM_ID}&appid=${APP_ID}&contextid=${CONTEXT_ID}&getDescriptions=1&count=5`;
        console.log('URL:', url.replace(API_KEY, 'HIDDEN'));

        // Use proxy config from service
        const config = proxyService.getAxiosConfig();
        const res = await axios.get(url, config);

        console.log('✅ Status:', res.status);
        console.log('   Items:', res.data?.result?.assets?.length || 0);
    } catch (e) {
        console.log('❌ Failed:', e.message);
        if (e.response) {
            console.log('   Data:', JSON.stringify(e.response.data));
        }
    }

    // 2. Scraping (Axios)
    try {
        console.log('\n--- Strategy 2: Axios Scraping (With Proxy) ---');
        const url = `https://steamcommunity.com/inventory/${STEAM_ID}/${APP_ID}/${CONTEXT_ID}`;
        console.log('URL:', url);

        // Use proxy config from service
        const config = proxyService.getAxiosConfig();

        const res = await axios.get(url, config);
        console.log('✅ Status:', res.status);
        console.log('   Assets:', res.data?.assets?.length || 0);
    } catch (e) {
        console.log('❌ Failed:', e.message);

        // Report bad proxy if relevant
        if (e.code === 'ECONNRESET' || e.response?.status === 403) {
            // proxyService.reportBadProxy(...) - logic in service
            console.log('   (Likely proxy or rate limit issue)');
        }

        if (e.response) {
            console.log('   Status:', e.response.status);
        }
    }

    // 3. Package (No Proxy support in this lib usually, skipping or wrapping if possible)
    console.log('\n--- Strategy 3: get-steam-inventory (Skipping - no native proxy support) ---');
}

testStrategies();
