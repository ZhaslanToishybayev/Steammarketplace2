'use client';

import { ItemCard } from './ItemCard';
import { useWallet } from '../../lib/useWallet';
import { motion } from 'framer-motion';
import { Listing } from '@steam-marketplace/types';

interface MarketplaceGridProps {
    initialListings: Listing[];
}

// ... interfaces ...

export function MarketplaceGrid({ initialListings }: MarketplaceGridProps) {
    const { balance } = useWallet();

    console.log('[MarketplaceGrid] Rendering with listings:', initialListings?.length);
    console.log('[MarketplaceGrid] Current balance:', balance);

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
        <div className="container mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70 tracking-tight">
                        Marketplace
                    </h1>
                    <p className="text-muted-foreground text-lg font-light">
                        Discover rare skins and exclusive items
                    </p>
                    <button
                        onClick={() => alert('Global Click Works')}
                        className="mt-2 px-4 py-2 bg-red-500 text-white z-50 relative pointer-events-auto cursor-pointer"
                    >
                        TEST CLICK
                    </button>
                </div>

                <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 border border-white/5 bg-white/5 backdrop-blur-xl">
                    <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-1">Balance</div>
                        <div className="text-2xl font-bold text-white font-mono tracking-tight text-shadow-glow">
                            ${balance.toFixed(2)}
                        </div>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {initialListings.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-32 glass rounded-3xl border border-white/5"
                >
                    <div className="text-6xl mb-6 opacity-50">🔍</div>
                    <h3 className="text-2xl font-bold mb-3 text-white">No items found</h3>
                    <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        Try adjusting your filters or check back later for new exclusive drops.
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
                >
                    {initialListings.map((item) => (
                        <ItemCard key={item.id} item={item} />
                    ))}
                </motion.div>
            )}
        </div>
    );
}
