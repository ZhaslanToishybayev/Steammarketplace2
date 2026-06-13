'use client';

import { useState } from 'react';
import { useNotifications } from '../hooks/useWebSocket';
import { Badge, Button } from './ui';

interface NotificationCenterProps {
    steamId: string;
}

export function NotificationCenter({ steamId }: NotificationCenterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { notifications, unreadCount, isConnected, markAsRead, markAllAsRead, clearNotifications } = useNotifications(steamId);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'trade_update': return '🔄';
            case 'price_alert': return '💰';
            case 'new_listing': return '📦';
            case 'system': return 'ℹ️';
            default: return '🔔';
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'trade_update': return 'var(--accent-blue)';
            case 'price_alert': return 'var(--accent-green)';
            case 'new_listing': return 'var(--accent-orange)';
            default: return 'var(--text-secondary)';
        }
    };

    return (
        <div className="relative">
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-[var(--text-secondary)] hover:text-white transition-colors"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>

                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-red)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}

                {/* Connection indicator */}
                <span className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${isConnected ? 'bg-[var(--accent-green)]' : 'bg-[var(--accent-red)]'}`} />
            </button>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded-lg shadow-xl z-50 overflow-hidden">
                        {/* Header */}
                        <div className="p-3 border-b border-[var(--border-default)] flex justify-between items-center">
                            <h3 className="font-semibold text-white">Notifications</h3>
                            <div className="flex gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="text-xs text-[var(--accent-blue)] hover:underline"
                                    >
                                        Mark all read
                                    </button>
                                )}
                                <button
                                    onClick={clearNotifications}
                                    className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-red)]"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-80 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-6 text-center text-[var(--text-muted)]">
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => markAsRead(notification.id)}
                                        className={`p-3 border-b border-[var(--border-default)] cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors ${!notification.read ? 'bg-[var(--bg-tertiary)]/50' : ''
                                            }`}
                                    >
                                        <div className="flex gap-3">
                                            <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white font-medium truncate">
                                                    {notification.title || notification.type}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
                                                    {notification.message || JSON.stringify(notification)}
                                                </p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">
                                                    {new Date(notification.timestamp || notification.id).toLocaleTimeString()}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-[var(--accent-blue)] rounded-full shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-2 border-t border-[var(--border-default)] text-center">
                            <span className={`text-xs ${isConnected ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                                {isConnected ? '● Connected' : '○ Disconnected'}
                            </span>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
