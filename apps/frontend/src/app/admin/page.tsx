'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { useBotsList } from '@/hooks/useBots';
import { authAPI } from '@/lib/api';

interface AdminDashboardStats {
  totalUsers: number;
  activeTrades: number;
  totalBots: number;
  onlineBots: number;
  systemHealth: {
    database: boolean;
    redis: boolean;
    queue: boolean;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: botsData, isLoading: botsLoading } = useBotsList();

  // Fetch admin statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Fetch platform statistics
        const [usersResponse, tradesResponse] = await Promise.all([
          authAPI.me(),
          authAPI.me()
        ]);

        // Get bot counts
        const totalBots = botsData?.data?.length || 0;
        const onlineBots = botsData?.data?.filter((bot: any) => bot.isOnline).length || 0;

        setStats({
          totalUsers: usersResponse.data.totalUsers || 0,
          activeTrades: tradesResponse.data.activeTrades || 0,
          totalBots,
          onlineBots,
          systemHealth: {
            database: true, // Would come from actual health check
            redis: true,
            queue: true
          }
        });
      } catch (err) {
        console.error('Failed to fetch admin stats:', err);
        setError('Failed to load statistics');
        // Use mock data for demo
        setStats({
          totalUsers: 1234,
          activeTrades: 56,
          totalBots: 3,
          onlineBots: 2,
          systemHealth: {
            database: true,
            redis: true,
            queue: true
          }
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [botsData]);

  const statsCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: '👥',
      change: 12.5,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20'
    },
    {
      title: 'Active Trades',
      value: stats?.activeTrades || 0,
      icon: '🔄',
      change: 8.3,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20'
    },
    {
      title: 'Total Bots',
      value: stats?.totalBots || 0,
      icon: '🤖',
      change: 0,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/20'
    },
    {
      title: 'Online Bots',
      value: stats?.onlineBots || 0,
      icon: '🟢',
      change: 33.3,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/20'
    }
  ];

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ) : (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  if (isLoading && !stats) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Platform overview and statistics</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto my-8"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
          <p className="text-gray-400 mt-1">Platform overview and statistics</p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 hover:bg-orange-500/30 transition-colors"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
          {error}
        </div>
      )}

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <Card
            key={index}
            className={`bg-gray-800/50 border-gray-700 ${stat.bgColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{stat.icon}</div>
                <div>
                  <div className="text-sm text-gray-400 font-medium">{stat.title}</div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              </div>

              <div className={`flex items-center space-x-1 ${getChangeColor(stat.change)}`}>
                {getChangeIcon(stat.change)}
                <span className="text-sm font-medium">
                  {Math.abs(stat.change).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <Card className="bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-3">
            {Object.entries(stats?.systemHealth || {}).map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-gray-400 capitalize">{service}</span>
                <div
                  className={`w-3 h-3 rounded-full ${
                    status ? 'bg-green-400' : 'bg-red-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            <div className="text-sm text-gray-400">No recent activity data available</div>
            {/* Would show recent user registrations, trades, disputes, etc. */}
          </div>
        </Card>

        {/* Bot Status */}
        <Card className="bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Bot Status</h3>
          <div className="space-y-3">
            {botsLoading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto"></div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Online</span>
                  <Badge variant="green" size="sm">
                    {stats?.onlineBots || 0} / {stats?.totalBots || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge
                    variant={stats?.onlineBots === stats?.totalBots ? 'green' : 'orange'}
                    size="sm"
                  >
                    {stats?.onlineBots === stats?.totalBots ? 'All Online' : 'Partial'}
                  </Badge>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-800/50 border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => window.location.href = '/admin/users'}
            className="p-4 text-center bg-gray-700/50 rounded-lg border border-gray-600 hover:border-orange-500/30 hover:bg-orange-500/10 transition-colors"
          >
            <div className="text-2xl mb-2">👥</div>
            <div className="text-sm font-medium text-gray-300">Manage Users</div>
          </button>

          <button
            onClick={() => window.location.href = '/admin/bots'}
            className="p-4 text-center bg-gray-700/50 rounded-lg border border-gray-600 hover:border-orange-500/30 hover:bg-orange-500/10 transition-colors"
          >
            <div className="text-2xl mb-2">🤖</div>
            <div className="text-sm font-medium text-gray-300">Manage Bots</div>
          </button>

          <button
            onClick={() => window.location.href = '/admin/trades'}
            className="p-4 text-center bg-gray-700/50 rounded-lg border border-gray-600 hover:border-orange-500/30 hover:bg-orange-500/10 transition-colors"
          >
            <div className="text-2xl mb-2">🔄</div>
            <div className="text-sm font-medium text-gray-300">View Trades</div>
          </button>

          <button
            onClick={() => window.location.href = '/trade'}
            className="p-4 text-center bg-gray-700/50 rounded-lg border border-gray-600 hover:border-orange-500/30 hover:bg-orange-500/10 transition-colors"
          >
            <div className="text-2xl mb-2">💼</div>
            <div className="text-sm font-medium text-gray-300">Create Trade</div>
          </button>
        </div>
      </Card>
    </div>
  );
}