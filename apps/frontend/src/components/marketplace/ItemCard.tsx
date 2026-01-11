'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MarketListing } from '@/types';
import { apiClient } from '../../lib/api';
import toast from 'react-hot-toast';
import { ShoppingCart, ExternalLink, Sparkles } from 'lucide-react';

// Rarity color mapping
const RARITY_COLORS: Record<string, string> = {
    'Consumer Grade': '#B0C3D9',
    'Industrial Grade': '#5E98D9',
    'Mil-Spec': '#4B69FF',
    'Restricted': '#8847FF',
    'Classified': '#D32CE6',
    'Covert': '#EB4B4B',
    'Contraband': '#E4AE39',
    'Extraordinary': '#E4AE39',
    'Unknown': '#6B7280',
};

// Steam image URL builder
const getSteamImageUrl = (iconUrl?: string, size = '360fx360f') => {
    if (!iconUrl) return '';
    if (iconUrl.startsWith('/image-proxy')) return iconUrl;
    
    // Always use proxy for external URLs to avoid CORS issues
    let finalUrl = iconUrl;
    if (!iconUrl.startsWith('http')) {
        finalUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrl}/${size}`;
    }
    
    return `/image-proxy?url=${encodeURIComponent(finalUrl)}`;
};

// Steam Market URL builder
const getSteamMarketUrl = (appId: number, marketHashName: string) => {
    return `https://steamcommunity.com/market/listings/${appId}/${encodeURIComponent(marketHashName)}`;
};

export function ItemCard({ item: listing }: { item: MarketListing }) {
    const [imageError, setImageError] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [isBuying, setIsBuying] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const itemName = listing.item?.name || 'Unknown Item';
    const itemImage = listing.item?.iconUrl || listing.item?.image || '';
    const itemPrice = listing.price || 0;
    const rarityName = listing.item?.rarity?.name || 'Unknown';
    const qualityName = listing.item?.quality?.name || 'Unknown';
    const rarityColor = RARITY_COLORS[rarityName] || RARITY_COLORS['Unknown'];
    const marketHashName = listing.item?.marketHashName || itemName;
    const appId = 730; // CS2 default

    // Get exterior abbreviation
    const getExteriorAbbr = (exterior?: string) => {
        if (!exterior) return '';
        const map: Record<string, string> = {
            'Factory New': 'FN',
            'Minimal Wear': 'MW',
            'Field-Tested': 'FT',
            'Well-Worn': 'WW',
            'Battle-Scarred': 'BS',
        };
        return map[exterior] || '';
    };

    const exteriorAbbr = getExteriorAbbr(qualityName);
    const imageUrl = getSteamImageUrl(itemImage);
    const steamUrl = getSteamMarketUrl(appId, marketHashName);

    const handleBuy = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (isBuying) return;

        const confirmed = window.confirm(`Are you sure you want to buy ${itemName} for $${Number(itemPrice).toFixed(2)}?`);
        if (!confirmed) return;

        try {
            setIsBuying(true);
            const res = await apiClient.escrow.buyListing(listing.id);
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
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            className="relative group"
        >
            <div
                className="glass-steam rounded-2xl overflow-hidden border-2 transition-all duration-300"
                style={{
                    borderColor: isHovered ? `${rarityColor}60` : 'rgba(255,140,0,0.1)',
                    boxShadow: isHovered ? `0 0 30px ${rarityColor}20` : 'none',
                }}
            >
                {/* Rarity Indicator Line */}
                <div
                    className="h-1 w-full"
                    style={{ background: `linear-gradient(90deg, ${rarityColor}, ${rarityColor}80)` }}
                />

                {/* Image Area */}
                <div className="aspect-square relative bg-gradient-to-br from-white/5 to-transparent p-4">
                    {/* Skeleton loader */}
                    {!imageLoaded && !imageError && (
                        <div className="absolute inset-4 bg-white/5 rounded-xl animate-pulse" />
                    )}

                    {!imageError && imageUrl ? (
                        <img
                            src={imageUrl}
                            alt={itemName}
                            loading="lazy"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full object-contain transition-all duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                } ${isHovered ? 'scale-110' : 'scale-100'}`}
                            onError={(e) => {
                                console.log('Image failed to load:', imageUrl);
                                setImageError(true);
                            }}
                            onLoad={() => setImageLoaded(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            <Sparkles className="w-12 h-12 opacity-30 mb-2" />
                            <span className="text-xs opacity-50">No image</span>
                        </div>
                    )}

                    {/* Exterior Badge */}
                    {exteriorAbbr && (
                        <div className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-xs font-bold text-white">
                            {exteriorAbbr}
                        </div>
                    )}

                    {/* Quick Actions on Hover */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: isHovered ? 1 : 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 backdrop-blur-sm"
                    >
                        <button
                            onClick={handleBuy}
                            disabled={isBuying}
                            className="px-5 py-2.5 bg-gradient-to-r from-[#FF8C00] to-[#E67E00] text-white font-bold rounded-xl flex items-center gap-2 hover:from-[#FFA500] hover:to-[#FF8C00] transition-all shadow-lg shadow-[#FF8C00]/30 text-sm"
                        >
                            <ShoppingCart className="w-4 h-4" />
                            {isBuying ? 'Processing...' : 'Buy Now'}
                        </button>
                        <a
                            href={steamUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-5 py-2 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl flex items-center gap-2 transition-all text-sm"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Steam
                        </a>
                    </motion.div>
                </div>

                {/* Content */}
                <div className="p-4">
                    {/* Item Name */}
                    <h3
                        className="font-semibold text-white text-sm truncate mb-1"
                        title={itemName}
                    >
                        {itemName}
                    </h3>

                    {/* Rarity & Quality */}
                    <div className="flex items-center gap-2 mb-3">
                        <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                                backgroundColor: `${rarityColor}20`,
                                color: rarityColor,
                            }}
                        >
                            {rarityName}
                        </span>
                        {qualityName !== 'Unknown' && (
                            <span className="text-xs text-gray-500">
                                {qualityName}
                            </span>
                        )}
                    </div>

                    {/* Price & Actions */}
                    <div className="flex justify-between items-center pt-3 border-t border-white/5">
                        <div className="font-mono">
                            <span className="text-[#FF8C00] text-sm">$</span>
                            <span className="text-xl font-bold text-white">
                                {Number(itemPrice).toFixed(2)}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <a
                                href={steamUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                title="View on Steam"
                            >
                                <ExternalLink className="w-4 h-4" />
                            </a>
                            <button
                                onClick={handleBuy}
                                disabled={isBuying}
                                className="p-2 rounded-xl bg-white/5 hover:bg-[#FF8C00]/20 text-[#FF8C00] transition-colors"
                            >
                                <ShoppingCart className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
