'use client';

import { useState, useMemo } from 'react';
import { ItemCard } from './ItemCard';
import { useWallet } from '../../lib/useWallet';
import { motion, AnimatePresence } from 'framer-motion';
import { MarketListing } from '@/types';
import { ShoppingBag, Wallet, Search, SlidersHorizontal, X, ChevronDown } from 'lucide-react';

interface MarketplaceGridProps {
    initialListings: MarketListing[];
}

const RARITY_OPTIONS = [
    { value: '', label: 'All Rarities' },
    { value: 'consumer', label: 'Consumer Grade', color: '#B0C3D9' },
    { value: 'industrial', label: 'Industrial Grade', color: '#5E98D9' },
    { value: 'milspec', label: 'Mil-Spec', color: '#4B69FF' },
    { value: 'restricted', label: 'Restricted', color: '#8847FF' },
    { value: 'classified', label: 'Classified', color: '#D32CE6' },
    { value: 'covert', label: 'Covert', color: '#EB4B4B' },
    { value: 'contraband', label: 'Contraband', color: '#E4AE39' },
];

const WEAR_OPTIONS = [
    { value: '', label: 'All Conditions' },
    { value: 'fn', label: 'Factory New', abbr: 'FN' },
    { value: 'mw', label: 'Minimal Wear', abbr: 'MW' },
    { value: 'ft', label: 'Field-Tested', abbr: 'FT' },
    { value: 'ww', label: 'Well-Worn', abbr: 'WW' },
    { value: 'bs', label: 'Battle-Scarred', abbr: 'BS' },
];

const SORT_OPTIONS = [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'name_asc', label: 'Name: A to Z' },
    { value: 'name_desc', label: 'Name: Z to A' },
    { value: 'newest', label: 'Newest First' },
];

const TYPE_OPTIONS = [
    { value: '', label: 'All Types' },
    { value: 'knife', label: 'Knives' },
    { value: 'rifle', label: 'Rifles' },
    { value: 'pistol', label: 'Pistols' },
    { value: 'smg', label: 'SMGs' },
    { value: 'shotgun', label: 'Shotguns' },
    { value: 'machinegun', label: 'Machine Guns' },
    { value: 'glove', label: 'Gloves' },
];

