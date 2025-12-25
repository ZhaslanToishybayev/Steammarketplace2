const axios = require('axios');
const cheerio = require('cheerio'); // Using regex if cheerio missing, but let's try basic regex
const { proxyService } = require('../services/proxy.service');

const STEAMID = '76561199257487454';

async function checkProfile() {
    console.log('🔍 Checking Profile HTML for:', STEAMID);

    const url = `https://steamcommunity.com/profiles/${STEAMID}`;

    try {
        const res = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const html = res.data;

        // Check for "This profile is private"
        const isPrivate = html.includes('This profile is private');
        console.log('HTML "Private" msg found:', isPrivate);

        // Check for "Inventory" link/count
        // Usually looks like: <span class="count_link_label">Inventory</span> <span class="count_link_total">1</span>
        const inventoryMatch = html.match(/Inventory\s*<\/span>\s*<span class="count_link_total">([\d,]+)<\/span>/);

        if (inventoryMatch) {
            console.log('✅ Found Inventory Count in HTML:', inventoryMatch[1]);
        } else {
            console.log('❌ No Inventory Count found in HTML');
        }

        // Check raw inventory link presence
        if (html.includes('href="https://steamcommunity.com/profiles/' + STEAMID + '/inventory/"')) {
            console.log('✅ Inventory Link exists');
        } else {
            console.log('❌ Inventory Link NOT found');
        }

    } catch (err) {
        console.error('Failed to fetch profile:', err.message);
    }
}

checkProfile();
