'use client';

import { useParams } from 'next/navigation';
import { useTrade, useCancelTrade, usePayTrade, getTradeStatusInfo, TradeStatusLabels } from '../../../../hooks/stableEscrow';
import { apiClient as api } from '../../../../lib/api';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function TradeDetailPage() {
    const params = useParams();
    const tradeUuid = params.tradeUuid as string;
    const queryClient = useQueryClient();
    const { socket } = useSocket();
    const [isRetrying, setIsRetrying] = useState(false);

    const { data: tradeResponse, isLoading, error } = useTrade(tradeUuid);
    const cancelMutation = useCancelTrade();
    const payMutation = usePayTrade();

    const trade = (tradeResponse as any)?.data;

    // Real-time updates
    useEffect(() => {
        if (!socket || !tradeUuid) return;

        // Join trade room
        socket.emit('trade:subscribe', tradeUuid);

        // Listen for updates
        const handleUpdate = (data: any) => {
            console.log('Trade update received:', data);
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trade', tradeUuid] });
            
            if (data.status === 'completed') toast.success('Сделка завершена!');
            if (data.status === 'cancelled') toast.error('Сделка отменена');
        };

        socket.on('trade:update', handleUpdate);

        return () => {
            socket.off('trade:update', handleUpdate);
            socket.emit('trade:unsubscribe', tradeUuid);
        };
    }, [socket, tradeUuid, queryClient]);

    const handleCancel = async () => {
        if (confirm('Вы уверены, что хотите отменить сделку?')) {
            try {
                await cancelMutation.mutateAsync({ tradeUuid, reason: 'User cancelled' });
                toast.success('Сделка отменена');
            } catch (err) {
                toast.error('Ошибка при отмене');
            }
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        try {
            await api.escrow.retryTrade(trade.trade_uuid);
            toast.success('Попытка отправки...');
            // Invalidate to update status to "processing" if backend supports immediate update
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trade', tradeUuid] });
        } catch (e) {
            toast.error('Ошибка повторной отправки. Steam перегружен.');
        } finally {
            setIsRetrying(false);
        }
    };

    const handlePay = async () => {
        try {
            await payMutation.mutateAsync({
                tradeUuid,
                paymentData: { paymentMethod: 'stripe' },
            });
            alert('Оплата успешна!');
        } catch (err) {
            alert('Ошибка оплаты');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (error || !trade) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-red-400">Сделка не найдена</p>
            </div>
        );
    }

    const statusInfo = getTradeStatusInfo(trade.status);

    // Status timeline steps
    const steps = [
        { id: 'payment', label: 'Оплата', icon: '💳' },
        { id: 'seller', label: 'Продавец', icon: '📦' },
        { id: 'processing', label: 'Получено', icon: '✓' },
        { id: 'delivery', label: 'Доставка', icon: '🎁' },
        { id: 'completed', label: 'Готово', icon: '✅' },
    ];

    const statusToStep: Record<string, number> = {
        'pending_payment': 0,
        'payment_received': 1,
        'awaiting_seller': 1,
        'seller_accepted': 2,
        'awaiting_buyer': 3,
        'buyer_accepted': 3,
        'completed': 4,
        'cancelled': -1,
        'refunded': -1,
        'expired': -1,
        'error_sending': 1 // Show at step 1 but we'll apply error styling via statusInfo
    };

    const currentStepIndex = statusToStep[trade.status] ?? -1;

    // Handle specific error case for text
    if (trade.status === 'error_sending') {
        statusInfo.isError = true;
        statusInfo.color = 'bg-red-500';
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <a href="/my-trades" className="text-gray-400 hover:text-white">
                            ← Назад
                        </a>
                        <h1 className="text-2xl font-bold text-white">
                            Сделка #{tradeUuid.slice(0, 8)}
                        </h1>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Status card */}
                <div className={`rounded-xl p-6 mb-6 border transition-colors duration-300 ${statusInfo.isSuccess ? 'bg-green-900/30 border-green-600/50' :
                    statusInfo.isError ? 'bg-red-900/30 border-red-600/50' :
                        'bg-gray-800/70 border-gray-700'
                    }`}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-white font-medium shadow-sm ${statusInfo.color}`}>
                                {TradeStatusLabels[trade.status]}
                            </span>
                        </div>
                        <span className={`text-gray-400 text-sm font-medium bg-gray-900/40 px-3 py-1 rounded-lg`}>
                            {trade.user_role === 'buyer' ? '🛒 Вы покупаете' : '💰 Вы продаете'}
                        </span>
                    </div>

                    {/* Progress timeline */}
                    {!statusInfo.isError && (
                        <div className="relative flex items-center justify-between mt-4 px-2">
                            {/* Connecting Line background */}
                            <div className="absolute left-0 top-5 w-full h-1 bg-gray-700 rounded-full -z-0"></div>

                            {/* Active Line (Dynamic width based on step) */}
                            <div
                                className="absolute left-0 top-5 h-1 bg-blue-500 rounded-full transition-all duration-500 -z-0"
                                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
                            ></div>

                            {steps.map((step, index) => {
                                const isCompleted = index <= currentStepIndex || trade.status === 'completed';
                                const isCurrent = index === currentStepIndex;

                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-4 transition-all duration-300 ${isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                                            isCurrent ? 'bg-gray-800 border-blue-500 text-blue-400' :
                                                'bg-gray-800 border-gray-700 text-gray-600'
                                            }`}>
                                            {step.icon}
                                        </div>
                                        <p className={`text-xs sm:text-sm mt-3 font-medium transition-colors duration-300 ${isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                                            }`}>
                                            {step.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {trade.status === 'error_sending' && (
                        <div className="flex flex-col sm:flex-row gap-3 mt-4">
                            <button
                                onClick={handleRetry}
                                disabled={isRetrying}
                                className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                {isRetrying ? '⏳ Отправка...' : '🔄 Повторить отправку'}
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm('Вы уверены? Деньги вернутся на баланс, а скин вернется в продажу.')) return;
                                    try {
                                        await api.escrow.cancelTrade(trade.trade_uuid);
                                        window.location.reload();
                                    } catch (e) {
                                        alert('Cancel failed.');
                                    }
                                }}
                                className="w-full sm:w-auto bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                ❌ Отменить и вернуть
                            </button>
                        </div>
                    )}
                </div>

                {/* Item details */}
                <div className="bg-gray-800/70 rounded-xl p-6 mb-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Предмет</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-900/50 rounded-lg flex items-center justify-center">
                            {trade.item_icon_url ? (
                                <img src={trade.item_icon_url} alt={trade.item_name} className="w-20 h-20 object-contain" />
                            ) : (
                                <span className="text-4xl">🎮</span>
                            )}
                        </div>
                        <div>
                            <h3 className="text-white font-semibold text-xl">{trade.item_name}</h3>
                            <p className="text-gray-400">App ID: {trade.item_app_id}</p>
                        </div>
                    </div>
                </div>

                {/* Financial details */}
                <div className="bg-gray-800/70 rounded-xl p-6 mb-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Финансы</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Цена предмета</span>
                            <span className="text-white font-medium">${Number(trade.price).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Комиссия платформы</span>
                            <span className="text-red-400">-${Number(trade.platform_fee).toFixed(2)}</span>
                        </div>
                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Выплата продавцу</span>
                                <span className="text-green-400 font-bold">${Number(trade.seller_payout).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4">
                    {trade.status === 'pending_payment' && trade.user_role === 'buyer' && (
                        <button
                            onClick={handlePay}
                            disabled={payMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
                        >
                            {payMutation.isPending ? 'Обработка...' : '💳 Оплатить $' + Number(trade.price).toFixed(2)}
                        </button>
                    )}

                    {statusInfo.isActive && !['awaiting_buyer', 'buyer_accepted'].includes(trade.status) && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelMutation.isPending}
                            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition border border-red-600/50 disabled:opacity-50"
                        >
                            Отменить
                        </button>
                    )}
                </div>

                {/* Status history */}
                {trade.status_history && trade.status_history.length > 0 && (
                    <div className="bg-gray-800/70 rounded-xl p-6 mt-6 border border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-4">История</h2>
                        <div className="space-y-3">
                            {trade.status_history.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 w-32">
                                        {new Date(entry.timestamp).toLocaleString('ru-RU')}
                                    </span>
                                    <span className={`px-2 py-1 rounded ${getTradeStatusInfo(entry.status).color}`}>
                                        {TradeStatusLabels[entry.status]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
