'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminApi } from '../../../hooks/useAdminAuth';

interface DashboardStats {
    trades: {
        total: number;
        completed: number;
        awaiting_buyer: number;
        awaiting_seller: number;
        cancelled: number;
        errors: number;
        last_24h: number;
        last_hour: number;
    };
    users: {
        total: number;
        new_24h: number;
        new_7d: number;
        total_balance: number;
    };
    listings: {
        total: number;
        active: number;
        reserved: number;
        sold: number;
        p2p: number;
        bot_sale: number;
        avg_price: number;
    };
    revenue: {
        total_fees: number;
        fees_24h: number;
        fees_7d: number;
        total_volume: number;
        volume_24h: number;
    };
    bots: {
        total: number;
        online: number;
        ready: number;
        activeTrades: number;
        bots: Array<{
            name: string;
            isOnline: boolean;
            isReady: boolean;
            activeTrades: number;
        }>;
    };
    recentActivity: Array<{
        id: number;
        trade_uuid: string;
        status: string;
        item_name: string;
        price: number;
        trade_type: string;
        updated_at: string;
        buyer_name?: string;
        seller_name?: string;
    }>;
}

export default function AdminDashboard() {
    const router = useRouter();
    const { apiCall } = useAdminApi();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const data = await apiCall('/analytics/dashboard');
            
            if (data.success) {
                setStats(data.data);
                setLastUpdate(new Date());
                setError(null);
            } else {
                setError(data.error || 'Failed to load stats');
                if (data.status === 401) {
                    router.push('/admin/login');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    }, [apiCall, router]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Auto-refresh every 5 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh, fetchStats]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-purple-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="bg-red-900/50 text-red-400 p-6 rounded-xl">
                    <h2 className="text-xl font-bold mb-2">Error</h2>
                    <p>{error}</p>
                    <button onClick={fetchStats} className="mt-4 px-4 py-2 bg-red-600 rounded-lg">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white">📊 Admin Dashboard</h1>
                        <p className="text-gray-400 text-sm mt-1">
                            Last updated: {lastUpdate?.toLocaleTimeString()}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 text-gray-400 text-sm">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded"
                            />
                            Auto-refresh
                        </label>
                        <button
                            onClick={fetchStats}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm transition"
                        >
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <KpiCard
                        title="Trades (24h)"
                        value={stats.trades.last_24h}
                        subtitle={`${stats.trades.completed} completed`}
                        icon="📦"
                        color="blue"
                    />
                    <KpiCard
                        title="Revenue (24h)"
                        value={`$${parseFloat(String(stats.revenue.fees_24h) || '0').toFixed(2)}`}
                        subtitle={`$${parseFloat(String(stats.revenue.volume_24h) || '0').toFixed(2)} volume`}
                        icon="💰"
                        color="green"
                    />
                    <KpiCard
                        title="Active Listings"
                        value={stats.listings.active}
                        subtitle={`${stats.listings.reserved} reserved`}
                        icon="🏷️"
                        color="yellow"
                    />
                    <KpiCard
                        title="Users"
                        value={stats.users.total}
                        subtitle={`+${stats.users.new_24h} today`}
                        icon="👥"
                        color="purple"
                    />
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Bot Status */}
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">🤖 Bot Status</h2>
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`w-4 h-4 rounded-full ${stats.bots.online > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="text-white font-medium">
                                {stats.bots.online}/{stats.bots.total} Online
                            </span>
                        </div>
                        <div className="space-y-3">
                            {stats.bots.bots.map((bot, idx) => (
                                <div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded-lg ${bot.isOnline ? 'bg-green-900/20' : 'bg-red-900/20'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${bot.isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <span className="text-white text-sm">{bot.name}</span>
                                    </div>
                                    <span className="text-gray-400 text-xs">
                                        {bot.activeTrades} trades
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trade Stats */}
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">📈 Trade Stats</h2>
                        <div className="space-y-4">
                            <StatRow label="Total Trades" value={stats.trades.total} />
                            <StatRow label="Completed" value={stats.trades.completed} color="green" />
                            <StatRow label="Awaiting Buyer" value={stats.trades.awaiting_buyer} color="yellow" />
                            <StatRow label="Awaiting Seller" value={stats.trades.awaiting_seller} color="blue" />
                            <StatRow label="Cancelled/Refunded" value={stats.trades.cancelled} color="gray" />
                            <StatRow label="Errors" value={stats.trades.errors} color="red" />
                        </div>
                    </div>

                    {/* Revenue Stats */}
                    <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold text-white mb-4">💵 Revenue</h2>
                        <div className="space-y-4">
                            <div className="text-center py-4">
                                <p className="text-4xl font-bold text-green-400">
                                    ${parseFloat(String(stats.revenue.total_fees) || '0').toFixed(2)}
                                </p>
                                <p className="text-gray-400 text-sm">Total Platform Fees</p>
                            </div>
                            <hr className="border-gray-700" />
                            <StatRow label="Volume (Total)" value={`$${parseFloat(String(stats.revenue.total_volume) || '0').toFixed(2)}`} />
                            <StatRow label="Volume (7d)" value={`$${parseFloat(String(stats.revenue.fees_7d) || '0').toFixed(2)}`} />
                            <StatRow label="Avg Price" value={`$${parseFloat(String(stats.listings.avg_price) || '0').toFixed(2)}`} />
                        </div>
                    </div>
                </div>

                {/* Activity Log */}
                <div className="mt-8 bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700">
                    <h2 className="text-xl font-bold text-white mb-4">📋 Recent Activity</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-400 border-b border-gray-700">
                                    <th className="pb-3">Status</th>
                                    <th className="pb-3">Item</th>
                                    <th className="pb-3">Price</th>
                                    <th className="pb-3">Type</th>
                                    <th className="pb-3">Buyer</th>
                                    <th className="pb-3">Seller</th>
                                    <th className="pb-3">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentActivity.map((activity) => (
                                    <tr key={activity.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                                        <td className="py-3">
                                            <StatusBadge status={activity.status} />
                                        </td>
                                        <td className="py-3 text-white max-w-[200px] truncate">
                                            {activity.item_name}
                                        </td>
                                        <td className="py-3 text-green-400">${activity.price}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 rounded text-xs ${activity.trade_type === 'p2p' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                                }`}>
                                                {activity.trade_type}
                                            </span>
                                        </td>
                                        <td className="py-3 text-gray-400">{activity.buyer_name || '—'}</td>
                                        <td className="py-3 text-gray-400">{activity.seller_name || '—'}</td>
                                        <td className="py-3 text-gray-500 text-xs">
                                            {new Date(activity.updated_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

// KPI Card Component
function KpiCard({ title, value, subtitle, icon, color }: {
    title: string;
    value: string | number;
    subtitle: string;
    icon: string;
    color: 'blue' | 'green' | 'yellow' | 'purple';
}) {
    const colors = {
        blue: 'from-blue-600 to-blue-800',
        green: 'from-green-600 to-green-800',
        yellow: 'from-yellow-600 to-yellow-800',
        purple: 'from-purple-600 to-purple-800',
    };

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-5 shadow-lg`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-white/80 text-sm">{title}</p>
                    <p className="text-3xl font-bold text-white mt-1">{value}</p>
                    <p className="text-white/60 text-xs mt-1">{subtitle}</p>
                </div>
                <span className="text-3xl">{icon}</span>
            </div>
        </div>
    );
}

// Stat Row Component
function StatRow({ label, value, color = 'white' }: {
    label: string;
    value: string | number;
    color?: 'green' | 'yellow' | 'blue' | 'red' | 'gray' | 'white';
}) {
    const colors = {
        green: 'text-green-400',
        yellow: 'text-yellow-400',
        blue: 'text-blue-400',
        red: 'text-red-400',
        gray: 'text-gray-400',
        white: 'text-white',
    };

    return (
        <div className="flex justify-between items-center">
            <span className="text-gray-400">{label}</span>
            <span className={`font-medium ${colors[color]}`}>{value}</span>
        </div>
    );
}

// Status Badge Component
function StatusBadge({ status }: { status: string }) {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
        completed: { bg: 'bg-green-500/20', text: 'text-green-400', label: '✅ Completed' },
        awaiting_buyer: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '⏳ Awaiting Buyer' },
        awaiting_seller: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '⏳ Awaiting Seller' },
        cancelled: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: '❌ Cancelled' },
        refunded: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: '💰 Refunded' },
        error_sending: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🚨 Error' },
        error_forwarding: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🚨 Error' },
    };

    const config = statusConfig[status] || { bg: 'bg-gray-500/20', text: 'text-gray-400', label: status };

    return (
        <span className={`px-2 py-1 rounded text-xs ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
}
