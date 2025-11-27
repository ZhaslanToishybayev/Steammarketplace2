'use client';

import { useState } from 'react';
import { useTrades } from '@/hooks/useTrades';
import { TradeCard } from '@/components/trade/TradeCard';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelativeTime } from '@/utils/formatters';

interface TradeHistoryTableProps {
  limit?: number;
  showFilters?: boolean;
  className?: string;
}

export function TradeHistoryTable({ limit, showFilters = true, className }: TradeHistoryTableProps) {
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    timeRange: '30d',
  });

  const { trades, isLoading, hasNextPage, fetchNextPage } = useTrades({
    status: filters.status === 'all' ? undefined : filters.status,
    type: filters.type === 'all' ? undefined : filters.type,
  });

  const filteredTrades = limit ? trades.slice(0, limit) : trades;

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'declined', label: 'Declined' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'sent', label: 'Sent' },
    { value: 'received', label: 'Received' },
  ];

  if (isLoading && filteredTrades.length === 0) {
    return (
      <div className={className}>
        <div className="flex justify-center py-8">
          <LoadingSpinner size="lg" text="Loading trade history..." />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Filters */}
      {showFilters && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Status:</span>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Type:</span>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Trade History */}
      <div className="space-y-3">
        {filteredTrades.map((trade) => (
          <TradeCard
            key={trade.id}
            trade={trade}
            onClick={() => window.location.href = `/trade/${trade.id}`}
          />
        ))}

        {/* Loading more */}
        {isLoading && filteredTrades.length > 0 && (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" text="Loading more trades..." />
          </div>
        )}

        {/* Empty state */}
        {filteredTrades.length === 0 && !isLoading && (
          <EmptyState
            icon="trades"
            title="No Trades Found"
            description="You haven't made any trades yet or no trades match your current filters."
            action={
              <Button
                variant="primary"
                onClick={() => window.location.href = '/trade/create'}
              >
                Create Trade Offer
              </Button>
            }
          />
        )}

        {/* Load more */}
        {hasNextPage && !isLoading && (!limit || filteredTrades.length >= limit) && (
          <div className="flex justify-center pt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchNextPage()}
            >
              Load More Trades
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact trade history for dashboard
export function CompactTradeHistory({ className }: { className?: string }) {
  const { trades, isLoading } = useTrades({ limit: 5 });

  if (isLoading) {
    return (
      <div className={className}>
        <LoadingSpinner size="md" text="Loading..." />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-2">
        {trades.slice(0, 5).map((trade) => (
          <div
            key={trade.id}
            className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
            onClick={() => window.location.href = `/trade/${trade.id}`}
          >
            <div className="flex items-center space-x-3">
              <div className="flex -space-x-1">
                <img
                  src={trade.participants.sender.avatar}
                  alt={trade.participants.sender.username}
                  className="w-6 h-6 rounded-full border-2 border-gray-900"
                />
                <img
                  src={trade.participants.recipient.avatar}
                  alt={trade.participants.recipient.username}
                  className="w-6 h-6 rounded-full border-2 border-gray-900"
                />
              </div>
              <div className="text-sm">
                <div className="text-white font-medium">
                  {trade.items.length} item{trade.items.length !== 1 ? 's' : ''}
                </div>
                <div className="text-gray-400">
                  {formatRelativeTime(new Date(trade.updatedAt))}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-orange-500 font-semibold text-sm">
                {trade.totalValue.toFixed(2)}
              </div>
              <Badge
                variant={
                  trade.status === 'completed'
                    ? 'success'
                    : trade.status === 'cancelled' || trade.status === 'declined'
                    ? 'error'
                    : 'warning'
                }
                size="sm"
              >
                {trade.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {trades.length > 0 && (
        <div className="mt-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.location.href = '/trade/history'}
            className="text-orange-500 hover:text-orange-400"
          >
            View All Trades →
          </Button>
        </div>
      )}
    </div>
  );
}