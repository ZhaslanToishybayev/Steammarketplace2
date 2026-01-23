import { MarketplaceGrid } from '../../../components/marketplace/MarketplaceGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Marketplace - Buy CS2 Skins',
    description: 'Browse thousands of CS2 skins available for instant purchase with secure escrow.',
};

// Force dynamic rendering since listings change frequently
export const dynamic = 'force-dynamic';

// Helper function to convert backend listing format to frontend format
function formatListing(listing: any) {
    // Build Steam CDN URLs
    let rawIconUrl = listing.item_icon_url || listing.icon_url || '';

    // Fix: Check if already full URL (from DB)
    if (rawIconUrl && !rawIconUrl.startsWith('http')) {
        rawIconUrl = `https://community.steamstatic.com/economy/image/${rawIconUrl}`;
    }

    const steamIconUrl = rawIconUrl;
    const steamImageUrl = rawIconUrl ? `${rawIconUrl}/360fx360f` : '';

    return {
        id: listing.id?.toString() || `steam-${Math.random().toString(36).substr(2, 9)}`,
        price: parseFloat(listing.price) || 0,
        createdAt: listing.created_at || new Date().toISOString(),
        item: {
            name: listing.item_name || listing.name || listing.market_hash_name,
            marketHashName: listing.item_market_hash_name || listing.market_hash_name,
            iconUrl: steamIconUrl ? `/image-proxy?url=${encodeURIComponent(steamIconUrl)}` : '',
            image: steamImageUrl ? `/image-proxy?url=${encodeURIComponent(steamImageUrl)}` : '',
            rarity: { name: listing.item_rarity || listing.rarity || 'Unknown' },
            quality: { name: listing.item_exterior || listing.exterior || 'Unknown' },
            type: { name: 'Weapon' }
        },
        source: listing.source || 'database'
    };
}

// Format Steam Market items 
function formatSteamItem(item: any) {
    return {
        id: item.id,
        price: item.price,
        createdAt: new Date().toISOString(),
        item: {
            name: item.name,
            marketHashName: item.market_hash_name,
            iconUrl: item.icon_url ? `/image-proxy?url=${encodeURIComponent(item.icon_url)}` : '',
            image: item.icon_url ? `/image-proxy?url=${encodeURIComponent(item.icon_url)}` : '',
            rarity: { name: item.rarity },
            quality: { name: item.exterior },
            type: { name: 'Weapon' }
        },
        source: 'steam_market'
    };
}

async function getListings() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        // First try to get listings from database
        const res = await fetch(`${apiUrl}/escrow/listings?limit=50`, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
                return data.data.map(formatListing);
            }
        }

        // If no listings, get items from Steam Market API
        console.log('[Marketplace] No listings in DB, fetching from Steam Market API...');

        const steamController = new AbortController();
        const steamTimeoutId = setTimeout(() => steamController.abort(), 30000);

        try {
            const steamRes = await fetch(`${apiUrl}/analytics/steam-market-items?limit=24`, {
                cache: 'no-store',
                signal: steamController.signal,
                headers: { 'Content-Type': 'application/json' },
            });
            clearTimeout(steamTimeoutId);

            if (steamRes.ok) {
                const steamData = await steamRes.json();
                if (steamData?.data && Array.isArray(steamData.data)) {
                    console.log(`[Marketplace] Got ${steamData.data.length} items from Steam Market`);
                    return steamData.data.map(formatSteamItem);
                }
            }
        } catch (steamError) {
            console.error('Failed to fetch Steam Market items:', steamError);
        }

        return [];
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch listings:', error);
        return [];
    }
}

export default async function MarketplacePage() {
    const listings = await getListings();
    return <MarketplaceGrid initialListings={listings} />;
}

