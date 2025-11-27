'use client';

import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { useTrades } from '@/hooks/useTrades';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/utils/formatters';
import { useState, useEffect } from 'react';

interface StatisticsCardProps {
  className?: string;
  timeRange?: '7d' | '30d' | '90d' | '365d';
}

interface TradeStatistics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: number;
  averageValue: number;
  successRate: number;
  growth: {
    trades: number;
    volume: number;
    value: number;
  };
}

export function StatisticsCard({ className, timeRange = '30d' }: StatisticsCardProps) {
  const { user } = useAuth();
  const { useTradeStatistics } = useTrades();
  const { data: stats, isLoading } = useTradeStatistics(timeRange);
  const [displayStats, setDisplayStats] = useState<TradeStatistics | null>(null);

  // Mock statistics data (would come from API)
  useEffect(() => {
    if (stats?.data) {
      setDisplayStats(stats.data);
    } else {
      // Mock data for demonstration
      setDisplayStats({
        totalTrades: Math.floor(Math.random() * 100) + 20,
        successfulTrades: Math.floor(Math.random() * 80) + 15,
        failedTrades: Math.floor(Math.random() * 20) + 1,
        totalVolume: Math.random() * 5000 + 1000,
        averageValue: Math.random() * 50 + 10,
        successRate: Math.random() * 20 + 80,
        growth: {
          trades: Math.random() * 50 - 25,
          volume: Math.random() * 100 - 50,
          value: Math.random() * 30 - 15,
        },
      });
    }
  }, [stats]);

  const getGrowthColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const getGrowthIcon = (value: number) => {
    return value >= 0 ? (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ) : (
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  const statsItems = [
    {
      label: 'Total Trades',
      value: displayStats?.totalTrades || 0,
      icon: '🔄',
      change: displayStats?.growth.trades || 0,
      tooltip: 'Total number of trade offers created and received',
    },
    {
      label: 'Success Rate',
      value: `${(displayStats?.successRate || 0).toFixed(1)}%`,
      icon: '✅',
      change: displayStats?.growth.trades || 0,
      tooltip: 'Percentage of trades that were successfully completed',
    },
    {
      label: 'Total Volume',
      value: formatCurrency(displayStats?.totalVolume || 0, 'USD'),
      icon: '💰',
      change: displayStats?.growth.volume || 0,
      tooltip: 'Total value of all trades completed',
    },
    {
      label: 'Avg. Value',
      value: formatCurrency(displayStats?.averageValue || 0, 'USD'),
      icon: '📊',
      change: displayStats?.growth.value || 0,
      tooltip: 'Average value per trade',
    },
  ];

  if (isLoading) {
    return (
      <Card className={twMerge('bg-gray-800/50 border-gray-700', className)}>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Loading statistics...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={twMerge('bg-gray-800/50 border-gray-700', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Trading Statistics</h3>
        <div className="flex items-center space-x-2">
          <Badge variant="orange" size="sm">
            Last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : '365 days'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statsItems.map((stat, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg border border-gray-600 group hover:border-gray-500 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="text-2xl" title={stat.tooltip}>
                {stat.icon}
              </div>
              <div>
                <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
                <div className="text-lg font-bold text-white">{stat.value}</div>
              </div>
            </div>
            <div className={`flex items-center space-x-1 ${getGrowthColor(stat.change)}`}>
              {getGrowthIcon(stat.change)}
              <span className="text-sm font-medium">
                {Math.abs(stat.change).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Stats */}
      {displayStats && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Successful</span>
              <span className="text-green-400 font-medium">
                {displayStats.successfulTrades}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Failed</span>
              <span className="text-red-400 font-medium">
                {displayStats.failedTrades}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-4">
        <button
          onClick={() => window.location.href = '/trade/history'}
          className="w-full py-2 px-4 text-orange-400 hover:text-orange-300 text-sm font-medium transition-colors"
        >
          View Detailed History →
        </button>
      </div>
    </Card>
  );
}

// Quick stats component for dashboard overview
export function QuickStatsCard({ className }: { className?: string }) {
  const stats = [
    { label: 'Total Items', value: '1,234', change: 12.5, icon: '📦' },
    { label: 'Total Trades', value: '156', change: 8.3, icon: '🔄' },
    { label: 'Success Rate', value: '94.2%', change: 2.1, icon: '✅' },
    { label: 'Total Value', value: '$12,345', change: -3.2, icon: '💰' },
  ];

  return (
    <Card className={twMerge('bg-gray-800/50 border-gray-700', className)}>
      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-sm text-gray-400 mb-1">{stat.label}</div>
            <div className="text-lg font-bold text-white mb-1">{stat.value}</div>
            <div className={`text-xs ${
              stat.change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {stat.change >= 0 ? '+' : ''}{stat.change}%
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}