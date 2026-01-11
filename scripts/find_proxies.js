const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

const SOURCES = [
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/http.txt',
    'https://raw.githubusercontent.com/ShiftyTR/Proxy-List/master/https.txt',
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
    'https://raw.githubusercontent.com/hookzof/socks5_list/master/proxy.txt', // axios supports http/https, socks needs agent. stick to http
    'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/http/data.txt',
    'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/protocols/https/data.txt',
];

const TARGET_URL = 'https://steamcommunity.com/login/home/';
const OUTPUT_FILE = path.join(__dirname, '../apps/backend/proxies.txt');
const CONCURRENCY = 50;

async function fetchProxies() {
    console.log('📥 Fetching raw proxy lists...');
    const proxies = new Set();

    for (const url of SOURCES) {
        try {
            console.log(`   Fetching ${url}...`);
            const { data } = await axios.get(url, { timeout: 5000 });
            data.split('\n').forEach(line => {
                const proxy = line.trim();
                if (proxy && proxy.includes(':')) {
                    proxies.add(proxy);
                }
            });
        } catch (e) {
            console.warn(`   Failed to fetch ${url}: ${e.message}`);
        }
    }
    return Array.from(proxies);
}

async function verifyProxy(proxy) {
    const formatted = proxy.startsWith('http') ? proxy : `http://${proxy}`;
    const agent = new HttpsProxyAgent(formatted);

    const start = Date.now();
    try {
        const res = await axios.get(TARGET_URL, {
            httpsAgent: agent,
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'
            },
            proxy: false // Important for httpsAgent
        });

        if (res.status === 200) {
            const latency = Date.now() - start;
            return { proxy, latency };
        }
    } catch (e) {
        // console.log(`Failed ${proxy}: ${e.message}`);
    }
    return null;
}

// Simple worker pool implementation for checking
async function checkProxies(proxies) {
    console.log(`🕵️ Checking ${proxies.length} proxies (Concurrency: ${CONCURRENCY})...`);

    const working = [];
    let index = 0;
    let completed = 0;

    const next = async () => {
        if (index >= proxies.length) return;
        const currentProxy = proxies[index++];

        if (index % 100 === 0) process.stdout.write(`\rProgress: ${index}/${proxies.length} | Working: ${working.length}`);

        const result = await verifyProxy(currentProxy);
        if (result) {
            working.push(result);
            // Save immediately just in case
            fs.appendFileSync(OUTPUT_FILE, `${result.proxy}\n`);
        }

        await next();
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) {
        workers.push(next());
    }

    await Promise.all(workers);
    console.log(`\n✅ Finished. Found ${working.length} working proxies.`);
    return working;
}

async function main() {
    // Clear old file
    if (fs.existsSync(OUTPUT_FILE)) {
        fs.writeFileSync(OUTPUT_FILE, '');
    }

    const allProxies = await fetchProxies();
    console.log(`Total unique IPs found: ${allProxies.length}`);

    // Sort random to mix providers
    allProxies.sort(() => Math.random() - 0.5);

    // Take top 2000 to check to save time
    const toCheck = allProxies.slice(0, 2000);

    await checkProxies(toCheck);

    console.log(`\n💾 Saved working proxies to ${OUTPUT_FILE}`);
}

main();
