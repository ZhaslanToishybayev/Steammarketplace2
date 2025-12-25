'use client';

import { useState } from 'react';
import { useTrades, getTradeStatusInfo, TradeStatusLabels } from '../../../hooks/stableEscrow';
import { apiClient as api } from '../../../lib/api';

export default function MyTradesPage() {
    const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
    const [roleFilter, setRoleFilter] = useState<'buyer' | 'seller' | undefined>(undefined);

    const { data: tradesResponse, isLoading, error } = useTrades({
        status: statusFilter,
        role: roleFilter,
    });

    const tradesData = tradesResponse as any;

    const statusOptions = [
        { value: undefined, label: 'Все статусы' },
        { value: 'pending_payment', label: '💰 Ожидание оплаты' },
        { value: 'awaiting_seller', label: '📦 Ожидание продавца' },
        { value: 'awaiting_buyer', label: '🎁 Ожидание покупателя' },
        { value: 'completed', label: '✅ Завершено' },
        { value: 'cancelled', label: '❌ Отменено' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-3xl font-bold text-white">
                        📋 Мои сделки
                    </h1>
                    <p className="text-gray-400 mt-1">
                        История escrow сделок
                    </p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Filters */}
                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                    <div className="flex flex-wrap gap-4 items-center">
                        {/* Role filter */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setRoleFilter(undefined)}
                                className={`px-4 py-2 rounded-lg transition ${!roleFilter
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                Все
                            </button>
                            <button
                                onClick={() => setRoleFilter('buyer')}
                                className={`px-4 py-2 rounded-lg transition ${roleFilter === 'buyer'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                🛒 Покупки
                            </button>
                            <button
                                onClick={() => setRoleFilter('seller')}
                                className={`px-4 py-2 rounded-lg transition ${roleFilter === 'seller'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                            >
                                💰 Продажи
                            </button>
                        </div>

                        {/* Status filter */}
                        <select
                            value={statusFilter || ''}
                            onChange={(e) => setStatusFilter(e.target.value || undefined)}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {statusOptions.map((opt) => (
                                <option key={opt.value || 'all'} value={opt.value || ''}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="text-center py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
                        <p className="text-gray-400 mt-4">Загрузка сделок...</p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="text-center py-12">
                        <p className="text-red-400">Ошибка: {(error as Error).message}</p>
                    </div>
                )}

                {/* Trades list */}
                {tradesData?.success && tradesData?.data && (
                    <div className="space-y-4">
                        {tradesData.data.map((trade: any) => {
                            const statusInfo = getTradeStatusInfo(trade.status);

                            return (
                                <div
                                    key={trade.trade_uuid}
                                    className="bg-gray-800/70 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Item preview */}
                                        <div className="w-16 h-16 bg-gray-900/50 rounded-lg flex items-center justify-center">
                                            {trade.item_icon_url ? (
                                                <img
                                                    src={trade.item_icon_url}
                                                    alt={trade.item_name}
                                                    className="w-12 h-12 object-contain"
                                                />
                                            ) : (
                                                <span className="text-2xl">🎮</span>
                                            )}
                                        </div>

                                        {/* Trade info */}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-white font-semibold">
                                                    {trade.item_name}
                                                </h3>
                                                <span className={`px-2 py-0.5 rounded text-xs text-white ${trade.role === 'buyer' ? 'bg-green-600' : 'bg-purple-600'
                                                    }`}>
                                                    {trade.role === 'buyer' ? 'Покупка' : 'Продажа'}
                                                </span>
                                            </div>

                                            <p className="text-gray-400 text-sm mt-1">
                                                Trade #{trade.trade_uuid.slice(0, 8)}
                                            </p>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-xl font-bold text-green-400">
                                                ${Number(trade.price).toFixed(2)}
                                            </p>
                                            <p className="text-gray-500 text-sm">
                                                {new Date(trade.created_at).toLocaleDateString('ru-RU')}
                                            </p>
                                        </div>

                                        {/* Status */}
                                        <div className="text-right min-w-[120px]">
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm text-white ${statusInfo.color}`}>
                                                {TradeStatusLabels[trade.status] || trade.status}
                                            </span>
                                        </div>

                                        {/* View button */}
                                        <a
                                            href={`/trade/${trade.trade_uuid}`}
                                            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
                                        >
                                            Подробнее →
                                        </a>
                                    </div>

                                    {/* Progress bar for active trades */}
                                    {statusInfo.isActive && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                                <span>Прогресс сделки</span>
                                                <span>{TradeStatusLabels[trade.status]}</span>
                                            </div>
                                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full ${statusInfo.color} transition-all`}
                                                    style={{
                                                        width: getProgressWidth(trade.status)
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Empty state */}
                {tradesData?.success && tradesData?.data?.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-gray-400 text-lg">Нет сделок</p>
                        <p className="text-gray-500 mt-2">
                            <a href="/marketplace" className="text-blue-400 hover:underline">
                                Перейти на маркетплейс →
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper to calculate progress bar width based on status
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
