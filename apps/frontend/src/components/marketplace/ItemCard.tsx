'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Item } from '@steam-marketplace/types';
import { apiClient } from '../../lib/api';
import toast from 'react-hot-toast';

export function ItemCard({ item }: { item: Item }) {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isBuying, setIsBuying] = useState(false);

    // Get exterior abbreviation
    const getExteriorAbbr = (exterior?: string) => {
        if (!exterior) return 'N/A';
        const map: Record<string, string> = {
            'Factory New': 'FN',
            'Minimal Wear': 'MW',
            'Field-Tested': 'FT',
            'Well-Worn': 'WW',
            'Battle-Scarred': 'BS',
        };
        return map[exterior] || exterior.slice(0, 2).toUpperCase();
    };

    const handleBuy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isBuying) return;

        const confirmed = window.confirm(`Are you sure you want to buy ${item.itemName} for $${item.price}?`);
        if (!confirmed) return;

        try {
            setIsBuying(true);
            const res = await apiClient.escrow.buyListing(item.id);
            setIsBuying(false);

            if (res.success) {
                toast.success('Purchase successful!');
            }
        } catch (error: any) {
            setIsBuying(false);
            console.error('Buy error:', error);
            toast.error(error.message || 'Failed to purchase item');
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-xl relative border border-gray-700">
            {/* Image Area */}
            <div className="aspect-[1.2] relative mb-4 bg-gray-900 rounded-lg overflow-hidden">
                {!imageError && item.itemIconUrl ? (
                    <img
                        src={`/image-proxy?url=${encodeURIComponent(
                            item.itemIconUrl.startsWith('http')
                                ? item.itemIconUrl
                                : `https://community.cloudflare.steamstatic.com/economy/image/${item.itemIconUrl}`
                        )}`}
                        alt={item.itemName}
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-500">No Image</div>
                )}
            </div>

            <div className="flex justify-between items-start gap-2 mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm truncate uppercase tracking-wide" title={item.itemName}>
                        {item.itemName}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.itemExterior || 'Base Grade'}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-700">
                <div className="text-lg font-bold text-white font-mono">
                    <span className="text-primary text-sm mr-0.5">$</span>
                    {Number(item.price).toFixed(2)}
                </div>
                <button
                    onClick={handleBuy}
                    disabled={isBuying}
                    className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-500 active:scale-95 transition-transform z-50 relative cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                >
                    {isBuying ? '...' : 'Buy'}
                </button>
            </div>
        </div>
    );
}
