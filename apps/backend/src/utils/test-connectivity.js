const https = require('https');

console.log('Testing connection to https://steamcommunity.com/openid');

const options = {
    hostname: 'steamcommunity.com',
    port: 443,
    path: '/openid',
    method: 'GET',
    headers: {
        // Intentionally omitting User-Agent first to see if that's the issue
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    res.on('end', () => {
        console.log(`BODY LENGTH: ${data.length}`);
        console.log(`Has openid.server: ${data.includes('openid.server')}`);
        console.log(`Has openid2.provider: ${data.includes('openid2.provider')}`);
        console.log(`Preview: ${data.substring(0, 500)}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
