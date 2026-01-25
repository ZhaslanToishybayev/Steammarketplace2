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

        // If no listings, return empty array (DO NOT use fallback to Steam Market)
        console.log('[Marketplace] No listings found. Bot inventory may not be synced yet.');
        return [];

    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch listings:', error);
        return [];
    }
}

export default async function MarketplacePage() {
    const listings = await getListings();
    
    // If empty, show sync message (client-side component handles UI if passed empty)
    // Actually MarketplaceGrid might handle empty state, let's check or inject a wrapper
    if (listings.length === 0) {
        // Return a server-side empty state or client component that handles polling
        // For simplicity, we return empty list to MarketplaceGrid, assuming it handles empty state nicely.
        // But per spec, we want a "Syncing..." UI.
        
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                    Синхронизация инвентаря...
                </h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                    Бот загружает предметы в маркетплейс. Обычно это занимает 30-60 секунд после запуска сервера.
                </p>
                {/* Client-side refresh button would require a client component wrapper */}
                <form action="">
                    <button 
                        type="submit"
                        className="px-6 py-3 bg-amber-500 hover:bg-amber-600 rounded-lg font-semibold transition text-white"
                    >
                        Обновить страницу
                    </button>
                </form>
            </div>
        );
    }

    return <MarketplaceGrid initialListings={listings} />;
}
