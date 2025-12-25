const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');

const STEAMID = '76561199257487454';
const PROXY_FILE = path.join(__dirname, '../../proxies.txt');

async function testAll() {
    const file = fs.readFileSync(PROXY_FILE, 'utf8');
    const proxies = file.split('\n').filter(p => p.trim());

    console.log(`Loaded ${proxies.length} proxies.`);

    for (const proxy of proxies) {
        console.log(`\nTesting proxy: ${proxy}`);
        try {
            const agent = new HttpsProxyAgent(`http://${proxy}`);
            const url = `https://steamcommunity.com/inventory/${STEAMID}/730/2?l=english&count=75`;

            const res = await axios.get(url, {
                httpsAgent: agent,
                timeout: 5000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Referer': 'https://steamcommunity.com/profiles/' + STEAMID + '/inventory/'
                }
            });

            console.log('STATUS:', res.status);
            console.log('RWGRSN:', res.data.rwgrsn);
            console.log('SUCCESS:', res.data.success);
            if (res.data.assets) {
                console.log('✅ Found Items:', res.data.assets.length);
                process.exit(0); // Stop if we find one!
            }

        } catch (err) {
            console.log('❌ Failed:', err.message);
            if (err.response) {
                console.log('Response:', err.response.status, err.response.data);
            }
        }
    }
    console.log('Finished all proxies.');
}

testAll();
