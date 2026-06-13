'use client';

import { useState } from 'react';
import { useTrades, getTradeStatusInfo, TradeStatusLabels } from '../../../hooks/stableEscrow';
import { useP2PTrades } from '../../../hooks/useP2PTrades';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowLeftRight, ChevronRight, Package, ShoppingCart, DollarSign, UserRound, ShieldCheck } from 'lucide-react';

type TradeSource = 'all' | 'bot' | 'p2p';

export default function MyTradesPage() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [roleFilter, setRoleFilter] = useState<'buyer' | 'seller' | undefined>(undefined);
    const [sourceFilter, setSourceFilter] = useState<TradeSource>('all');

    // Fetch escrow (bot) trades
    const { data: escrowRes, isLoading: escrowLoading } = useTrades({
        status: statusFilter,
        role: roleFilter,
    });

    // Fetch P2P trades
    const p2pParams: Record<string, string> = {};
    if (statusFilter) p2pParams.status = statusFilter;
    if (roleFilter) p2pParams.role = roleFilter;
    const { data: p2pRes, isLoading: p2pLoading } = useP2PTrades(Object.keys(p2pParams).length ? p2pParams : undefined);

    const escrowTrades = (escrowRes as any)?.success ? ((escrowRes as any).data || []) : [];
    const p2pTrades = (p2pRes as any)?.success ? ((p2pRes as any).data || []) : [];

    // Tag source and merge
    const taggedEscrow = escrowTrades.map((t: any) => ({ ...t, _source: 'bot' as const }));
    const taggedP2P = p2pTrades.map((t: any) => ({ ...t, _source: 'p2p' as const }));

    let allTrades = [...taggedEscrow, ...taggedP2P];

    // Deduplicate by trade_uuid (in case escrow endpoint also returns P2P trades)
    const seen = new Set<string>();
    allTrades = allTrades.filter((t) => {
        if (seen.has(t.trade_uuid)) return false;
        seen.add(t.trade_uuid);
        return true;
    });

    // Filter by source
    if (sourceFilter !== 'all') {
        allTrades = allTrades.filter((t) => t._source === sourceFilter || t.trade_type === (sourceFilter === 'p2p' ? 'p2p' : 'bot_sale'));
    }

    // Sort newest first
    allTrades.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const isLoading = escrowLoading || p2pLoading;

    const statusOptions = [
        { value: undefined, label: 'Все статусы' },
        { value: 'WAITING_SELLER', label: 'Ожидание продавца' },
        { value: 'TRADE_SENT', label: 'Трейд отправлен' },
        { value: 'SETTLEMENT_PENDING', label: 'Холд расчёта' },
        { value: 'TRADE_COMPLETED', label: 'Завершено' },
        { value: 'REFUNDED', label: 'Возврат' },
        { value: 'DISPUTED', label: 'Спор' },
        { value: 'pending_payment', label: 'Ожидание оплаты' },
        { value: 'completed', label: 'Завершено (бот)' },
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
                        <span>История сделок</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-3 text-white tracking-tight">Мои сделки</h1>
                    <p className="text-gray-400 text-lg">Все ваши escrow- и P2P-транзакции.</p>
                </div>
            </div>

            <div className="container mx-auto px-6 pb-12">
                {/* Filters */}
                <div className="glass-steam rounded-2xl p-5 mb-8 border border-[#FF8C00]/10">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Source filter */}
                        <div className="flex gap-2">
                            {(['all', 'bot', 'p2p'] as TradeSource[]).map((src) => (
                                <button
                                    key={src}
                                    onClick={() => setSourceFilter(src)}
                                    className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                        sourceFilter === src
                                            ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20'
                                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                >
                                    {src === 'all' && 'Все'}
                                    {src === 'bot' && <><ShieldCheck className="w-4 h-4" /> Bot</>}
                                    {src === 'p2p' && <><UserRound className="w-4 h-4" /> P2P</>}
                                </button>
                            ))}
                        </div>

                        {/* Role filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRoleFilter(undefined)}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                                    !roleFilter ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            >Все</button>
                            <button
                                onClick={() => setRoleFilter('buyer')}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                    roleFilter === 'buyer' ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            ><ShoppingCart className="w-4 h-4" /> Покупки</button>
                            <button
                                onClick={() => setRoleFilter('seller')}
                                className={`px-4 py-2.5 rounded-xl font-medium transition-all flex items-center gap-2 ${
                                    roleFilter === 'seller' ? 'bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                            ><DollarSign className="w-4 h-4" /> Продажи</button>
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
                        <p className="text-gray-400 mt-4">Загрузка сделок...</p>
                    </div>
                )}

                {/* Trades list */}
                {!isLoading && allTrades.length > 0 && (
                    <div className="space-y-4">
                        {allTrades.map((trade: any, index: number) => {
                            const statusInfo = getTradeStatusInfo(trade.status);
                            const isP2P = trade._source === 'p2p' || trade.trade_type === 'p2p';
                            const role = trade.role || (trade.user_role);

                            return (
                                <motion.div
                                    key={trade.trade_uuid}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="glass-steam rounded-2xl p-5 border border-[#FF8C00]/10 hover:border-[#FF8C00]/25 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Item preview */}
                                        <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center flex-shrink-0">
                                            {trade.item_icon_url ? (
                                                <img
                                                    src={trade.item_icon_url.startsWith('http') ? trade.item_icon_url : `https://community.steamstatic.com/economy/image/${trade.item_icon_url}`}
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
                                                <h3 className="text-white font-semibold truncate">{trade.item_name}</h3>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium text-white ${
                                                    role === 'buyer' ? 'bg-[#8B5CF6]' : 'bg-[#22C55E]'
                                                }`}>
                                                    {role === 'buyer' ? 'Покупка' : 'Продажа'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${
                                                    isP2P ? 'bg-cyan-500/20 text-cyan-300' : 'bg-emerald-500/20 text-emerald-300'
                                                }`}>
                                                    {isP2P ? 'P2P' : 'Bot'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm mt-1">#{trade.trade_uuid.slice(0, 8)}</p>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-[#22C55E]">${Number(trade.price).toFixed(2)}</p>
                                            <p className="text-gray-500 text-sm">
                                                {trade.settlement_due_at && trade.status === 'SETTLEMENT_PENDING'
                                                    ? `Выплата ${new Date(trade.settlement_due_at).toLocaleDateString('ru-RU')}`
                                                    : new Date(trade.created_at).toLocaleDateString('ru-RU')}
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
                                            Детали
                                            <ChevronRight className="w-4 h-4" />
                                        </Link>
                                    </div>

                                    {/* Progress bar for active trades */}
                                    {statusInfo.isActive && (
                                        <div className="mt-4 pt-4 border-t border-white/5">
                                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                                <span>Прогресс</span>
                                                <span>{TradeStatusLabels[trade.status] || trade.status}</span>
                                            </div>
                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[#FF8C00] to-[#FFA500] transition-all"
                                                    style={{ width: getProgressWidth(trade.status) }}
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
                {!isLoading && allTrades.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center">
                            <ArrowLeftRight className="w-10 h-10 text-[#FF8C00]/50" />
                        </div>
                        <h3 className="text-white text-xl font-semibold mb-2">Сделок пока нет</h3>
                        <p className="text-gray-400 mb-6">Начните торговлю на маркетплейсе</p>
                        <Link
                            href="/marketplace"
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF8C00] to-[#E67E00] text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-[#FF8C00]/20 hover:shadow-[#FF8C00]/30 transition-all"
                        >
                            Перейти в маркетплейс
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
        PAYMENT_RESERVED: '15%',
        WAITING_SELLER: '30%',
        TRADE_SENT: '55%',
        TRADE_ACCEPTED: '70%',
        SETTLEMENT_PENDING: '85%',
        TRADE_COMPLETED: '100%',
    };
    return progressMap[status] || '0%';
}
