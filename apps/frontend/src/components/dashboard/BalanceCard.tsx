'use client';

import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { formatCurrency } from '@/utils/formatters';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface BalanceCardProps {
  className?: string;
}

export function BalanceCard({ className }: BalanceCardProps) {
  const { user } = useAuth();
  const { balance, availableBalance, pendingBalance } = useWallet();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncBalance = async () => {
    try {
      setIsSyncing(true);
      // This would call the wallet API to sync balance
      console.log('Syncing balance...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Balance sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatBalance = (amount: number) => {
    return formatCurrency(amount, 'USD');
  };

  const getBalanceChange = () => {
    // This would calculate balance change from previous period
    // For now, return mock data
    return { change: 12.5, isPositive: true };
  };

  const balanceChange = getBalanceChange();

  return (
    <Card className={twMerge('bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700', className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">Wallet Balance</h3>
          <p className="text-gray-400 text-sm">Your Steam marketplace balance</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSyncBalance}
            disabled={isSyncing}
            className="text-gray-400 hover:text-white"
          >
            {isSyncing ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15m0 0l-3-3m-6 3l3-3m0 0L9 9" />
              </svg>
            )}
            Sync
          </Button>
        </div>
      </div>

      {/* Main Balance */}
      <div className="text-center mb-6">
        <div className="text-3xl font-bold text-white mb-1">
          {formatBalance(balance)}
        </div>
        <div className="flex items-center justify-center space-x-4 text-sm">
          <span className="text-gray-400">Available: {formatBalance(availableBalance)}</span>
          {pendingBalance > 0 && (
            <span className="text-yellow-400">Pending: {formatBalance(pendingBalance)}</span>
          )}
        </div>
        {balanceChange.change !== 0 && (
          <div className={`flex items-center justify-center mt-2 text-sm ${
            balanceChange.isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <svg
              className={`w-4 h-4 mr-1 ${
                balanceChange.isPositive ? 'rotate-0' : 'rotate-180'
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
            {Math.abs(balanceChange.change)}% from last month
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          variant="primary"
          size="sm"
          onClick={() => window.location.href = '/wallet/deposit'}
          className="bg-green-600 hover:bg-green-700 focus:ring-green-500"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V8m0 0H4.5m7.5 0h7.5m-7.5 0l-3-3m0 18v-3m0 0h.01m-7.5 0h.01M9 12h6m-6-6h6" />
          </svg>
          Deposit
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.location.href = '/wallet/withdraw'}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V8m0 0H4.5m7.5 0h7.5m-7.5 0l3 3m0 0l-3 3m0-3h7.5m-7.5 0l-3-3m0 0l3-3" />
          </svg>
          Withdraw
        </Button>
      </div>

      {/* Balance Summary */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Deposited</span>
          <span className="text-white font-medium">
            {formatBalance(user?.totalDeposited || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Withdrawn</span>
          <span className="text-white font-medium">
            {formatBalance(user?.totalWithdrawn || 0)}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Traded</span>
          <span className="text-white font-medium">
            {formatBalance(user?.totalTraded || 0)}
          </span>
        </div>
      </div>

      {/* Security Note */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
        <div className="flex items-start space-x-2">
          <svg className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.75-2.5L13.75 4c-.75-.834-1.847-.834-2.5 0L4.25 18.5c-.75.834.212 2.5 1.75 2.5z" />
          </svg>
          <div className="text-xs text-gray-400">
            Your balance is secured and can only be withdrawn to verified payment methods
          </div>
        </div>
      </div>
    </Card>
  );
}