'use client';

import Image from 'next/image';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { formatRelativeTime } from '@/utils/formatters';
import { useAuth } from '@/hooks/useAuth';
import { useTradeStore } from '@/stores/tradeStore';
import { useState } from 'react';

interface TradeCardProps {
  trade: {
    id: string;
    status: 'pending' | 'sent' | 'accepted' | 'declined' | 'cancelled' | 'completed';
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      name: string;
      image: string;
      price: number;
    }>;
    participants: {
      sender: {
        id: string;
        username: string;
        avatar: string;
      };
      recipient: {
        id: string;
        username: string;
        avatar: string;
      };
    };
    totalValue: number;
    message?: string;
  };
  onClick?: (trade: any) => void;
  className?: string;
}

const statusConfig = {
  pending: {
    label: 'Pending',
    color: 'yellow',
    icon: '⏳',
  },
  sent: {
    label: 'Sent',
    color: 'blue',
    icon: '📤',
  },
  accepted: {
    label: 'Accepted',
    color: 'green',
    icon: '✅',
  },
  declined: {
    label: 'Declined',
    color: 'red',
    icon: '❌',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'gray',
    icon: '🚫',
  },
  completed: {
    label: 'Completed',
    color: 'green',
    icon: '🎉',
  },
};

export function TradeCard({ trade, onClick, className }: TradeCardProps) {
  const { user, canTrade } = useAuth();
  const { setActiveTrade } = useTradeStore();
  const [isActionLoading, setIsActionLoading] = useState(false);

  const status = statusConfig[trade.status];
  const isCurrentUserSender = trade.participants.sender.id === user?.id;
  const isCurrentUserRecipient = trade.participants.recipient.id === user?.id;
  const isTradeActive = ['pending', 'sent'].includes(trade.status);

  const handleAction = async (action: 'accept' | 'decline' | 'cancel') => {
    try {
      setIsActionLoading(true);
      // This would call the trade API
      console.log(`Action: ${action} on trade ${trade.id}`);
      setActiveTrade(trade.id);
    } catch (error) {
      console.error('Trade action failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  const getActionButtons = () => {
    if (!canTrade) return null;

    if (trade.status === 'pending' && isCurrentUserRecipient) {
      return (
        <div className="flex space-x-2">
          <Button
            size="sm"
            variant="success"
            onClick={() => handleAction('accept')}
            isLoading={isActionLoading}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="error"
            onClick={() => handleAction('decline')}
            isLoading={isActionLoading}
          >
            Decline
          </Button>
        </div>
      );
    }

    if (trade.status === 'sent' && isCurrentUserSender) {
      return (
        <Button
          size="sm"
          variant="error"
          onClick={() => handleAction('cancel')}
          isLoading={isActionLoading}
        >
          Cancel
        </Button>
      );
    }

    if (trade.status === 'accepted') {
      return (
        <Button
          size="sm"
          variant="primary"
          onClick={() => window.open(`https://steamcommunity.com/tradeoffer/${trade.id}`, '_blank')}
        >
          View Trade Offer
        </Button>
      );
    }

    return null;
  };

  const getTradeSummary = () => {
    if (isCurrentUserSender) {
      return `You offered ${trade.items.length} item${trade.items.length !== 1 ? 's' : ''}`;
    } else {
      return `${trade.participants.sender.username} offered ${trade.items.length} item${trade.items.length !== 1 ? 's' : ''}`;
    }
  };

  return (
    <Card
      variant="clickable"
      className={twMerge(
        'group hover:shadow-lg transition-all duration-300',
        trade.status === 'completed' && 'border-green-500/20 bg-green-500/5',
        trade.status === 'declined' && 'border-red-500/20 bg-red-500/5',
        trade.status === 'cancelled' && 'border-gray-500/20 bg-gray-500/5',
        className
      )}
      onClick={() => onClick?.(trade)}
    >
      <div className="flex items-start justify-between">
        {/* Left side - Status and avatars */}
        <div className="flex items-start space-x-3">
          {/* Status Badge */}
          <div className="flex-shrink-0">
            <Badge variant={status.color as any} size="sm">
              <span className="flex items-center space-x-1">
                <span>{status.icon}</span>
                <span>{status.label}</span>
              </span>
            </Badge>
          </div>

          {/* Participants */}
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <Image
                  src={trade.participants.sender.avatar || '/api/placeholder/32/32'}
                  alt={trade.participants.sender.username}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
              <div className="w-8 h-8 bg-gray-700 rounded-full border-2 border-gray-900 flex items-center justify-center">
                <Image
                  src={trade.participants.recipient.avatar || '/api/placeholder/32/32'}
                  alt={trade.participants.recipient.username}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
            </div>

            <div className="text-sm text-gray-400">
              {trade.participants.sender.username} → {trade.participants.recipient.username}
            </div>
          </div>
        </div>

        {/* Right side - Actions and timestamp */}
        <div className="flex flex-col items-end space-y-2">
          {/* Timestamp */}
          <div className="text-xs text-gray-500">
            {formatRelativeTime(new Date(trade.updatedAt))}
          </div>

          {/* Action Buttons */}
          {getActionButtons()}
        </div>
      </div>

      {/* Trade Summary */}
      <div className="mt-3">
        <div className="text-sm text-gray-300 mb-2">{getTradeSummary()}</div>

        {/* Items Preview */}
        <div className="flex items-center space-x-2">
          {trade.items.slice(0, 4).map((item, index) => (
            <div
              key={item.id}
              className="relative w-12 h-12 bg-gray-700 rounded group-hover:scale-110 transition-transform duration-200"
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                className="object-cover rounded"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded transition-all duration-200" />
            </div>
          ))}
          {trade.items.length > 4 && (
            <div className="flex-shrink-0 w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-xs font-medium text-gray-300">
              +{trade.items.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Trade Value */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-orange-500">
          Total: ${trade.totalValue.toFixed(2)}
        </div>

        {/* Trade ID */}
        <div className="text-xs text-gray-500">
          #{trade.id.slice(-8)}
        </div>
      </div>

      {/* Message */}
      {trade.message && (
        <div className="mt-2 p-2 bg-gray-800 rounded text-sm text-gray-400 border-l-2 border-gray-600">
          "{trade.message}"
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300" />
    </Card>
  );
}