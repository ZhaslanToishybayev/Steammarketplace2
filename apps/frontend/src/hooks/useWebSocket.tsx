'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
    steamId: string;
    onTradeUpdate?: (data: any) => void;
    onPriceAlert?: (data: any) => void;
    onNewListing?: (data: any) => void;
    onSystemNotification?: (data: any) => void;
    reconnectAttempts?: number;
    reconnectInterval?: number;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: any;
    send: (message: object) => void;
    reconnect: () => void;
}

export function useWebSocket(options: WebSocketOptions): UseWebSocketReturn {
    const {
        steamId,
        onTradeUpdate,
        onPriceAlert,
        onNewListing,
        onSystemNotification,
        reconnectAttempts = 5,
        reconnectInterval = 3000,
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<any>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectCountRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

    const connect = useCallback(() => {
        if (!steamId) return;

        const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000'}/ws?steamId=${steamId}`;

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('WebSocket connected');
                setIsConnected(true);
                reconnectCountRef.current = 0;
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    setLastMessage(message);

                    // Route to appropriate handler
                    switch (message.type) {
                        case 'trade_update':
                            onTradeUpdate?.(message.data);
                            break;
                        case 'price_alert':
                            onPriceAlert?.(message.data);
                            break;
                        case 'new_listing':
                            onNewListing?.(message.data);
                            break;
                        case 'system':
                            onSystemNotification?.(message.data);
                            break;
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            wsRef.current.onclose = () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);

                // Attempt reconnect
                if (reconnectCountRef.current < reconnectAttempts) {
                    reconnectCountRef.current++;
                    console.log(`Reconnecting... (attempt ${reconnectCountRef.current})`);
                    reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
                }
            };

            wsRef.current.onerror = (error) => {
                console.error('WebSocket error:', error);
            };
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
        }
    }, [steamId, onTradeUpdate, onPriceAlert, onNewListing, onSystemNotification, reconnectAttempts, reconnectInterval]);

    const send = useCallback((message: object) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    const reconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        reconnectCountRef.current = 0;
        connect();
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [connect]);

    // Heartbeat
    useEffect(() => {
        if (!isConnected) return;

        const interval = setInterval(() => {
            send({ type: 'ping' });
        }, 25000);

        return () => clearInterval(interval);
    }, [isConnected, send]);

    return { isConnected, lastMessage, send, reconnect };
}

// Notification hook
export function useNotifications(steamId: string) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const handleNotification = useCallback((data: any) => {
        setNotifications(prev => [{ ...data, id: Date.now(), read: false }, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
    }, []);

    const { isConnected } = useWebSocket({
        steamId,
        onTradeUpdate: handleNotification,
        onPriceAlert: handleNotification,
        onSystemNotification: handleNotification,
    });

    const markAsRead = useCallback((id: number) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    const clearNotifications = useCallback(() => {
        setNotifications([]);
        setUnreadCount(0);
    }, []);

    return {
        notifications,
        unreadCount,
        isConnected,
        markAsRead,
        markAllAsRead,
        clearNotifications,
    };
}
