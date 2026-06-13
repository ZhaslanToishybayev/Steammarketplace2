'use client';

import { useEffect, useState } from 'react';

interface InventoryValueData {
    totalItems: number;
    totalValue: number;
    avgPrice: number;
    topItems: Array<{
        item_name: string;
        price: number;
        image_url: string;
        rarity: string;
    }>;
    valueChange: {
        currentValue: number;
        oldValue: number;
        changePercent: number;
    };
}

export default function InventoryValueCard() {
    const [data, setData] = useState<InventoryValueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchInventoryValue();
    }, []);

    const fetchInventoryValue = async () => {
        try {
            const res = await fetch('/api/analytics/inventory-value', { credentials: 'include' });
            if (!res.ok) {
                if (res.status === 401) {
                    setError('Войдите в аккаунт');
                    return;
                }
                throw new Error('Failed to fetch');
            }
            const result = await res.json();
            if (result.success) {
                setData(result.data);
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

    if (loading) {
        return (
            <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-xl p-6 border border-emerald-700/50 animate-pulse">
                <div className="h-6 bg-emerald-700/50 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-emerald-700/50 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-emerald-700/50 rounded w-2/3"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-gradient-to-br from-gray-800/50 to-gray-700/30 rounded-xl p-6 border border-gray-600/50">
                <p className="text-gray-400 text-center">{error}</p>
            </div>
        );
    }

    if (!data) return null;

    const changeColor = data.valueChange.changePercent >= 0 ? 'text-green-400' : 'text-red-400';
    const changeIcon = data.valueChange.changePercent >= 0 ? '↑' : '↓';

    return (
        <div className="bg-gradient-to-br from-emerald-900/50 to-emerald-800/30 rounded-xl p-6 border border-emerald-700/50">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-emerald-400">Стоимость инвентаря</h3>
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <span className="text-2xl">💎</span>
                </div>
            </div>

            <div className="mb-4">
                <p className="text-3xl font-bold text-white">{formatCurrency(data.totalValue)}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-medium ${changeColor}`}>
                        {changeIcon} {Math.abs(data.valueChange.changePercent).toFixed(1)}%
                    </span>
                    <span className="text-gray-400 text-sm">за 7 дней</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-emerald-900/30 rounded-lg p-3">
                    <p className="text-emerald-300 text-sm">Предметов</p>
                    <p className="text-white font-bold text-lg">{data.totalItems}</p>
                </div>
                <div className="bg-emerald-900/30 rounded-lg p-3">
                    <p className="text-emerald-300 text-sm">Средняя цена</p>
                    <p className="text-white font-bold text-lg">{formatCurrency(data.avgPrice)}</p>
                </div>
            </div>

            {data.topItems && data.topItems.length > 0 && (
                <div>
                    <p className="text-emerald-300 text-sm mb-2">Топ дорогих:</p>
                    <div className="space-y-2">
                        {data.topItems.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-emerald-900/20 rounded-lg p-2">
                                <div className="flex items-center gap-2">
                                    {item.image_url && (
                                        <img
                                            src={item.image_url}
                                            alt={item.item_name}
                                            className="w-8 h-8 object-contain"
                                        />
                                    )}
                                    <span className="text-white text-sm truncate max-w-[120px]">
                                        {item.item_name}
                                    </span>
                                </div>
                                <span className="text-emerald-400 font-medium text-sm">
                                    {formatCurrency(item.price)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
