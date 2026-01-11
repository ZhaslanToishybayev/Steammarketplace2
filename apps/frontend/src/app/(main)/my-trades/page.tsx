'use client';

import { useState } from 'react';
import { useTrades, getTradeStatusInfo, TradeStatusLabels } from '../../../hooks/stableEscrow';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeftRight, ChevronRight, Package, ShoppingCart, DollarSign } from 'lucide-react';

export default function MyTradesPage() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [roleFilter, setRoleFilter] = useState<'buyer' | 'seller' | undefined>(undefined);

    const { data: tradesResponse, isLoading, error } = useTrades({
        status: statusFilter,
        role: roleFilter,
    });

    const tradesData = tradesResponse as any;

    const statusOptions = [
        { value: undefined, label: 'All Statuses' },
        { value: 'pending_payment', label: 'Pending Payment' },
        { value: 'awaiting_seller', label: 'Awaiting Seller' },
        { value: 'awaiting_buyer', label: 'Awaiting Buyer' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Hero Header */}
            <div className="relative pt-8 pb-12 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-[100px]" />
                </div>

                <div className="container mx-auto px-6 relative">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/25 text-[#FF8C00] text-sm font-medium">
                        <ArrowLeftRight className="w-4 h-4" />
                        <span>Trade History</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-white tracking-tight">
                        My Trades
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Track all your escrow transactions.
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-6 pb-12">
                {/* Filters */}
                <div className="glass-steam rounded-2xl p-5 mb-8 border border-[#FF8C00]/10">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Role filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRoleFilter(undefined)}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${!roleFilter
                                    ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setRoleFilter('buyer')}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${roleFilter === 'buyer'
                                    ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <ShoppingCart className="w-4 h-4" />
                                Purchases
                            </button>
                            <button
                                onClick={() => setRoleFilter('seller')}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${roleFilter === 'seller'
                                    ? 'bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <DollarSign className="w-4 h-4" />
                                Sales
                            </button>
                        </div>

                        {/* Status filter */}
                        <select
                            value={statusFilter || ''}
                            onChange={(e) => setStatusFilter(e.target.value || undefined)}
                            className="bg-white/5 border border-[#FF8C00]/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#FF8C00]/50 focus:border-[#FF8C00]"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value || ''} className="bg-[#12121A]">
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="text-center py-16">
                        <div className="w-12 h-12 border-4 border-[#FF8C00]/30 border-t-[#FF8C00] rounded-full animate-spin mx-auto" />
                        <p className="text-gray-400 mt-4">Loading trades...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-16">
                        <p className="text-[#EF4444]">Error: {(error as Error).message}</p>
                    </div>
                )}

                {/* Trades list */}
                {tradesData?.success && tradesData?.data && (
                    <div className="space-y-4">
                        {tradesData.data.map((trade: any, index: number) => {
                            const statusInfo = getTradeStatusInfo(trade.status);

                            return (
                                <motion.div
                                    key={trade.trade_uuid}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="glass-steam rounded-2xl p-5 border border-[#FF8C00]/10 hover:border-[#FF8C00]/25 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Item preview */}
                                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                                            {trade.item_icon_url ? (
                                                <img
                                                    src={trade.item_icon_url}
                                                    alt={trade.item_name}
                                                    className="w-12 h-12 object-contain"
                                                />
                                            ) : (
                                                <Package className="w-8 h-8 text-gray-500" />
                                            )}
                                        </div>

                                        {/* Trade info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-white font-semibold truncate">
                                                    {trade.item_name}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium text-white ${trade.role === 'buyer' ? 'bg-[#8B5CF6]' : 'bg-[#22C55E]'
                                                    }`}>
                                                    {trade.role === 'buyer' ? 'Purchase' : 'Sale'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm mt-1">
                                                #{trade.trade_uuid.slice(0, 8)}
                                            </p>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-[#22C55E]">
                                                ${Number(trade.price).toFixed(2)}
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                {new Date(trade.created_at).toLocaleDateString()}
                                            </p>
                                        </div>

                                        {/* Status */}
                                        <div className="text-right min-w-[100px]">
                                            <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-medium text-white ${statusInfo.color}`}>
                                                {TradeStatusLabels[trade.status] || trade.status}
                                            </span>
                                        </div>

                                        {/* View button */}
                                        <Link
                                            href={`/trade/${trade.trade_uuid}`}
                                            className="flex items-center gap-1 bg-[#FF8C00]/10 hover:bg-[#FF8C00]/20 text-[#FF8C00] px-4 py-2.5 rounded-xl transition-colors font-medium"
                                        >
                                            Details
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    {/* Progress bar for active trades */}
                                    {statusInfo.isActive && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                <span>Progress</span>
                                                <span>{TradeStatusLabels[trade.status]}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA500] transition-all"
                                                    style={{
                                                        width: getProgressWidth(trade.status)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Empty state */}
                {tradesData?.success && tradesData?.data?.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center">
                            <ArrowLeftRight className="w-10 h-10 text-[#FF8C00]/50" />
                        </div>
                        <h3 className="text-white text-xl font-semibold mb-2">No trades yet</h3>
                        <p className="text-gray-400 mb-6">Start trading on the marketplace</p>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF8C00] to-[#E67E00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-[#FF8C00]/20 hover:shadow-[#FF8C00]/30 transition-all"
                        >
                            Browse Marketplace
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

function getProgressWidth(status: string): string {
    const progressMap: Record<string, string> = {
        pending_payment: '10%',
        payment_received: '25%',
        awaiting_seller: '40%',
        seller_accepted: '55%',
        awaiting_buyer: '70%',
        buyer_accepted: '85%',
        completed: '100%',
    };
    return progressMap[status] || '0%';
}
