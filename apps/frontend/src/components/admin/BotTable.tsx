'use client';

import { useState, useMemo } from 'react';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Dropdown } from '@/components/shared/Dropdown';
import { formatDateTime } from '@/utils/formatters';

interface BotTableProps {
  bots: any[];
  loading?: boolean;
  onAction?: (action: string, bot: any) => void;
}

interface BotAction {
  label: string;
  value: string;
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

export function BotTable({ bots, loading = false, onAction }: BotTableProps) {
  const [sortBy, setSortBy] = useState('lastLoginAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const botActions: BotAction[] = useMemo(() => [
    {
      label: 'View Statistics',
      value: 'view-stats',
      icon: '📊'
    },
    {
      label: 'Force Login',
      value: 'force-login',
      icon: '🔓'
    },
    {
      label: 'Activate',
      value: 'activate',
      icon: '✅',
      variant: 'primary'
    },
    {
      label: 'Deactivate',
      value: 'deactivate',
      icon: '❌',
      variant: 'secondary'
    },
    {
      label: 'Delete Bot',
      value: 'delete',
      icon: '🗑️',
      variant: 'danger'
    }
  ], []);

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

  const handleAction = (action: string, bot: any) => {
    if (onAction) {
      onAction(action, bot);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const sortedBots = useMemo(() => {
    return [...bots].sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      // Handle date sorting
      if (sortBy === 'lastLoginAt' || sortBy === 'createdAt') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
        return sortOrder === 'asc'
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }

      // Handle numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string sorting
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [bots, sortBy, sortOrder]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'IDLE':
        return '⏸️';
      case 'TRADING':
        return '🔄';
      case 'OFFLINE':
        return '🔴';
      case 'ERROR':
        return '❌';
      default:
        return '❓';
    }
  };

  if (loading && bots.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading bots..." />
      </div>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th
                className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('accountName')}
              >
                <div className="flex items-center space-x-1">
                  <span>Account Name</span>
                  {sortBy === 'accountName' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Steam ID
              </th>
              <th
                className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center space-x-1">
                  <span>Status</span>
                  {sortBy === 'status' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Online
              </th>
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
                Trades
              </th>
              <th
                className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('totalTradesCompleted')}
              >
                <div className="flex items-center space-x-1">
                  <span>Completed</span>
                  {sortBy === 'totalTradesCompleted' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </th>
              <th
                className="text-left py-3 px-4 text-sm font-medium text-gray-400 cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('lastLoginAt')}
              >
                <div className="flex items-center space-x-1">
                  <span>Last Login</span>
                  {sortBy === 'lastLoginAt' && (
                    <span>{sortOrder === 'desc' ? '▼' : '▲'}</span>
                  )}
                </div>
              </th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBots.map((bot) => (
              <tr
                key={bot.id}
                className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors"
              >
                <td className="py-3 px-4">
                  <div className="font-medium text-white">{bot.accountName}</div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-400">
                    {bot.steamId || 'Not Available'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <Badge variant={getStatusColor(bot.status)} size="sm">
                    <div className="flex items-center space-x-1">
                      <span>{getStatusIcon(bot.status)}</span>
                      <span className="capitalize">{bot.status.toLowerCase()}</span>
                    </div>
                  </Badge>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        bot.isOnline ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-sm text-gray-400">
                      {bot.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm">
                    <span className="text-white font-medium">{bot.currentTradeCount}</span>
                    <span className="text-gray-400"> / </span>
                    <span className="text-gray-400">{bot.maxConcurrentTrades}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-white font-medium">
                    {bot.totalTradesCompleted || 0}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="text-sm text-gray-400">
                    {formatDateTime(new Date(bot.lastLoginAt)) || 'Never'}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex justify-end">
                    <Dropdown
                      trigger={
                        <Button
                          variant="secondary"
                          size="sm"
                          className="text-sm"
                        >
                          Actions
                        </Button>
                      }
                    >
                      {botActions.map((action) => (
                        <Dropdown.Item
                          key={action.value}
                          onClick={() => handleAction(action.value, bot)}
                          variant={action.variant}
                        >
                          <div className="flex items-center space-x-2">
                            {action.icon && <span>{action.icon}</span>}
                            <span>{action.label}</span>
                          </div>
                        </Dropdown.Item>
                      ))}
                    </Dropdown>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {sortedBots.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-lg font-semibold text-white mb-2">No Bots Found</h3>
          <p className="text-gray-400 mb-4">
            No bots match the current criteria or no bots have been configured yet.
          </p>
          <Button
            variant="orange"
            size="sm"
            onClick={() => onAction?.('refresh', null)}
          >
            Refresh
          </Button>
        </div>
      )}

      {/* Loading State */}
      {loading && sortedBots.length > 0 && (
        <div className="flex justify-center py-4">
          <LoadingSpinner size="sm" text="Loading..." />
        </div>
      )}
    </Card>
  );
}