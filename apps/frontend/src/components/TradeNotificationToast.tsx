'use client';

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useAuth } from '@/hooks/useAuth';

interface TradeNotification {
    id: number;
    offerId: string;
    status: string;
    stateName: string;
    message: string;
    visible: boolean;
}

export function TradeNotificationToast() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<TradeNotification[]>([]);

    const handleTradeUpdate = (data: any) => {
        const notification: TradeNotification = {
            id: Date.now(),
            offerId: data.offerId,
            status: data.status,
            stateName: data.stateName,
            message: data.message,
            visible: true,
        };

        setNotifications(prev => [notification, ...prev].slice(0, 5));

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            setNotifications(prev =>
                prev.map(n => n.id === notification.id ? { ...n, visible: false } : n)
            );
        }, 5000);

        // Remove from DOM after fade animation
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5500);
    };

    const { isConnected } = useWebSocket({
        steamId: user?.steamId || '',
        onTradeUpdate: handleTradeUpdate,
    });

    const dismissNotification = (id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, visible: false } : n)
        );
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-500';
            case 'cancelled':
                return 'bg-red-500';
            default:
                return 'bg-blue-500';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return '✅';
            case 'cancelled':
                return '❌';
            default:
                return '📦';
        }
    };

    if (!user?.steamId) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm">
            {/* Notifications */}
            {notifications.map(notification => (
                <div
                    key={notification.id}
                    className={`
            transform transition-all duration-300 ease-out
            ${notification.visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden
          `}
                >
                    <div className={`h-1 ${getStatusColor(notification.status)}`} />
                    <div className="p-4">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">{getStatusIcon(notification.status)}</span>
                            <div className="flex-1">
                                <h4 className="font-semibold text-white">
                                    Trade {notification.stateName}
                                </h4>
                                <p className="text-sm text-gray-400 mt-1">
                                    {notification.message}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Offer ID: {notification.offerId}
                                </p>
                            </div>
                            <button
                                onClick={() => dismissNotification(notification.id)}
                                className="text-gray-500 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
