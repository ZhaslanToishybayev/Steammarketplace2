'use client';

import { useEffect, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useAuth } from './useAuth';

const SOCKET_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function useNotifications() {
    const { user } = useAuth();
    const [connected, setConnected] = useState(false);

    const connect = useCallback(() => {
        if (socket?.connected) return;

        socket = io(SOCKET_URL, {
            withCredentials: true,
            auth: {
                steamId: user?.steamId
            }
        });

        socket.on('connect', () => {
            console.log('[Socket.io] Connected');
            setConnected(true);

            // Join user room
            if (user?.steamId) {
                socket?.emit('join:user', user.steamId);
            }
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket.io] Disconnected:', reason);
            setConnected(false);

            // Auto-reconnect with exponential backoff - less aggressive
            if (reason !== 'io client disconnect') {
                let retryCount = 0;
                const maxRetries = 3;

                const attemptReconnect = () => {
                    if (retryCount >= maxRetries) {
                        console.warn('[Socket.io] Max reconnect attempts reached, stopping retries');
                        return;
                    }

                    // Start with 5 seconds, max 60 seconds
                    const delay = Math.min(5000 * Math.pow(2, retryCount), 60000);
                    console.log(`[Socket.io] Reconnecting in ${delay / 1000}s (attempt ${retryCount + 1}/${maxRetries})...`);

                    setTimeout(() => {
                        if (!socket?.connected) {
                            socket?.connect();
                            retryCount++;
                            // Schedule next retry if this one doesn't work
                            setTimeout(() => {
                                if (!socket?.connected && retryCount < maxRetries) {
                                    attemptReconnect();
                                }
                            }, 2000);
                        }
                    }, delay);
                };

                attemptReconnect();
            }
        });

        // Trade update notifications
        socket.on('trade:update', (data) => {
            console.log('[Socket.io] Trade update:', data);
            if (data.status === 'completed') {
                toast.success(`Trade completed: ${data.itemName}`);
            } else if (data.status === 'cancelled') {
                toast.error(`Trade cancelled: ${data.itemName}`);
            } else {
                toast(`Trade status: ${data.status}`, { icon: '📦' });
            }
        });

        // Item sold notification (for sellers)
        socket.on('item:sold', (data) => {
            toast.success(`🎉 Your item "${data.itemName}" was sold!`);
        });

        // Item shipped notification (for buyers)
        socket.on('item:shipped', (data) => {
            toast.success(`📦 Your item "${data.itemName}" is on the way!`);
        });

        // Payment received notification (for sellers)
        socket.on('payment:received', (data) => {
            toast.success(`💰 You received $${data.amount} for "${data.itemName}"`);
        });

        // Refund notification (for buyers)
        socket.on('refund:completed', (data) => {
            toast.success(`💰 Refund of $${data.amount} completed`);
        });

    }, [user?.steamId]);

    const disconnect = useCallback(() => {
        if (socket) {
            socket.disconnect();
            socket = null;
            setConnected(false);
        }
    }, []);

    const subscribeToTrade = useCallback((tradeUuid: string) => {
        socket?.emit('trade:subscribe', tradeUuid);
    }, []);

    const unsubscribeFromTrade = useCallback((tradeUuid: string) => {
        socket?.emit('trade:unsubscribe', tradeUuid);
    }, []);

    useEffect(() => {
        if (user?.steamId) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [user?.steamId, connect, disconnect]);

    return {
        connected,
        connect,
        disconnect,
        subscribeToTrade,
        unsubscribeFromTrade
    };
}
