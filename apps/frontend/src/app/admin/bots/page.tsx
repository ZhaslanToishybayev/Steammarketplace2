'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { useBotsList, useCreateBot, useBotAction } from '@/hooks/useBots';
import { BotTable } from '@/components/admin/BotTable';
import { AddBotModal } from '@/components/admin/AddBotModal';
import { formatDateTime } from '@/utils/formatters';

interface BotFilter {
  status: string;
  online: boolean | null;
  active: boolean | null;
}

export default function AdminBotsPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [filters, setFilters] = useState<BotFilter>({
    status: 'all',
    online: null,
    active: null
  });

  const { data: botsData, isLoading, error, refetch } = useBotsList();

  // Create bot mutation
  const { mutate: createBot, isPending: isCreating } = useCreateBot({
    onSuccess: () => {
      setIsAddModalOpen(false);
      refetch();
    }
  });

  // Bot action mutation
  const { mutate: botAction, isPending: isActing } = useBotAction({
    onSuccess: () => {
      refetch();
    }
  });

  // Filter bots based on selected filters
  const filteredBots = botsData?.data?.filter((bot: any) => {
    // Status filter
    if (filters.status !== 'all' && bot.status !== filters.status) {
      return false;
    }

    // Online filter
    if (filters.online !== null && bot.isOnline !== filters.online) {
      return false;
    }

    // Active filter
    if (filters.active !== null && bot.isActive !== filters.active) {
      return false;
    }

    return true;
  }) || [];

  const handleAddBot = (data: any) => {
    createBot(data);
  };

  const handleBotAction = (action: string, bot: any) => {
    switch (action) {
      case 'activate':
        botAction({ id: bot.id, action: 'activate' });
        break;
      case 'deactivate':
        botAction({ id: bot.id, action: 'deactivate' });
        break;
      case 'force-login':
        botAction({ id: bot.id, action: 'force-login' });
        break;
      case 'refresh':
        refetch();
        break;
      default:
        console.warn(`Unknown action: ${action}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IDLE':
        return 'blue';
      case 'TRADING':
        return 'green';
      case 'OFFLINE':
        return 'gray';
      case 'ERROR':
        return 'red';
      default:
        return 'gray';
    }
  };

  const formatLastLogin = (date: string | null) => {
    if (!date) return 'Never';
    return formatDateTime(new Date(date));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Bot Management</h1>
          <p className="text-gray-400 mt-1">Manage trading bots and monitor their status</p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="primary"
          size="md"
        >
          <span className="text-lg">+</span> Add Bot
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Status:</span>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All</option>
              <option value="IDLE">Idle</option>
              <option value="TRADING">Trading</option>
              <option value="OFFLINE">Offline</option>
              <option value="ERROR">Error</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Online:</span>
            <select
              value={filters.online === null ? 'all' : filters.online.toString()}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                online: e.target.value === 'all' ? null : e.target.value === 'true'
              }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All</option>
              <option value="true">Online</option>
              <option value="false">Offline</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Active:</span>
            <select
              value={filters.active === null ? 'all' : filters.active.toString()}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                active: e.target.value === 'all' ? null : e.target.value === 'true'
              }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>

          <Button
            onClick={() => setFilters({ status: 'all', online: null, active: null })}
            variant="secondary"
            size="sm"
            className="ml-auto"
          >
            Clear Filters
          </Button>
        </div>
      </Card>

      {/* Bot Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <BotTable
          bots={filteredBots}
          loading={isLoading || isActing}
          onAction={(action, bot) => handleBotAction(action, bot)}
        />
      </Card>

      {/* Empty State */}
      {!isLoading && filteredBots.length === 0 && (
        <Card className="bg-gray-800/50 border-gray-700 text-center py-12">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Bots Configured</h3>
          <p className="text-gray-400 mb-6">
            {filters.status !== 'all' || filters.online !== null || filters.active !== null
              ? "No bots match the current filters. Try adjusting your search criteria."
              : "Get started by adding your first trading bot to begin automated trading."}
          </p>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            variant="primary"
            size="md"
          >
            Add Your First Bot
          </Button>
        </Card>
      )}

      {/* Statistics */}
      {botsData?.data && botsData.data.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Bot Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{botsData.data.length}</div>
              <div className="text-sm text-gray-400">Total Bots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {botsData.data.filter((bot: any) => bot.isOnline).length}
              </div>
              <div className="text-sm text-gray-400">Online</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {botsData.data.filter((bot: any) => bot.isActive).length}
              </div>
              <div className="text-sm text-gray-400">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                {botsData.data.reduce((sum: number, bot: any) => sum + bot.currentTradeCount, 0)}
              </div>
              <div className="text-sm text-gray-400">Current Trades</div>
            </div>
          </div>
        </Card>
      )}

      {/* Add Bot Modal */}
      <AddBotModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddBot}
        isLoading={isCreating}
      />
    </div>
  );
}