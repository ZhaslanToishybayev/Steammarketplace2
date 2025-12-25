const steaminventory = require('get-steam-inventory');
const axios = require('axios');
const { proxyService } = require('../services/proxy.service');

const STEAMID = '76561199257487454';
const APPID = 730;
const CONTEXTID = 2;

async function runTests() {
    console.log('🔍 Starting Deep Debug for SteamID:', STEAMID);

    // TEST 1: get-steam-inventory Package
    console.log('\n[1] Testing get-steam-inventory package...');
    try {
        const data = await steaminventory.getinventory(APPID, STEAMID, CONTEXTID);
        console.log('✅ Package Success!');
        console.log('Items found:', data.items ? data.items.length : 0);
        if (data.items && data.items.length > 0) {
            console.log('Sample item:', data.items[0].market_name);
        }
    } catch (err) {
        console.log('❌ Package Failed');
        console.log('Error Object:', JSON.stringify(err, null, 2));
        console.log('Error Message:', err.message);
    }

    // TEST 2: Direct Axios (No Proxy)
    console.log('\n[2] Testing Direct Axios (No Proxy)...');
    try {
        const url = `https://steamcommunity.com/inventory/${STEAMID}/${APPID}/${CONTEXTID}?l=english&count=75`;
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Referer': 'https://steamcommunity.com/profiles/' + STEAMID + '/inventory/'
            },
            timeout: 10000
        });
        console.log('✅ Direct Axios Success!');
        console.log('Status:', res.status);
        console.log('Total Inv Count:', res.data.total_inventory_count);
        console.log('Success flag:', res.data.success);
        console.log('RWGRSN code:', res.data.rwgrsn);
    } catch (err) {
        console.log('❌ Direct Axios Failed');
        if (err.response) {
            console.log('Status:', err.response.status);
            console.log('Data:', JSON.stringify(err.response.data));
        } else {
            console.log('Error:', err.message);
        }
    }

    // TEST 3: Axios WITH Proxy
    console.log('\n[3] Testing Axios WITH Proxy...');
    try {
        // Force load proxies if needed (assuming service does auto load, but let's check)
        // proxyService might need initialization if it relies on file reading that happened on startup
        // We will skip explicit init unless it fails, relying on the required instance

        const proxyConfig = proxyService.getAxiosConfig();
        const url = `https://steamcommunity.com/inventory/${STEAMID}/${APPID}/${CONTEXTID}?l=english&count=75`;

        console.log('Using Proxy:', proxyConfig ? 'YES' : 'NO');

        const res = await axios.get(url, {
            ...proxyConfig,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });
        console.log('✅ Proxy Axios Success!');
        console.log('RWGRSN code:', res.data.rwgrsn);
    } catch (err) {
        console.log('❌ Proxy Axios Failed');
        console.log('Error:', err.message);
    }

}

runTests();
