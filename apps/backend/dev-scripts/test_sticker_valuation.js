const { calculateItemValue } = require('./src/services/external-pricing.service');
const { pool } = require('./src/config/database');

async function testValuation() {
    console.log('--- Testing Sticker Valuation ---');

    // 1. Mock Item: AK-47 | Redline (Field-Tested) with Titan Holo 2014
    const mockItem = {
        marketHashName: 'AK-47 | Redline (Field-Tested)',
        floatValue: 0.18,
        stickers: [
            { name: 'Titan (Holo) | Katowice 2014' },
            { name: 'iBUYPOWER (Holo) | Katowice 2014' },
            { name: 'Crown (Foil)' }
        ]
    };

    try {
        const value = await calculateItemValue(mockItem);
        console.log('Input:', mockItem.stickers.map(s => s.name));
        console.log('Result:', JSON.stringify(value, null, 2));

        if (value.stickerValue > 0) {
            console.log('✅ Success: Sticker value calculated:', value.stickerValue);
        } else {
            console.log('❌ Fail: No sticker value added.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

testValuation();
