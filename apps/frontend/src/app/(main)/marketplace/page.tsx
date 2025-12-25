import { MarketplaceGrid } from '../../../components/marketplace/MarketplaceGrid';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Marketplace - Buy CS2 Skins',
    description: 'Browse thousands of CS2 skins available for instant purchase with secure escrow.',
};

// Force dynamic rendering since listings change frequently
export const dynamic = 'force-dynamic';

async function getListings() {
    const apiUrl = process.env.INTERNAL_API_URL || 'http://localhost:3001/api';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    try {
        const res = await fetch(`${apiUrl}/escrow/listings?limit=50`, {
            cache: 'no-store',
            signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            console.error('Failed to fetch listings:', res.statusText);
            return [];
        }

        const data = await res.json();
        return (data.data || []).map((item: any) => ({
            id: item.id,
            itemName: item.item_name,
            itemIconUrl: item.item_icon_url,
            price: item.price,
            itemExterior: item.item_exterior,
            ...item
        }));
    } catch (error) {
        console.error('Error loading listings:', error);
        return [];
    }
}

export default async function MarketplacePage() {
    console.log('[MarketplacePage] Starting render...');
    const t0 = performance.now();
    const listings = await getListings();
    const t1 = performance.now();
    console.log(`[MarketplacePage] Fetched ${listings.length} listings in ${t1 - t0}ms`);

    return <MarketplaceGrid initialListings={listings} />;
}
