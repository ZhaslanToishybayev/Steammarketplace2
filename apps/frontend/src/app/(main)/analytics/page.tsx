'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import PopularItemsList from '@/components/analytics/PopularItemsList';

// Dynamic import for chart to avoid SSR issues
const PriceChart = dynamic(() => import('@/components/analytics/PriceChart'), { ssr: false });

interface MarketOverview {
    total: {
        listings: number;
        activeListings: number;
        totalSold: number;
        totalVolume: number;
    };
    trades: {
        total: number;
        completed: number;
        cancelled: number;
        pending: number;
        totalVolume: number;
        completedVolume: number;
    };
    today: {
        trades: number;
        volume: number;
        completed: number;
    };
    byGame: Array<{
        gameId: number;
        gameName: string;
        trades: number;
        volume: number;
    }>;
}

interface RecentTrade {
    id: number;
    item_name: string;
    price: number;
    created_at: string;
    status: string;
}

export default function AnalyticsPage() {
    const [marketData, setMarketData] = useState<MarketOverview | null>(null);
    const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
    const [recentListings, setRecentListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [marketRes, listingsRes] = await Promise.all([
                fetch('/api/analytics/market-overview'),
                fetch('/api/escrow/listings?limit=10&status=active')
            ]);

            if (marketRes.ok) {
                const data = await marketRes.json();
                if (data.success) {
                    setMarketData(data.data);
                }
            }

            if (listingsRes.ok) {
                const data = await listingsRes.json();
                if (data.success || data.listings) {
                    setRecentListings(data.listings || data.data || []);
                }
            }
        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value || 0);
    };

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('ru-RU').format(value || 0);
    };

    const handleSearchItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setSelectedItem(searchQuery.trim());
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 py-8 px-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">📊 Аналитика платформы</h1>
                    <p className="text-gray-400">
                        Статистика торговой площадки, динамика цен и популярные предметы
                    </p>
                </div>

                {/* Market Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {/* Trades Total */}
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-5 border border-blue-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-blue-400 text-sm font-medium">Всего сделок</p>
                            <span className="text-2xl">🔄</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {loading ? '...' : formatNumber(marketData?.trades?.total || 0)}
                        </p>
                        <p className="text-blue-300 text-sm mt-1">
                            ✅ {formatNumber(marketData?.trades?.completed || 0)} завершённых
                        </p>
                    </div>

                    {/* Cancelled trades */}
                    <div className="bg-gradient-to-br from-red-900/50 to-red-800/30 rounded-xl p-5 border border-red-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-red-400 text-sm font-medium">Отменённых</p>
                            <span className="text-2xl">❌</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {loading ? '...' : formatNumber(marketData?.trades?.cancelled || 0)}
                        </p>
                        <p className="text-red-300 text-sm mt-1">
                            ⏳ {formatNumber(marketData?.trades?.pending || 0)} ожидающих
                        </p>
                    </div>

                    {/* Trade Volume */}
                    <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-5 border border-green-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-green-400 text-sm font-medium">Объём сделок</p>
                            <span className="text-2xl">💰</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {loading ? '...' : formatCurrency(marketData?.trades?.totalVolume || 0)}
                        </p>
                        <p className="text-green-300 text-sm mt-1">
                            💵 {formatCurrency(marketData?.trades?.completedVolume || 0)} успешных
                        </p>
                    </div>

                    {/* Today */}
                    <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-5 border border-purple-700/50">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-purple-400 text-sm font-medium">Сегодня</p>
                            <span className="text-2xl">📈</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            {loading ? '...' : formatNumber(marketData?.today?.trades || 0)}
                        </p>
                        <p className="text-purple-300 text-sm mt-1">
                            {formatCurrency(marketData?.today?.volume || 0)} объём
                        </p>
                    </div>
                </div>

                {/* Games breakdown */}
                {marketData?.byGame && marketData.byGame.length > 0 && (
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-8">
                        <h2 className="text-xl font-bold text-white mb-4">🎮 Сделки по играм</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {marketData.byGame.map(game => (
                                <div key={game.gameId} className="bg-gray-700/50 rounded-lg p-4">
                                    <p className="text-gray-400 text-sm">{game.gameName}</p>
                                    <p className="text-2xl font-bold text-white">{formatNumber(game.trades)}</p>
                                    <p className="text-green-400 text-sm">{formatCurrency(game.volume)}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Price Search */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        📈 Динамика цен
                    </h2>
                    <form onSubmit={handleSearchItem} className="flex gap-4 mb-6">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Введите название предмета (напр. AK-47 | Redline)"
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
                        />
                        <button
                            type="submit"
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                        >
                            Найти
                        </button>
                    </form>

                    {selectedItem ? (
                        <PriceChart marketHashName={selectedItem} />
                    ) : (
                        <div className="text-center py-12 text-gray-400 bg-gray-700/30 rounded-xl">
                            <p className="text-4xl mb-4">📉</p>
                            <p className="text-lg">Введите название предмета для просмотра динамики цен</p>
                            <p className="text-sm mt-2 text-gray-500">
                                Например: AK-47 | Redline, AWP | Dragon Lore, Karambit | Fade
                            </p>
                        </div>
                    )}
                </div>

                {/* Recent Listings */}
                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50 mb-8">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        🆕 Последние листинги
                    </h2>
                    {recentListings.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {recentListings.slice(0, 10).map((listing: any) => (
                                <div
                                    key={listing.id}
                                    className="bg-gray-700/50 rounded-lg p-3 hover:bg-gray-700 transition-colors cursor-pointer"
                                >
                                    {listing.item_icon_url && (
                                        <img
                                            src={listing.item_icon_url.startsWith('http') 
                                                ? `/image-proxy?url=${encodeURIComponent(listing.item_icon_url)}`
                                                : `/image-proxy?url=${encodeURIComponent(`https://community.cloudflare.steamstatic.com/economy/image/${listing.item_icon_url}`)}`
                                            }
                                            alt={listing.item_name}
                                            className="w-full h-20 object-contain mb-2"
                                        />
                                    )}
                                    <p className="text-white text-sm font-medium truncate">{listing.item_name}</p>
                                    <p className="text-green-400 font-bold">${listing.price}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-400">
                            <p className="text-4xl mb-2">📭</p>
                            <p>Нет активных листингов</p>
                        </div>
                    )}
                </div>

                {/* Popular Items */}
                <PopularItemsList limit={15} />

                {/* Platform Info */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-700/30">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">🔒</span>
                            <h3 className="text-lg font-bold text-white">Безопасные сделки</h3>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Все сделки проходят через escrow систему с защитой покупателя и продавца
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-xl p-6 border border-green-700/30">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">⚡</span>
                            <h3 className="text-lg font-bold text-white">Мгновенная доставка</h3>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Автоматическая отправка трейд-офферов сразу после оплаты
                        </p>
                    </div>
                    <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-xl p-6 border border-orange-700/30">
                        <div className="flex items-center gap-3 mb-3">
                            <span className="text-3xl">💎</span>
                            <h3 className="text-lg font-bold text-white">Лучшие цены</h3>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Комиссия всего 5% — одна из самых низких на рынке
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
