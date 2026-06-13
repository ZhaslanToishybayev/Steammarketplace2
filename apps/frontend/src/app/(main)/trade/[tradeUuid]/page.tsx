'use client';

import { useParams, useRouter } from 'next/navigation';
import { useTrade, useCancelTrade, usePayTrade, getTradeStatusInfo, TradeStatusLabels } from '../../../../hooks/stableEscrow';
import { useP2PTrade, useCancelP2PTrade, useMarkSellerSent, useSyncP2PTrade } from '../../../../hooks/useP2PTrades';
import { useSocket } from '@/hooks/useSocket';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

// P2P-specific status timeline
const P2P_STEPS = [
    { id: 'reserved', label: 'Оплата', icon: '💳' },
    { id: 'waiting', label: 'Ожидание продавца', icon: '⏳' },
    { id: 'sent', label: 'Трейд отправлен', icon: '📦' },
    { id: 'hold', label: 'Холд (7 дней)', icon: '🔒' },
    { id: 'done', label: 'Готово', icon: '✅' },
];

const P2P_STATUS_TO_STEP: Record<string, number> = {
    'PAYMENT_RESERVED': 0,
    'WAITING_SELLER': 1,
    'TRADE_SENT': 2,
    'TRADE_ACCEPTED': 3,
    'SETTLEMENT_PENDING': 3,
    'TRADE_COMPLETED': 4,
    'CANCELLED': -1,
    'REFUNDED': -1,
    'DISPUTED': -1,
};

const BOT_STEPS = [
    { id: 'payment', label: 'Оплата', icon: '💳' },
    { id: 'seller', label: 'Продавец', icon: '📦' },
    { id: 'processing', label: 'Получено', icon: '✓' },
    { id: 'delivery', label: 'Доставка', icon: '🎁' },
    { id: 'completed', label: 'Готово', icon: '✅' },
];

const BOT_STATUS_TO_STEP: Record<string, number> = {
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
    'error_sending': 1,
};

