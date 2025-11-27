'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { StatisticsCard } from '@/components/dashboard/StatisticsCard';
import { CompactTradeHistory } from '@/components/dashboard/TradeHistoryTable';
import { QuickStatsCard } from '@/components/dashboard/StatisticsCard';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { MainLayout } from '@/components/layout/MainLayout';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, checkAuth } = useAuth();

  useEffect(() => {
    // Only redirect if auth is not loading and user is definitely not authenticated
    if (!isLoading && !isAuthenticated) {
      window.location.href = '/auth/login';
    } else if (isAuthenticated && !user) {
      // Only check auth if we're authenticated but don't have user data yet
      checkAuth();
    }
  }, [isAuthenticated, isLoading, user, checkAuth]);

  if (!isAuthenticated || !user) {
    return (
      <MainLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout variant="dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {user.username}
            </h1>
            <p className="text-gray-400">Here's what's happening with your account today.</p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="primary"
              onClick={() => window.location.href = '/trade/create'}
            >
              Create Trade
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/market'}
            >
              Browse Market
            </Button>
          </div>
        </div>

        {/* Quick Actions (Mobile) */}
        <div className="md:hidden grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.location.href = '/trade/create'}
          >
            Create Trade
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.href = '/market'}
          >
            Browse Market
          </Button>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="lg:col-span-1">
            <BalanceCard />
          </div>

          {/* Statistics Card */}
          <div className="lg:col-span-2">
            <StatisticsCard timeRange="30d" />
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Stats */}
          <div>
            <QuickStatsCard />
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="bg-gray-800/50 border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/trade/history'}
                  className="text-orange-500 hover:text-orange-400"
                >
                  View All
                </Button>
              </div>
              <CompactTradeHistory />
            </Card>
          </div>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notifications */}
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Notifications</h3>
              <Badge variant="orange" size="sm">
                3 Unread
              </Badge>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Trade Completed</p>
                  <p className="text-gray-400 text-xs">Your trade with Player123 was completed successfully!</p>
                  <p className="text-gray-500 text-xs mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-gray-700/50 rounded-lg">
                <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Price Alert</p>
                  <p className="text-gray-400 text-xs">AK-47 | Redline price increased by 15%</p>
                  <p className="text-gray-500 text-xs mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Links */}
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
            </div>
            <div className="space-y-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => window.location.href = '/inventory'}
                className="justify-start"
              >
                <span className="flex items-center space-x-2">
                  <span>📦</span>
                  <span>Manage Inventory</span>
                </span>
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => window.location.href = '/wallet'}
                className="justify-start"
              >
                <span className="flex items-center space-x-2">
                  <span>💰</span>
                  <span>Wallet & Payments</span>
                </span>
              </Button>
              <Button
                variant="secondary"
                fullWidth
                onClick={() => window.location.href = '/profile'}
                className="justify-start"
              >
                <span className="flex items-center space-x-2">
                  <span>👤</span>
                  <span>Profile Settings</span>
                </span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="text-center py-6 text-gray-500 text-sm">
          <p>
            Need help?{' '}
            <a href="/help" className="text-orange-500 hover:text-orange-400">
              Visit our help center
            </a>{' '}
            or{' '}
            <a href="/contact" className="text-orange-500 hover:text-orange-400">
              contact support
            </a>
          </p>
        </div>
      </div>
    </MainLayout>
  );
}