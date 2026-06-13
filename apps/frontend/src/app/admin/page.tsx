'use client';

import { useEffect, useState } from 'react';
import { useAdminApi } from '../../hooks/useAdminAuth';
import { Card, CardContent, Badge, StatsSkeleton } from '../../components/ui';

interface DashboardStats {
    totalUsers: number;
    activeListings: number;
    totalTrades: number;
    onlineBots: number;
    totalVolume: number;
    trades24h: number;
}

interface RecentTrade {
    id: number;
    trade_uuid: string;
    status: string;
    created_at: string;
    item_name: string;
    price: string;
}

export default function AdminDashboardPage() {
    const { apiCall } = useAdminApi();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [recentTrades, setRecentTrades] = useState<RecentTrade[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const data = await apiCall('/dashboard');
            if (data.success) {
                setStats(data.data.stats);
                setRecentTrades(data.data.recentTrades);
            }
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'blue' },
        { label: 'Active Listings', value: stats.activeListings, icon: '📦', color: 'green' },
        { label: 'Total Trades', value: stats.totalTrades, icon: '🔄', color: 'purple' },
        { label: 'Online Bots', value: stats.onlineBots, icon: '🤖', color: 'orange' },
        { label: 'Total Volume', value: `$${stats.totalVolume.toFixed(2)}`, icon: '💰', color: 'green' },
        { label: 'Trades (24h)', value: stats.trades24h, icon: '📊', color: 'blue' },
    ] : [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green';
            case 'pending': case 'awaiting_seller': return 'orange';
            case 'cancelled': case 'failed': return 'red';
            default: return 'blue';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <p className="text-[var(--text-secondary)] mt-1">Overview of your marketplace</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <StatsSkeleton key={i} />)
                ) : (
                    statCards.map((stat, i) => (
                        <Card key={i} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm text-[var(--text-muted)]">{stat.label}</p>
                                    <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                                </div>
                                <span className="text-2xl">{stat.icon}</span>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Recent Activity */}
            <Card>
                <div className="p-4 border-b border-[var(--border-default)]">
                    <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
                </div>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>
                    ) : recentTrades.length === 0 ? (
                        <div className="p-8 text-center text-[var(--text-muted)]">No trades yet</div>
                    ) : (
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentTrades.map((trade) => (
                                    <tr key={trade.id}>
                                        <td className="font-medium">{trade.item_name}</td>
                                        <td className="text-[var(--accent-green)]">${trade.price}</td>
                                        <td>
                                            <Badge variant={getStatusColor(trade.status) as any}>
                                                {trade.status}
                                            </Badge>
                                        </td>
                                        <td className="text-[var(--text-muted)]">
                                            {new Date(trade.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