export default function TradeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const tradeUuid = params.tradeUuid as string;
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    // Seller-sent modal
    const [showSellerSentModal, setShowSellerSentModal] = useState(false);
    const [tradeOfferId, setTradeOfferId] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    // Try both escrow and P2P queries, one will match
    const { data: escrowRes, isLoading: escrowLoading } = useTrade(tradeUuid);
    const { data: p2pRes, isLoading: p2pLoading } = useP2PTrade(tradeUuid);

    const cancelEscrow = useCancelTrade();
    const cancelP2P = useCancelP2PTrade();
    const payMutation = usePayTrade();
    const markSentMut = useMarkSellerSent();
    const syncMut = useSyncP2PTrade();

    // Determine which data source has the trade
    const escrowTrade = (escrowRes as any)?.data;
    const p2pTrade = (p2pRes as any)?.data;
    const trade = p2pTrade || escrowTrade;
    const isP2P = !!p2pTrade || trade?.trade_type === 'p2p' || trade?.trade_type === 'p2p_direct';
    const isLoading = escrowLoading && p2pLoading;

    // Real-time updates
    useEffect(() => {
        if (!socket || !tradeUuid) return;
        socket.emit('trade:subscribe', tradeUuid);

        const handleUpdate = (data: any) => {
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trade', tradeUuid] });
            queryClient.invalidateQueries({ queryKey: ['p2p', 'trade', tradeUuid] });
            if (data.status === 'TRADE_COMPLETED' || data.status === 'completed') toast.success('Сделка завершена!');
            if (data.status === 'CANCELLED' || data.status === 'cancelled') toast.error('Сделка отменена');
            if (data.status === 'REFUNDED' || data.status === 'refunded') toast('Средства возвращены', { icon: '💰' });
        };
        socket.on('trade:update', handleUpdate);

        return () => {
            socket.off('trade:update', handleUpdate);
            socket.emit('trade:unsubscribe', tradeUuid);
        };
    }, [socket, tradeUuid, queryClient]);

    const handleCancel = async () => {
        if (!confirm('Вы уверены, что хотите отменить сделку? Средства вернутся покупателю.')) return;
        try {
            if (isP2P) {
                await cancelP2P.mutateAsync({ tradeUuid, reason: 'User cancelled' });
            } else {
                await cancelEscrow.mutateAsync({ tradeUuid, reason: 'User cancelled' });
            }
            toast.success('Сделка отменена. Средства возвращены.');
        } catch (err) {
            toast.error('Ошибка при отмене');
        }
    };

    const handleSellerSent = async () => {
        try {
            await markSentMut.mutateAsync({ tradeUuid, tradeOfferId: tradeOfferId || undefined });
            toast.success('Статус обновлён! Ожидаем подтверждение.');
            setShowSellerSentModal(false);
            setTradeOfferId('');
        } catch (err: any) {
            toast.error(err.message || 'Ошибка');
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncMut.mutateAsync(tradeUuid);
            toast.success('Синхронизировано со Steam');
        } catch (err: any) {
            toast.error(err.message || 'Ошибка синхронизации');
        } finally {
            setIsSyncing(false);
        }
    };

    const handlePay = async () => {
        try {
            await payMutation.mutateAsync({ tradeUuid, paymentData: { paymentMethod: 'stripe' } });
            toast.success('Оплата успешна!');
        } catch (err) {
            toast.error('Ошибка оплаты');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-red-400">Сделка не найдена</p>
            </div>
        );
    }

    const statusInfo = getTradeStatusInfo(trade.status);
    const steps = isP2P ? P2P_STEPS : BOT_STEPS;
    const statusToStep = isP2P ? P2P_STATUS_TO_STEP : BOT_STATUS_TO_STEP;
    const currentStepIndex = statusToStep[trade.status] ?? -1;
    const isSeller = trade.user_role === 'seller';
    const isBuyer = trade.user_role === 'buyer';

    // Seller actions visible when status = WAITING_SELLER
    const showSellerActions = isSeller && trade.status === 'WAITING_SELLER';
    // Cancel is available before settlement
    const canCancel = ['PAYMENT_RESERVED', 'WAITING_SELLER', 'TRADE_SENT', 'pending_payment'].includes(trade.status);
    // Sync available when trade_sent
    const canSync = isP2P && trade.status === 'TRADE_SENT';

    // Deadline info
    const sellerDeadline = trade.seller_deadline_at ? new Date(trade.seller_deadline_at) : null;
    const settlementDue = trade.settlement_due_at ? new Date(trade.settlement_due_at) : null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <a href="/my-trades" className="text-gray-400 hover:text-white">← Назад</a>
                        <h1 className="text-2xl font-bold text-white">
                            {isP2P ? '🤝 P2P Сделка' : 'Сделка'} #{tradeUuid.slice(0, 8)}
                        </h1>
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

                {/* Status card */}
                <div className={`rounded-xl p-6 border transition-colors duration-300 ${
                    statusInfo.isSuccess ? 'bg-green-900/30 border-green-600/50' :
                    statusInfo.isError ? 'bg-red-900/30 border-red-600/50' :
                    'bg-gray-800/70 border-gray-700'
                }`}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <span className={`px-4 py-1.5 rounded-full text-white font-medium shadow-sm ${statusInfo.color}`}>
                                {TradeStatusLabels[trade.status] || trade.status}
                            </span>
                            {isP2P && (
                                <span className="px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium">P2P</span>
                            )}
                        </div>
                        <span className="text-gray-400 text-sm font-medium bg-gray-900/40 px-3 py-1 rounded-lg">
                            {isBuyer ? '🛒 Вы покупаете' : '💰 Вы продаёте'}
                        </span>
                    </div>

                    {/* Progress timeline */}
                    {!statusInfo.isError && (
                        <div className="relative flex items-center justify-between mt-4 px-2">
                            <div className="absolute left-0 top-5 w-full h-1 bg-gray-700 rounded-full -z-0" />
                            <div
                                className="absolute left-0 top-5 h-1 bg-blue-500 rounded-full transition-all duration-500 -z-0"
                                style={{ width: `${(Math.max(0, currentStepIndex) / (steps.length - 1)) * 100}%` }}
                            />
                            {steps.map((step, index) => {
                                const isCompleted = index <= currentStepIndex;
                                const isCurrent = index === currentStepIndex;
                                return (
                                    <div key={step.id} className="relative z-10 flex flex-col items-center flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-lg border-4 transition-all duration-300 ${
                                            isCompleted ? 'bg-blue-600 border-blue-600 text-white' :
                                            isCurrent ? 'bg-gray-800 border-blue-500 text-blue-400' :
                                            'bg-gray-800 border-gray-700 text-gray-600'
                                        }`}>
                                            {step.icon}
                                        </div>
                                        <p className={`text-xs sm:text-sm mt-3 font-medium transition-colors duration-300 ${
                                            isCompleted || isCurrent ? 'text-white' : 'text-gray-500'
                                        }`}>
                                            {step.label}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Deadline warning */}
                    {sellerDeadline && trade.status === 'WAITING_SELLER' && (
                        <div className="mt-6 p-3 rounded-lg bg-yellow-900/30 border border-yellow-600/40 text-yellow-300 text-sm">
                            ⏰ {isSeller ? 'Вам нужно отправить трейд до' : 'Продавец должен отправить трейд до'}:{' '}
                            <strong>{sellerDeadline.toLocaleString('ru-RU')}</strong>
                        </div>
                    )}

                    {/* Settlement hold info */}
                    {settlementDue && trade.status === 'SETTLEMENT_PENDING' && (
                        <div className="mt-6 p-3 rounded-lg bg-purple-900/30 border border-purple-600/40 text-purple-300 text-sm">
                            🔒 Средства будут выплачены продавцу после холда:{' '}
                            <strong>{settlementDue.toLocaleString('ru-RU')}</strong>
                        </div>
                    )}
                </div>

                {/* Seller Action Panel (only for seller when waiting) */}
                {showSellerActions && (
                    <div className="rounded-xl p-6 border border-orange-500/40 bg-orange-900/20">
                        <h2 className="text-lg font-semibold text-orange-300 mb-3">📦 Действия продавца</h2>
                        <p className="text-gray-300 text-sm mb-4">
                            Отправьте Steam trade offer покупателю, затем нажмите «Трейд отправлен».
                        </p>
                        {trade.buyer_trade_url && (
                            <div className="mb-4 p-3 rounded-lg bg-gray-800/60 border border-gray-700">
                                <p className="text-gray-400 text-xs mb-1">Trade URL покупателя (открой в Steam):</p>
                                <div className="flex items-center gap-2">
                                    <code className="text-cyan-300 text-sm break-all flex-1">{trade.buyer_trade_url}</code>
                                    <a
                                        href={trade.buyer_trade_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition"
                                    >
                                        🔗 Открыть
                                    </a>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(trade.buyer_trade_url); toast.success('Скопировано!'); }}
                                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        )}
                        {!showSellerSentModal ? (
                            <button
                                onClick={() => setShowSellerSentModal(true)}
                                className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition"
                            >
                                ✅ Трейд отправлен
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <input
                                    type="text"
                                    placeholder="Trade Offer ID (опционально)"
                                    value={tradeOfferId}
                                    onChange={(e) => setTradeOfferId(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleSellerSent}
                                        disabled={markSentMut.isPending}
                                        className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white px-6 py-2 rounded-lg font-semibold transition"
                                    >
                                        {markSentMut.isPending ? 'Отправка...' : 'Подтвердить'}
                                    </button>
                                    <button
                                        onClick={() => setShowSellerSentModal(false)}
                                        className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
                                    >
                                        Отмена
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Item details */}
                <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Предмет</h2>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 bg-gray-900/50 rounded-lg flex items-center justify-center">
                            {trade.item_icon_url ? (
                                <img src={trade.item_icon_url.startsWith('http') ? trade.item_icon_url : `https://community.steamstatic.com/economy/image/${trade.item_icon_url}`} alt={trade.item_name} className="w-20 h-20 object-contain" />
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
                <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">Финансы</h2>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Цена предмета</span>
                            <span className="text-white font-medium">${Number(trade.price).toFixed(2)}</span>
                        </div>
                        {trade.platform_fee != null && (
                            <div className="flex justify-between">
                                <span className="text-gray-400">Комиссия платформы ({trade.platform_fee_percent || 5}%)</span>
                                <span className="text-red-400">-${Number(trade.platform_fee).toFixed(2)}</span>
                            </div>
                        )}
                        {trade.seller_payout != null && (
                            <div className="border-t border-gray-700 pt-2 mt-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Выплата продавцу</span>
                                    <span className="text-green-400 font-bold">${Number(trade.seller_payout).toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-4">
                    {!isP2P && trade.status === 'pending_payment' && isBuyer && (
                        <button
                            onClick={handlePay}
                            disabled={payMutation.isPending}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-semibold transition disabled:opacity-50"
                        >
                            {payMutation.isPending ? 'Обработка...' : `💳 Оплатить $${Number(trade.price).toFixed(2)}`}
                        </button>
                    )}

                    {canSync && (
                        <button
                            onClick={handleSync}
                            disabled={isSyncing}
                            className="px-6 py-3 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-xl font-medium transition border border-blue-600/50 disabled:opacity-50"
                        >
                            {isSyncing ? '⏳ Синхронизация...' : '🔄 Проверить статус в Steam'}
                        </button>
                    )}

                    {canCancel && (
                        <button
                            onClick={handleCancel}
                            disabled={cancelP2P.isPending || cancelEscrow.isPending}
                            className="px-6 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-xl font-medium transition border border-red-600/50 disabled:opacity-50"
                        >
                            ❌ Отменить сделку
                        </button>
                    )}
                </div>

                {/* Status history */}
                {trade.status_history && trade.status_history.length > 0 && (
                    <div className="bg-gray-800/70 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-lg font-semibold text-white mb-4">История</h2>
                        <div className="space-y-3">
                            {trade.status_history.map((entry: any, index: number) => (
                                <div key={index} className="flex items-center gap-4 text-sm">
                                    <span className="text-gray-500 w-40 flex-shrink-0">
                                        {new Date(entry.timestamp).toLocaleString('ru-RU')}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-white text-xs ${getTradeStatusInfo(entry.new_status || entry.status).color}`}>
                                        {TradeStatusLabels[entry.new_status || entry.status] || entry.new_status || entry.status}
                                    </span>
                                    {entry.notes && (
                                        <span className="text-gray-500 text-xs">{entry.notes}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
