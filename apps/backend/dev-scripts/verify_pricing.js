
const { priceEngine } = require('./src/services/price-engine.service');

async function testPricing() {
    console.log('--- Testing Pricing Intelligence ---');
    console.log('Fetching price for "AK-47 | Redline (Field-Tested)"...');

    try {
        const result = await priceEngine.getPrice('AK-47 | Redline (Field-Tested)', 730);

        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.suggested) {
            console.log('✅ Price fetched successfully');
            if (result.sources.steam && result.sources.buff) {
                console.log('✅ Derived Buff price present');
            }
        } else {
            console.log('❌ Failed to fetch price');
        }

    } catch (err) {
        console.error('Error:', err);
    }
}

testPricing();
