'use client';

import { useState } from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { MainLayout } from '@/components/layout/MainLayout';

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');

  const formatSteamId = (steamId: string) => {
    if (!steamId) return 'N/A';
    return `${steamId.substring(0, 10)}...`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Profile Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-6">
            <img
              src={user?.avatar || '/api/placeholder/128/128'}
              alt={user?.username || 'User'}
              className="w-24 h-24 rounded-full border-4 border-gray-700"
            />
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.username || 'Loading...'}</h1>
              <p className="text-gray-400 mt-1">
                Member since {formatDate(user?.createdAt)}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>Balance: {user?.balance !== undefined ? `$${user.balance.toFixed(2)}` : 'N/A'}</span>
                <span>Role: {user?.role || 'user'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <Card className="bg-gray-800/50 border-gray-700 mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'profile'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'settings'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'security'
                  ? 'text-orange-500 border-b-2 border-orange-500'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Security
            </button>
          </div>
        </Card>

        {/* Profile Content */}
        {activeTab === 'profile' && (
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Profile Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Steam ID</label>
                  <input
                    type="text"
                    value={formatSteamId(user?.steamId || '')}
                    disabled
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-gray-400 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Trade URL Status</label>
                  <div className={`px-3 py-2 rounded-md text-sm font-medium ${
                    user?.tradeUrl ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'
                  }`}>
                    {user?.tradeUrl ? 'Configured' : 'Not Configured'}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex space-x-4">
                <Button
                  variant="primary"
                  onClick={() => window.location.href = '/auth/setup'}
                  disabled={!!user?.tradeUrl}
                >
                  {user?.tradeUrl ? 'Update Trade URL' : 'Set Up Trade URL'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.location.href = '/inventory/sync'}
                >
                  Sync Inventory
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Settings Content */}
        {activeTab === 'settings' && (
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Account Settings</h2>
              <p className="text-gray-400 mb-6">
                Settings functionality will be implemented here.
              </p>
              <Button variant="primary" disabled>
                Save Settings
              </Button>
            </div>
          </Card>
        )}

        {/* Security Content */}
        {activeTab === 'security' && (
          <Card className="bg-gray-800/50 border-gray-700">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Security</h2>
              <p className="text-gray-400 mb-6">
                Security settings will be implemented here.
              </p>
              <div className="space-y-4">
                <Button variant="secondary">
                  Change Password
                </Button>
                <Button variant="secondary">
                  Manage Sessions
                </Button>
                <Button variant="secondary">
                  Two-Factor Authentication
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}