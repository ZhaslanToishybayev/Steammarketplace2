const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function runTraffic() {
    console.log('🚀 Starting Traffic Generation...');

    // 1. Test Cache & Rate Limit (Steam Market Items)
    console.log('\n📊 Testing Steam Market Items API (Cache & Rate Limit)...');
    
    // First request (Cache MISS)
    try {
        console.log('Request 1 (Expect Cache MISS)...');
        const start = Date.now();
        await axios.get(`${BASE_URL}/analytics/steam-market-items?limit=5`);
        console.log(`✅ Request 1 finished in ${(Date.now() - start)/1000}s`);
    } catch (e) { console.error('Request 1 failed:', e.message); }

    // Second request (Cache HIT)
    try {
        console.log('Request 2 (Expect Cache HIT)...');
        const start = Date.now();
        await axios.get(`${BASE_URL}/analytics/steam-market-items?limit=5`);
        console.log(`✅ Request 2 finished in ${(Date.now() - start)/1000}s`);
    } catch (e) { console.error('Request 2 failed:', e.message); }

    // 2. Test Rate Limit (Burst requests)
    console.log('\n⚡ Testing Rate Limiter (Burst 25 requests)...');
    const promises = [];
    for (let i = 0; i < 25; i++) {
        promises.push(
            axios.get(`${BASE_URL}/analytics/steam-market-items?limit=1`)
                .then(() => process.stdout.write('.'))
                .catch(e => {
                    if (e.response?.status === 429) process.stdout.write('x'); // Rate limited
                    else process.stdout.write('E');
                })
        );
    }
    await Promise.all(promises);
    console.log('\n✅ Burst finished.');

    // 3. Check Metrics
    console.log('\n📈 Verifying Metrics...');
    try {
        const metricsRes = await axios.get('http://localhost:3001/metrics');
        const metrics = metricsRes.data;
        
        const cacheHits = metrics.match(/redis_cache_hits_total[^}]*} (\d+)/)?.[1] || 0;
        const cacheMisses = metrics.match(/redis_cache_misses_total[^}]*} (\d+)/)?.[1] || 0;
        const rateLimitHits = metrics.match(/steam_api_rate_limit_hits (\d+)/)?.[1] || 0;
        const apiCalls = metrics.match(/steam_api_calls_total[^}]*} (\d+)/)?.[1] || 0;

        console.log('-----------------------------------');
        console.log(`Redis Cache Hits:   ${cacheHits}`);
        console.log(`Redis Cache Misses: ${cacheMisses}`);
        console.log(`Rate Limit Hits:    ${rateLimitHits}`);
        console.log(`Steam API Calls:    ${apiCalls}`);
        console.log('-----------------------------------');
        
    } catch (e) { console.error('Failed to fetch metrics:', e.message); }
}

runTraffic();
