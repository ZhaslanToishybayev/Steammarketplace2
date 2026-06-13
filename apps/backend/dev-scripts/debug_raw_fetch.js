const axios = require('axios');

const STEAMID = '76561199257487454';
const URL = `https://steamcommunity.com/profiles/${STEAMID}/inventory/json/730/2`;

console.log(`[Legacy JSON Check] Fetching ${URL}...`);

async function run() {
    try {
        const res = await axios.get(URL, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
            },
            validateStatus: () => true // Accept 403/404/500 to read body
        });

        console.log(`Status: ${res.status}`);
        const html = res.data;

        // Check for Privacy Message
        if (typeof html === 'string') {
            if (html.includes('This inventory is private')) {
                console.log('🚨 RESULT: "This inventory is private" found in HTML.');
            } else if (html.includes('This profile is private')) {
                console.log('🚨 RESULT: "This profile is private" found in HTML.');
            } else {
                console.log('✅ "This inventory/profile is private" text NOT found.');
            }

            // Check for Item counts in HTML
            if (html.includes('g_rgInventory')) {
                console.log('✅ "g_rgInventory" FOUND in HTML string.');
                const idx = html.indexOf('g_rgInventory');
                console.log('Snippet:', html.substring(idx, idx + 100));
            } else {
                console.log('❌ "g_rgInventory" NOT FOUND in HTML.');
            }

            if (html.includes('g_rgDescriptions')) {
                console.log('✅ "g_rgDescriptions" FOUND in HTML string.');
            } else {
                console.log('❌ "g_rgDescriptions" NOT FOUND in HTML.');
            }

            // Dump all vars
            const varMatches = html.match(/var\s+\w+\s*=\s*\{/g);
            if (varMatches) {
                console.log('Found JS Variables:', varMatches);
            }
            // Steam often puts data in g_rgAppContextData
            if (html.includes('var g_rgAppContextData =')) {
                const match = html.match(/var g_rgAppContextData = ({.*?});/s);
                if (match) {
                    try {
                        const data = JSON.parse(match[1]);
                        const cs2 = data['730'];
                        if (cs2) {
                            console.log('📦 HTML Data for CS2:', JSON.stringify(cs2, null, 2));
                        } else {
                            console.log('⚠️ No CS2 data in g_rgAppContextData');
                        }
                    } catch (e) {
                        console.log('⚠️ Failed to parse g_rgAppContextData');
                    }
                }
            } else {
                console.log('⚠️ g_rgAppContextData variable NOT found in HTML.');
            }
        } else {
            console.log('⚠️ Response is not a string (maybe JSON or binary?)');
        }

    } catch (e) {
        console.error('❌ Failed:', e.message);
    }
}

run();
