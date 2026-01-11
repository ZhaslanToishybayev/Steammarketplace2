
const axios = require('axios');

async function testSmartValuation() {
    console.log('--- Testing Smart Valuation ---');
    const API_URL = 'http://localhost:3001/api/inventory/price';

    const testItem = {
        name: 'AK-47 | Redline (Field-Tested)',
        stickers: ['Titan (Holo) | Katowice 2014', 'iBUYPOWER (Holo) | Katowice 2014'],
        float: 0.15 // Standard FT float
    };

    console.log('Test 1: Sticker Valuation');
    console.log('Item:', testItem.name);
    console.log('Stickers:', testItem.stickers);

    try {
        const res = await axios.post(API_URL, testItem);
        const data = res.data.data;

        console.log('Base Price:', data.suggested);
        console.log('Smart Valuation:', data.smartValuation);

        if (data.smartValuation && data.smartValuation.total > data.suggested) {
            console.log('✅ Sticker added value verified.');
        } else {
            console.error('❌ Sticker value NOT added.');
        }
    } catch (e) {
        console.error('Test 1 Failed:', e.response ? e.response.data : e.message);
    }

    console.log('\nTest 2: Low Float valuations');
    const floatItem = {
        name: 'Glock-18 | Fade (Factory New)',
        stickers: [],
        float: 0.001 // Low float
    };

    try {
        const res = await axios.post(API_URL, floatItem);
        const data = res.data.data;

        console.log('Base Price:', data.suggested);
        console.log('Smart Valuation:', data.smartValuation);

        if (data.smartValuation && data.smartValuation.breakdown.float > 0) {
            console.log('✅ Low Float overpay verified.');
        } else {
            console.error('❌ Float overpay NOT added.');
        }

    } catch (e) {
        console.error('Test 2 Failed:', e.response ? e.response.data : e.message);
    }
}

testSmartValuation();
