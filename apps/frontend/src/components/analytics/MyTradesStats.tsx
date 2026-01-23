'use client';

import { useEffect, useState } from 'react';

interface TradeStats {
    totalBought: number;
    totalSold: number;
    totalSpent: number;
    totalEarned: number;
    profit: number;
}

interface Trade {
    id: number;
    status: string;
    price: number;
    fee: number;
    created_at: string;
    completed_at: string | null;
    item_name: string;
    image_url: string;
    trade_type: 'buy' | 'sell';
}

export default function MyTradesStats() {
    const [stats, setStats] = useState<TradeStats | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchMyTrades();
    }, [page]);

    const fetchMyTrades = async () => {
        try {
            const res = await fetch(`/api/analytics/my-trades?page=${page}&limit=10`, {
                credentials: 'include'
            });
            if (!res.ok) {
                if (res.status === 401) {
                    setError('Войдите в аккаунт для просмотра статистики');
                    return;
                }
                throw new Error('Failed to fetch');
            }
            const data = await res.json();
            if (data.success) {
                setStats(data.data.stats);
                setTrades(data.data.trades);
                setTotalPages(Math.ceil(data.data.pagination.total / data.data.pagination.limit));
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(value || 0);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <div className="animate-pulse space-y-4">
                    <div className="h-6 bg-gray-700 rounded w-1/4"></div>
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-700 rounded"></div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 text-center">
                <p className="text-gray-400">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-700/50">
                        <p className="text-blue-400 text-sm">Куплено</p>
                        <p className="text-2xl font-bold text-white">{stats.totalBought}</p>
                    </div>
                    <div className="bg-orange-900/30 rounded-xl p-4 border border-orange-700/50">
                        <p className="text-orange-400 text-sm">Продано</p>
                        <p className="text-2xl font-bold text-white">{stats.totalSold}</p>
                    </div>
                    <div className="bg-red-900/30 rounded-xl p-4 border border-red-700/50">
                        <p className="text-red-400 text-sm">Потрачено</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(stats.totalSpent)}</p>
                    </div>
                    <div className="bg-green-900/30 rounded-xl p-4 border border-green-700/50">
                        <p className="text-green-400 text-sm">Заработано</p>
                        <p className="text-xl font-bold text-white">{formatCurrency(stats.totalEarned)}</p>
                    </div>
                    <div className={`rounded-xl p-4 border ${stats.profit >= 0 ? 'bg-emerald-900/30 border-emerald-700/50' : 'bg-red-900/30 border-red-700/50'}`}>
                        <p className={stats.profit >= 0 ? 'text-emerald-400 text-sm' : 'text-red-400 text-sm'}>Прибыль</p>
                        <p className={`text-xl font-bold ${stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                        </p>
                    </div>
                </div>
            )}

            {/* Trades History */}
            <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-semibold text-white mb-4">История сделок</h3>

                {trades.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">Нет завершённых сделок</p>
                ) : (
                    <div className="space-y-3">
                        {trades.map((trade) => (
                            <div
                                key={trade.id}
                                className="flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
                            >
                                {trade.image_url ? (
                                    <img
                                        src={trade.image_url}
                                        alt={trade.item_name}
                                        className="w-12 h-12 object-contain"
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                                        <span className="text-gray-400 text-xs">📦</span>
                                    </div>
                                )}

                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{trade.item_name}</p>
                                    <p className="text-gray-400 text-sm">{formatDate(trade.created_at)}</p>
                                </div>

                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${trade.trade_type === 'buy'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-green-500/20 text-green-400'
                                    }`}>
                                    {trade.trade_type === 'buy' ? 'Покупка' : 'Продажа'}
                                </div>

                                <div className="text-right">
                                    <p className={`font-bold ${trade.trade_type === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                                        {trade.trade_type === 'buy' ? '-' : '+'}{formatCurrency(trade.price)}
                                    </p>
                                    {trade.fee > 0 && (
                                        <p className="text-gray-500 text-xs">Комиссия: {formatCurrency(trade.fee)}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-6">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                            ←
                        </button>
                        <span className="px-4 py-2 text-gray-400">
                            {page} / {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-gray-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-600 transition-colors"
                        >
                            →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
