'use client';

import { useEffect, useState } from 'react';

interface PopularItem {
    market_hash_name: string;
    game_id: number;
    total_sales: number;
    avg_price: number;
    volume_24h: number;
    price_trend: number;
    image_url?: string;
    rarity?: string;
}

interface PopularItemsListProps {
    limit?: number;
    gameId?: number;
}

export default function PopularItemsList({ limit = 10, gameId }: PopularItemsListProps) {
    const [items, setItems] = useState<PopularItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGame, setSelectedGame] = useState<number | undefined>(gameId);

    useEffect(() => {
        fetchPopularItems();
    }, [selectedGame, limit]);

    const fetchPopularItems = async () => {
        setLoading(true);
        try {
            let url = `/api/analytics/popular-items?limit=${limit}`;
            if (selectedGame) url += `&gameId=${selectedGame}`;

            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            if (data.success) {
                setItems(data.data);
            }
        } catch (err) {
            console.error('Failed to fetch popular items:', err);
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

    const getGameName = (id: number) => {
        return id === 730 ? 'CS2' : id === 570 ? 'Dota 2' : 'Other';
    };

    const getRarityColor = (rarity?: string) => {
        const colors: Record<string, string> = {
            'common': 'border-gray-500',
            'uncommon': 'border-green-500',
            'rare': 'border-blue-500',
            'mythical': 'border-purple-500',
            'legendary': 'border-orange-500',
            'ancient': 'border-red-500',
            'immortal': 'border-yellow-500',
        };
        return colors[rarity?.toLowerCase() || ''] || 'border-gray-600';
    };

    return (
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    🔥 Популярные предметы
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setSelectedGame(undefined)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${!selectedGame
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        Все
                    </button>
                    <button
                        onClick={() => setSelectedGame(730)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedGame === 730
                                ? 'bg-orange-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        CS2
                    </button>
                    <button
                        onClick={() => setSelectedGame(570)}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedGame === 570
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                    >
                        Dota 2
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse bg-gray-700/50 h-16 rounded-lg"></div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Нет данных о популярных предметах</p>
            ) : (
                <div className="space-y-3">
                    {items.map((item, idx) => (
                        <div
                            key={item.market_hash_name}
                            className={`flex items-center gap-4 p-3 bg-gray-700/30 rounded-lg border-l-4 ${getRarityColor(item.rarity)} hover:bg-gray-700/50 transition-colors`}
                        >
                            <div className="w-8 h-8 flex items-center justify-center text-gray-400 font-bold">
                                #{idx + 1}
                            </div>

                            {item.image_url ? (
                                <img
                                    src={item.image_url}
                                    alt={item.market_hash_name}
                                    className="w-12 h-12 object-contain"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No img</span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="text-white font-medium truncate">{item.market_hash_name}</p>
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-400">{getGameName(item.game_id)}</span>
                                    <span className="text-gray-600">•</span>
                                    <span className="text-gray-400">{item.total_sales} продаж</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <p className="text-white font-bold">{formatCurrency(item.avg_price)}</p>
                                {item.price_trend !== 0 && (
                                    <p className={`text-sm ${item.price_trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {item.price_trend > 0 ? '↑' : '↓'} {Math.abs(item.price_trend).toFixed(1)}%
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
