'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { useInstantSell } from '@/hooks/useInstantSell';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Button, Input, Card, Badge, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import Link from 'next/link';

interface InventoryItem {
    assetid: string;
    name: string;
    market_hash_name: string;
    icon_url: string;
    tradable: boolean;
    tags?: { category: string; localized_tag_name: string }[];
}

interface MyListing {
    id: number;
    item_name: string;
    item_icon_url: string;
    price: string;
    status: string;
    created_at: string;
}

export default function SellPage() {
    const { user, isLoading: authLoading, checkAuth } = useAuth();
    const { sellItems, isSelling } = useInstantSell();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [price, setPrice] = useState('');
    const [tradeUrl, setTradeUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [myListings, setMyListings] = useState<MyListing[]>([]);
    const [loadingListings, setLoadingListings] = useState(false);
    const [sellMode, setSellMode] = useState<'listing' | 'instant'>('instant');

    // Mock instant price calculation (real world would fetch from backend)
    // For now, let's assume Instant Price is ~70% of user input or a fixed mock if unknown
    const instantPriceEstimate = selectedItem ? (parseFloat(price || '10') * 0.70).toFixed(2) : '0.00';

    useEffect(() => {
        checkAuth();
    }, []);

    useEffect(() => {
        if (user) {
            loadInventory();
            loadMyListings();
            if (user.tradeUrl) {
                setTradeUrl(user.tradeUrl);
            }
        }
    }, [user]);

    const loadInventory = async () => {
        if (!user) return;
        setLoadingInventory(true);
        try {
            const response = await apiClient.getInventory(user.steamId, true);
            if (response.success && response.items) {
                const tradable = response.items.filter((item: InventoryItem) => item.tradable);
                setInventory(tradable);
                if (tradable.length === 0) {
                    toast.error('No tradable items found in your inventory');
                } else {
                    toast.success(`Loaded ${tradable.length} tradable items`);
                }
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to load inventory');
        } finally {
            setLoadingInventory(false);
        }
    };

    const loadMyListings = async () => {
        setLoadingListings(true);
        try {
            const response = await apiClient.getMyListings();
            if (response.success && response.listings) {
                setMyListings(response.listings);
            }
        } catch (err: any) {
            console.error('Failed to load listings:', err);
        } finally {
            setLoadingListings(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !tradeUrl) {
            toast.error('Please fill all fields');
            return;
        }

        if (sellMode === 'listing' && !price) {
            toast.error('Please enter a price');
            return;
        }

        setSubmitting(true);
        try {
            if (sellMode === 'instant') {
                // Instant Sell Flow
                // We need to fetch the REAL instant price from backend ideally, but here we will send what we have
                // The backend 'instant.js' re-calculates price anyway.
                await sellItems({
                    items: [{
                        assetId: selectedItem.assetid,
                        appId: 730,
                        marketHashName: selectedItem.market_hash_name,
                        contextId: '2'
                    }],
                    tradeUrl: tradeUrl
                });
                // Note: sellItems hook handles success toast
                setSelectedItem(null);
                setInventory(inventory.filter(i => i.assetid !== selectedItem.assetid));
            } else {
                // P2P Listing Flow
                const response = await apiClient.createListing({
                    assetId: selectedItem.assetid,
                    name: selectedItem.name,
                    marketHashName: selectedItem.market_hash_name,
                    iconUrl: selectedItem.icon_url,
                    price: parseFloat(price),
                    tradeUrl: tradeUrl,
                });

                if (response.success) {
                    toast.success('Item listed successfully!');
                    setSelectedItem(null);
                    setPrice('');
                    setInventory(inventory.filter(i => i.assetid !== selectedItem.assetid));
                    loadMyListings();
                }
            }
        } catch (err: any) {
            // Error handled in hook or here
            if (sellMode === 'listing') toast.error(err.message || 'Failed to create listing');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancelListing = async (listingId: number) => {
        try {
            const response = await apiClient.cancelListing(listingId);
            if (response.success) {
                toast.success('Listing cancelled');
                loadMyListings();
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to cancel listing');
        }
    };

    // Loading state
    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <div className="min-h-[60vh] flex items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-pulse"></div>
                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                    </div>
                </div>
            </div>
        );
    }

    // Not logged in
    if (!user) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <div className="min-h-[60vh] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#12121A] backdrop-blur-2xl rounded-3xl p-10 text-center border border-[#FF8C00]/20 shadow-2xl max-w-md w-full"
                    >
                        <div className="w-20 h-20 bg-gradient-to-br from-[#FF8C00] to-[#E67E00] rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-3">Login Required</h1>
                        <p className="text-muted-foreground mb-8">Connect your Steam account to start selling your skins</p>
                        <Link href="/api/auth/steam">
                            <Button size="lg" className="w-full bg-gradient-to-r from-[#FF8C00] to-[#E67E00] hover:from-[#FFA500] hover:to-[#FF8C00] text-white">
                                Login with Steam
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            <div className="relative">
                {/* Decorative background elements */}
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-[120px]"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E67E00]/5 rounded-full blur-[120px]"></div>
                </div>

                <main className="container mx-auto px-6 py-8">
                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center mb-12"
                    >
                        <h1 className="text-5xl font-bold text-white mb-4">
                            Instant <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Sell</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Sell your CS2 skins to our bots instantly. Get paid immediately to your wallet balance.
                        </p>
                    </motion.div>

                    {/* Tab Navigation */}
                    <Tabs defaultValue="sell" className="w-full">
                        <TabsList className="bg-white/5 border border-white/10 p-1 rounded-2xl mx-auto w-fit mb-10">
                            <TabsTrigger value="sell" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-8 py-3 font-semibold">
                                ⚡ Instant Sell
                            </TabsTrigger>
                            <TabsTrigger value="listings" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white rounded-xl px-8 py-3 font-semibold">
                                📋 My Trades ({myListings.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* Sell Tab */}
                        <TabsContent value="sell">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Inventory Section */}
                                <motion.div
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                                >
                                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Your Inventory</h2>
                                            <p className="text-gray-400 text-sm mt-1">{inventory.length} tradable items</p>
                                        </div>
                                        <Button
                                            onClick={loadInventory}
                                            disabled={loadingInventory}
                                            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/25"
                                        >
                                            {loadingInventory ? (
                                                <span className="flex items-center gap-2">
                                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                    </svg>
                                                    Loading...
                                                </span>
                                            ) : '🔄 Refresh Inventory'}
                                        </Button>
                                    </div>

                                    <div className="p-6 h-[500px] overflow-y-auto custom-scrollbar">
                                        {inventory.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-center">
                                                {loadingInventory ? (
                                                    <div className="relative">
                                                        <div className="w-16 h-16 border-4 border-purple-500/30 rounded-full"></div>
                                                        <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                                                            <span className="text-5xl opacity-50">📦</span>
                                                        </div>
                                                        <h3 className="text-white font-semibold mb-2">No Items Loaded</h3>
                                                        <p className="text-gray-400 text-sm mb-6">Click the button above to load your CS2 inventory</p>
                                                    </>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                                {inventory.map((item, index) => (
                                                    <motion.div
                                                        key={item.assetid}
                                                        initial={{ opacity: 0, scale: 0.8 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        transition={{ delay: index * 0.02 }}
                                                        whileHover={{ scale: 1.05, y: -5 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => setSelectedItem(item)}
                                                        className={`cursor-pointer rounded-2xl p-3 transition-all duration-200 ${selectedItem?.assetid === item.assetid
                                                            ? 'bg-gradient-to-br from-amber-500/30 to-orange-500/30 border-2 border-amber-400 shadow-lg shadow-amber-500/20'
                                                            : 'bg-white/5 border-2 border-transparent hover:border-white/20 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className="aspect-square rounded-lg overflow-hidden bg-black/20 mb-2">
                                                            <img
                                                                src={`/image-proxy?url=${encodeURIComponent(`https://steamcommunity-a.akamaihd.net/economy/image/${item.icon_url}`)}`}
                                                                alt={item.name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                        <p className="text-xs text-gray-300 truncate text-center font-medium">{item.name}</p>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Listing Form */}
                                <motion.div
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8"
                                >
                                    <h2 className="text-2xl font-bold text-white mb-6">Instant Payout</h2>

                                    <AnimatePresence mode="wait">
                                        {selectedItem ? (
                                            <motion.form
                                                key="form"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                onSubmit={handleSubmit}
                                                className="space-y-6"
                                            >
                                                {/* Selected Item Preview */}
                                                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-2xl p-5 flex items-center gap-5 border border-amber-500/20">
                                                    <div className="w-24 h-24 bg-black/30 rounded-xl overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={`/image-proxy?url=${encodeURIComponent(`https://steamcommunity-a.akamaihd.net/economy/image/${selectedItem.icon_url}`)}`}
                                                            alt={selectedItem.name}
                                                            className="w-full h-full object-contain"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-white text-lg truncate">{selectedItem.name}</p>
                                                        <p className="text-gray-400 text-sm truncate">{selectedItem.market_hash_name}</p>
                                                        <Badge className="mt-2 bg-green-500/20 text-green-400 border-green-500/30">Tradable</Badge>
                                                    </div>
                                                </div>

                                                {/* Price / Info Section */}
                                                <div className="space-y-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-amber-200 font-medium">Bot Offer</span>
                                                        <span className="text-2xl font-bold text-amber-500">⚡ Buyout Available</span>
                                                    </div>
                                                    <p className="text-sm text-gray-300 mt-2">
                                                        The bot will send you a trade offer <b>immediately</b>. Funds will be added to your balance once accepted.
                                                    </p>
                                                </div>

                                                {/* Trade URL */}
                                                <div className="space-y-3">
                                                    <label className="text-white font-medium">Steam Trade URL</label>
                                                    <Input
                                                        type="url"
                                                        value={tradeUrl}
                                                        onChange={(e) => setTradeUrl(e.target.value)}
                                                        placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                                                        className="h-12 bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-xl focus:border-purple-500"
                                                        required
                                                    />
                                                    <a
                                                        href="https://steamcommunity.com/my/tradeoffers/privacy#trade_offer_access_url"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-purple-400 hover:text-purple-300 text-sm underline"
                                                    >
                                                        Where to find your Trade URL? →
                                                    </a>
                                                </div>

                                                {/* Submit Button */}
                                                <Button
                                                    type="submit"
                                                    disabled={submitting || isSelling}
                                                    className={`w-full h-14 font-semibold text-lg rounded-xl shadow-lg ${sellMode === 'listing'
                                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-purple-500/25'
                                                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-500/25'
                                                        }`}
                                                >
                                                    {submitting || isSelling ? (
                                                        <span className="flex items-center gap-2">
                                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                            </svg>
                                                            Processing...
                                                        </span>
                                                    ) : (
                                                        sellMode === 'listing' ? '🚀 List for Sale' : '⚡ Sell Instantly Now'
                                                    )}
                                                </Button>
                                            </motion.form>
                                        ) : (
                                            <motion.div
                                                key="placeholder"
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                className="h-[400px] flex flex-col items-center justify-center text-center"
                                            >
                                                <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                                                    <span className="text-5xl opacity-50">👆</span>
                                                </div>
                                                <h3 className="text-white text-xl font-semibold mb-2">Select an Item</h3>
                                                <p className="text-gray-400 max-w-sm">Choose an item from your inventory to list it for sale on the marketplace</p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            </div>
                        </TabsContent>

                        {/* Listings Tab */}
                        <TabsContent value="listings">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
                            >
                                <div className="p-6 border-b border-white/10">
                                    <h2 className="text-xl font-bold text-white">Your Active Listings</h2>
                                    <p className="text-gray-400 text-sm mt-1">Manage your items currently for sale</p>
                                </div>

                                <div className="p-6">
                                    {loadingListings ? (
                                        <div className="flex justify-center py-12">
                                            <div className="relative">
                                                <div className="w-12 h-12 border-4 border-purple-500/30 rounded-full"></div>
                                                <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-t-purple-500 rounded-full animate-spin"></div>
                                            </div>
                                        </div>
                                    ) : myListings.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="w-24 h-24 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                                <span className="text-5xl opacity-50">📭</span>
                                            </div>
                                            <h3 className="text-white text-xl font-semibold mb-2">No Active Listings</h3>
                                            <p className="text-gray-400">List some items to see them here</p>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {myListings.map((listing, index) => (
                                                <motion.div
                                                    key={listing.id}
                                                    initial={{ opacity: 0, y: 20 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="bg-white/5 rounded-2xl p-5 flex items-center justify-between border border-white/10 hover:border-white/20 transition-colors"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-16 h-16 bg-black/30 rounded-xl overflow-hidden">
                                                            <img
                                                                src={`/image-proxy?url=${encodeURIComponent(
                                                                    listing.item_icon_url.startsWith('http') 
                                                                    ? listing.item_icon_url 
                                                                    : `https://steamcommunity-a.akamaihd.net/economy/image/${listing.item_icon_url}`
                                                                )}`}
                                                                alt={listing.item_name}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-white">{listing.item_name}</p>
                                                            <p className="text-gray-400 text-sm">{new Date(listing.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-6">
                                                        <div className="text-right">
                                                            <p className="text-2xl font-bold text-white">${listing.price}</p>
                                                            <Badge className={
                                                                listing.status === 'active'
                                                                    ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                                                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                                            }>
                                                                {listing.status}
                                                            </Badge>
                                                        </div>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleCancelListing(listing.id)}
                                                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                                                        >
                                                            Cancel
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </TabsContent>
                    </Tabs>
                </main>
            </div>

            {/* Custom scrollbar styles */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
            `}</style>
        </div>
    );
}
