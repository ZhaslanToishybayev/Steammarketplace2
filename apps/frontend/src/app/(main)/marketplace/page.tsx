import { MarketplaceGrid } from '../../../components/marketplace/MarketplaceGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Marketplace - Buy CS2 Skins',
    description: 'Browse CS2 skins available for bot delivery and P2P escrow.',
};

export const dynamic = 'force-dynamic';

function formatListing(listing: any, source: 'bot' | 'p2p' = 'bot') {
    let rawIconUrl = listing.item_icon_url || listing.icon_url || '';

    if (rawIconUrl && !rawIconUrl.startsWith('http')) {
        rawIconUrl = `https://community.steamstatic.com/economy/image/${rawIconUrl}`;
    }

    const steamIconUrl = rawIconUrl;
    const steamImageUrl = rawIconUrl ? `${rawIconUrl}/360fx360f` : '';

    return {
        id: listing.id?.toString() || `steam-${Math.random().toString(36).substr(2, 9)}`,
        price: parseFloat(listing.price) || 0,
        status: listing.status,
        createdAt: listing.created_at || new Date().toISOString(),
        item: {
            name: listing.item_name || listing.name || listing.market_hash_name,
            marketHashName: listing.item_market_hash_name || listing.market_hash_name,
            iconUrl: steamIconUrl ? `/image-proxy?url=${encodeURIComponent(steamIconUrl)}` : '',
            image: steamImageUrl ? `/image-proxy?url=${encodeURIComponent(steamImageUrl)}` : '',
            rarity: { name: listing.item_rarity || listing.rarity || 'Unknown' },
            quality: { name: listing.item_exterior || listing.exterior || 'Unknown' },
            type: { name: 'Weapon' },
        },
        source,
        listingType: listing.listing_type || source,
        lastVerifiedAt: listing.last_verified_at,
        verificationStatus: listing.verification_status,
    };
}

async function getListings() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const requestOptions = {
            cache: 'no-store',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
        } as const;

        const [botResult, p2pResult] = await Promise.allSettled([
            fetch(`${apiUrl}/escrow/listings?limit=50`, requestOptions),
            fetch(`${apiUrl}/p2p/listings?limit=50`, requestOptions),
        ]);
        clearTimeout(timeoutId);

        const listings: any[] = [];

        if (botResult.status === 'fulfilled' && botResult.value.ok) {
            const data = await botResult.value.json();
            if (Array.isArray(data?.data)) {
                listings.push(...data.data.map((item: any) => formatListing(item, 'bot')));
            }
        }

        if (p2pResult.status === 'fulfilled' && p2pResult.value.ok) {
            const data = await p2pResult.value.json();
            if (Array.isArray(data?.data)) {
                listings.push(...data.data.map((item: any) => formatListing(item, 'p2p')));
            }
        }

        return listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
        clearTimeout(timeoutId);
        console.error('Failed to fetch listings:', error);
        return [];
    }
}

export default async function MarketplacePage() {
    const listings = await getListings();

    if (listings.length === 0) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
                <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Лоты пока не найдены</h2>
                <p className="text-gray-400 text-center max-w-md mb-6">
                    Как только продавец выставит P2P-предмет или бот синхронизирует инвентарь, он появится здесь.
                </p>
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

    return <MarketplaceGrid initialListings={listings as any} />;
}