export function MarketplaceGrid({ initialListings }: MarketplaceGridProps) {
    const { balance } = useWallet();
    const [showFilters, setShowFilters] = useState(false);

    // Filter states
    const [search, setSearch] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [rarity, setRarity] = useState('');
    const [wear, setWear] = useState('');
    const [itemType, setItemType] = useState('');
    const [sortBy, setSortBy] = useState('price_asc');

    // Apply filters
    const filteredListings = useMemo(() => {
        let result = [...initialListings];

        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(item =>
                item.item?.name?.toLowerCase().includes(searchLower) ||
                item.item?.marketHashName?.toLowerCase().includes(searchLower)
            );
        }

        // Price filters
        if (minPrice) {
            result = result.filter(item => item.price >= parseFloat(minPrice));
        }
        if (maxPrice) {
            result = result.filter(item => item.price <= parseFloat(maxPrice));
        }

        // Rarity filter
        if (rarity) {
            result = result.filter(item =>
                item.item?.rarity?.name?.toLowerCase().includes(rarity)
            );
        }

        // Wear filter
        if (wear) {
            const wearMap: Record<string, string[]> = {
                'fn': ['factory new'],
                'mw': ['minimal wear'],
                'ft': ['field-tested', 'field tested'],
                'ww': ['well-worn', 'well worn'],
                'bs': ['battle-scarred', 'battle scarred'],
            };
            const wearTerms = wearMap[wear] || [];
            result = result.filter(item => {
                const itemWear = item.item?.quality?.name?.toLowerCase() || '';
                return wearTerms.some(term => itemWear.includes(term));
            });
        }

        // Type filter
        if (itemType) {
            result = result.filter(item =>
                item.item?.type?.name?.toLowerCase().includes(itemType)
            );
        }

        // Sorting
        result.sort((a, b) => {
            switch (sortBy) {
                case 'price_asc':
                    return a.price - b.price;
                case 'price_desc':
                    return b.price - a.price;
                case 'name_asc':
                    return (a.item?.name || '').localeCompare(b.item?.name || '');
                case 'name_desc':
                    return (b.item?.name || '').localeCompare(a.item?.name || '');
                case 'newest':
                    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                default:
                    return 0;
            }
        });

        return result;
    }, [initialListings, search, minPrice, maxPrice, rarity, wear, itemType, sortBy]);

    const clearFilters = () => {
        setSearch('');
        setMinPrice('');
        setMaxPrice('');
        setRarity('');
        setWear('');
        setItemType('');
        setSortBy('price_asc');
    };

    const hasActiveFilters = search || minPrice || maxPrice || rarity || wear || itemType;

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05
            }
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Hero Header */}
            <div className="relative pt-8 pb-6 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E67E00]/5 rounded-full blur-[100px]" />
                </div>

                <div className="container mx-auto px-6 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/25 text-[#FF8C00] text-sm font-medium">
                                <ShoppingBag className="w-4 h-4" />
                                <span>{filteredListings.length} items available</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-white tracking-tight">
                                Marketplace
                            </h1>
                            <p className="text-gray-400 text-lg">
                                Browse CS2 skins with instant secure checkout.
                            </p>
                        </div>

                        {/* Balance Card */}
                        <div className="glass-steam px-6 py-4 rounded-2xl flex items-center gap-4 border border-[#FF8C00]/15">
                            <div className="text-right">
                                <div className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-1">Balance</div>
                                <div className="text-2xl font-bold text-white font-mono">
                                    ${balance.toFixed(2)}
                                </div>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#FF8C00] to-[#E67E00] flex items-center justify-center shadow-lg shadow-[#FF8C00]/20">
                                <Wallet className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Section */}
            <div className="container mx-auto px-6 mb-6">
                {/* Search and Filter Toggle */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search skins by name..."
                            className="w-full h-12 pl-12 pr-4 rounded-xl bg-white/5 border border-[#FF8C00]/20 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50 focus:border-[#FF8C00] transition-all"
                        />
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-6 h-12 rounded-xl font-semibold transition-all ${showFilters || hasActiveFilters
                                ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/25'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-[#FF8C00]/20'
                            }`}
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                        Filters
                        {hasActiveFilters && (
                            <span className="ml-1 px-2 py-0.5 text-xs bg-white/20 rounded-full">Active</span>
                        )}
                    </button>

                    {/* Sort Dropdown */}
                    <div className="relative">
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="h-12 px-4 pr-10 rounded-xl bg-white/5 border border-[#FF8C00]/20 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                        >
                            {SORT_OPTIONS.map(option => (
                                <option key={option.value} value={option.value} className="bg-[#12121A]">
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Expandable Filters Panel */}
                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                        >
                            <div className="glass-steam rounded-2xl p-6 border border-[#FF8C00]/10">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {/* Price Range */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Price Range</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={minPrice}
                                                onChange={(e) => setMinPrice(e.target.value)}
                                                placeholder="Min"
                                                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-[#FF8C00]/20 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                                            />
                                            <span className="text-gray-500 self-center">-</span>
                                            <input
                                                type="number"
                                                value={maxPrice}
                                                onChange={(e) => setMaxPrice(e.target.value)}
                                                placeholder="Max"
                                                className="w-full h-10 px-3 rounded-lg bg-white/5 border border-[#FF8C00]/20 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                                            />
                                        </div>
                                    </div>

                                    {/* Rarity Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Rarity</label>
                                        <select
                                            value={rarity}
                                            onChange={(e) => setRarity(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-[#FF8C00]/20 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                                        >
                                            {RARITY_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value} className="bg-[#12121A]">
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Wear Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Condition</label>
                                        <select
                                            value={wear}
                                            onChange={(e) => setWear(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-[#FF8C00]/20 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                                        >
                                            {WEAR_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value} className="bg-[#12121A]">
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Type Filter */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-2">Item Type</label>
                                        <select
                                            value={itemType}
                                            onChange={(e) => setItemType(e.target.value)}
                                            className="w-full h-10 px-3 rounded-lg bg-white/5 border border-[#FF8C00]/20 text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50"
                                        >
                                            {TYPE_OPTIONS.map(option => (
                                                <option key={option.value} value={option.value} className="bg-[#12121A]">
                                                    {option.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Clear Filters */}
                                {hasActiveFilters && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <button
                                            onClick={clearFilters}
                                            className="flex items-center gap-2 px-4 py-2 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors"
                                        >
                                            <X className="w-4 h-4" />
                                            Clear all filters
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Items Grid */}
            <div className="container mx-auto px-6 pb-12">
                {filteredListings.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-24 glass-steam rounded-3xl border border-[#FF8C00]/10"
                    >
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-[#FF8C00]/50" />
                        </div>
                        <h3 className="text-2xl font-bold mb-3 text-white">No items found</h3>
                        <p className="text-gray-400 text-lg max-w-md mx-auto mb-6">
                            {hasActiveFilters
                                ? 'Try adjusting your filters to see more results.'
                                : 'Check back later for new listings.'}
                        </p>
                        {hasActiveFilters && (
                            <button
                                onClick={clearFilters}
                                className="px-6 py-3 bg-[#FF8C00] text-white font-semibold rounded-xl hover:bg-[#FFA500] transition-colors"
                            >
                                Clear Filters
                            </button>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                    >
                        {filteredListings.map((item) => (
                            <ItemCard key={item.id} item={item} />
                        ))}
                    </motion.div>
                )}
            </div>
        </div>
    );
}
