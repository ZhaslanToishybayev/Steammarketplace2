'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
    };
    listings: {
        total: number;
        active: number;
        sold: number;
    };
}

interface HourlyData {
    hour: string;
    trades: number;
    volume: number;
}

export default function AnalyticsPage() {
    const { apiCall } = useAdminApi();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        setLoading(true);
        setError('');
        try {
            const [dashData, tradesData] = await Promise.all([
                apiCall('/analytics/dashboard'),
                apiCall('/analytics/trades')
            ]);

            if (dashData.success) {
                setStats(dashData.data);
            } else {
                throw new Error(dashData.error || 'Failed to load dashboard stats');
            }

            if (tradesData.success) {
                setHourlyData(tradesData.data?.hourly || []);
            }
            // Note: We don't throw on tradesData failure, just show partial data if dashboard worked
            
        } catch (err: any) {
            console.error('Analytics load error:', err);
            setError(err.message || 'Failed to fetch analytics');
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

    const formatNumber = (value: number) => {
        return new Intl.NumberFormat('en-US').format(value || 0);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-400">{error}</p>
                <button
                    onClick={fetchAnalytics}
                    className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
                    <p className="text-gray-400 mt-1">Real-time platform metrics and insights</p>
                </div>
                <button
                    onClick={fetchAnalytics}
                    className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                </button>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-6 border border-green-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-400 text-sm font-medium">Total Revenue</p>
                            <p className="text-3xl font-bold text-white mt-2">{formatCurrency(stats?.revenue?.total_fees || 0)}</p>
                            <p className="text-green-300 text-sm mt-1">+{formatCurrency(stats?.revenue?.fees_24h || 0)} today</p>
                        </div>
                        <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl">💰</span>
                        </div>
                    </div>
                </div>

                {/* Total Trades */}
                <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-6 border border-blue-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-400 text-sm font-medium">Total Trades</p>
                            <p className="text-3xl font-bold text-white mt-2">{formatNumber(stats?.trades?.total || 0)}</p>
                            <p className="text-blue-300 text-sm mt-1">+{formatNumber(stats?.trades?.last_24h || 0)} today</p>
                        </div>
                        <div className="w-14 h-14 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🔄</span>
                        </div>
                    </div>
                </div>

                {/* Active Users */}
                <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-6 border border-purple-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-400 text-sm font-medium">Total Users</p>
                            <p className="text-3xl font-bold text-white mt-2">{formatNumber(stats?.users?.total || 0)}</p>
                            <p className="text-purple-300 text-sm mt-1">+{formatNumber(stats?.users?.new_24h || 0)} new today</p>
                        </div>
                        <div className="w-14 h-14 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl">👥</span>
                        </div>
                    </div>
                </div>

                {/* Bot Status */}
                <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 rounded-xl p-6 border border-orange-700/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-orange-400 text-sm font-medium">Bots Online</p>
                            <p className="text-3xl font-bold text-white mt-2">{stats?.bots?.online || 0}/{stats?.bots?.total || 0}</p>
                            <p className="text-orange-300 text-sm mt-1">{stats?.bots?.activeTrades || 0} active trades</p>
                        </div>
                        <div className="w-14 h-14 bg-orange-500/20 rounded-full flex items-center justify-center">
                            <span className="text-2xl">🤖</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Secondary Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Trade Volume */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Trade Volume</h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Total Volume</span>
                            <span className="text-white font-bold">{formatCurrency(stats?.revenue?.total_volume || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">Today's Volume</span>
                            <span className="text-green-400 font-bold">{formatCurrency(stats?.revenue?.volume_24h || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-400">7-Day Fees</span>
                            <span className="text-blue-400 font-bold">{formatCurrency(stats?.revenue?.fees_7d || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Trade Status Breakdown */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Trade Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="text-gray-400">Completed</span>
                            </div>
                            <span className="text-white font-bold">{formatNumber(stats?.trades?.completed || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                                <span className="text-gray-400">Awaiting Buyer</span>
                            </div>
                            <span className="text-white font-bold">{formatNumber(stats?.trades?.awaiting_buyer || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                                <span className="text-gray-400">Awaiting Seller</span>
                            </div>
                            <span className="text-white font-bold">{formatNumber(stats?.trades?.awaiting_seller || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                                <span className="text-gray-400">Cancelled</span>
                            </div>
                            <span className="text-white font-bold">{formatNumber(stats?.trades?.cancelled || 0)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-red-800"></span>
                                <span className="text-gray-400">Errors</span>
                            </div>
                            <span className="text-red-400 font-bold">{formatNumber(stats?.trades?.errors || 0)}</span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link href="/admin/trades" className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                            <span className="text-gray-300">View All Trades</span>
                            <span className="text-blue-400">→</span>
                        </Link>
                        <Link href="/admin/users" className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                            <span className="text-gray-300">Manage Users</span>
                            <span className="text-blue-400">→</span>
                        </Link>
                        <Link href="/admin/bots" className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                            <span className="text-gray-300">Bot Status</span>
                            <span className="text-blue-400">→</span>
                        </Link>
                        <Link href="/admin/listings" className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">
                            <span className="text-gray-300">Manage Listings</span>
                            <span className="text-blue-400">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Hourly Trade Chart */}
            {hourlyData.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                    <h3 className="text-lg font-semibold text-white mb-4">24-Hour Trade Activity</h3>
                    <div className="flex items-end gap-1 h-48">
                        {hourlyData.map((item, index) => {
                            const maxTrades = Math.max(...hourlyData.map(h => h.trades || 0), 1);
                            const height = ((item.trades || 0) / maxTrades) * 100;
                            return (
                                <div
                                    key={index}
                                    className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-500 hover:to-blue-300 transition-all cursor-pointer group relative"
                                    style={{ height: `${Math.max(height, 5)}%` }}
                                    title={`${item.trades} trades - ${formatCurrency(item.volume)}`}
                                >
                                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                        {item.trades} trades
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                        <span>24h ago</span>
                        <span>Now</span>
                    </div>
                </div>
            )}
        </div>
    );
}
