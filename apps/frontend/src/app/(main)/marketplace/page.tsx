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
    let rawIconUrl = listing.item_icon_url || '';
    
    // Fix: Check if already full URL (from DB)
    if (rawIconUrl && !rawIconUrl.startsWith('http')) {
        rawIconUrl = `https://community.steamstatic.com/economy/image/${rawIconUrl}`;
    }

    // For the larger image, assume rawIconUrl is base. If it's already full from DB, we might not be able to append /360fx360f easily if it's not consistent.
    // But usually Steam URLs allow appending size.
    // However, the DB URL is: https://community.cloudflare.../hash
    // We can append /360fx360f to it.
    
    const steamIconUrl = rawIconUrl;
    const steamImageUrl = rawIconUrl ? `${rawIconUrl}/360fx360f` : '';
    
    return {
        id: listing.id.toString(),
        price: parseFloat(listing.price),
        createdAt: listing.created_at,
        item: {
            name: listing.item_name,
            marketHashName: listing.item_market_hash_name,
            iconUrl: steamIconUrl ? `/image-proxy?url=${encodeURIComponent(steamIconUrl)}` : '',
            image: steamImageUrl ? `/image-proxy?url=${encodeURIComponent(steamImageUrl)}` : '',
            rarity: { name: listing.item_rarity || 'Unknown' },
            quality: { name: listing.item_exterior || 'Unknown' },
            type: { name: 'Weapon' }
        }
    };
}

async function getListings() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://backend:3001/api';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
        const res = await fetch(`${apiUrl}/escrow/listings?limit=50`, {
            cache: 'no-store',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
            },
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`API returned ${res.status}`);
            return [];
        }

        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
            return data.data.map(formatListing);
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
