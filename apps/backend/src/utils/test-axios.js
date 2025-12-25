const axios = require('axios');
const { proxyService } = require('../services/proxy.service');

async function test() {
    console.log('Testing Axios + Proxy + Timeout...');

    const proxyConfig = proxyService.getAxiosConfig();
    console.log('Proxy Config:', proxyConfig ? 'USING PROXY' : 'DIRECT');

    const config = {
        ...proxyConfig,
        timeout: 3000, // 3 seconds strict
        validateStatus: () => true
    };

    const start = Date.now();
    try {
        console.log('Sending request...');
        // Request a URL that might be slow or just normal Google
        // Or steam community
        await axios.get('https://steamcommunity.com/inventory/76561199257487454/730/2?l=english&count=100', config);
        console.log(`Success! Took ${(Date.now() - start)}ms`);
    } catch (err) {
        console.log(`Failed! Took ${(Date.now() - start)}ms`);
        console.error('Error:', err.message);
    }
}

test();
