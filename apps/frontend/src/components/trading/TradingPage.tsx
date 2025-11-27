'use client';

import { useState } from 'react';
import { useGetUserTrades, useCreateTrade, useAcceptTrade, useDeclineTrade, useGetTradeStatistics } from '@/hooks/useApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Handshake,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Search
} from 'lucide-react';

export function TradingPage() {
  const [activeTab, setActiveTab] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: tradesData, isLoading: isTradesLoading } = useGetUserTrades();
  const { data: statsData, isLoading: isStatsLoading } = useGetTradeStatistics();

  const { mutate: acceptTrade } = useAcceptTrade();
  const { mutate: declineTrade } = useDeclineTrade();

  const trades = tradesData?.data?.trades || [];
  const stats = statsData?.data || {};

  const handleAcceptTrade = (tradeId: string) => {
    if (confirm('Are you sure you want to accept this trade?')) {
      acceptTrade(tradeId);
    }
  };

  const handleDeclineTrade = (tradeId: string) => {
    if (confirm('Are you sure you want to decline this trade?')) {
      declineTrade(tradeId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'accepted':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'declined':
        return 'bg-red-500';
      case 'expired':
        return 'bg-gray-500';
      case 'cancelled':
        return 'bg-orange-500';
      case 'failed':
        return 'bg-red-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'accepted':
        return <CheckCircle className="w-3 h-3" />;
      case 'completed':
        return <CheckCircle className="w-3 h-3" />;
      case 'declined':
        return <XCircle className="w-3 h-3" />;
      case 'expired':
        return <AlertTriangle className="w-3 h-3" />;
      case 'cancelled':
        return <XCircle className="w-3 h-3" />;
      case 'failed':
        return <AlertTriangle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const filterTradesByStatus = (status: string) => {
    if (status === 'all') return trades;
    return trades.filter((trade: any) => trade.status === status);
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Trading Hub</h1>
        <p className="text-gray-500">Manage your trade offers and requests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {isStatsLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Handshake className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm text-gray-500">Total Trades</p>
                <p className="text-2xl font-bold">{stats.totalTrades || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-6 h-6 text-yellow-500" />
                </div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold">{stats.pendingTrades || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold">{stats.completedTrades || 0}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold">{stats.failedTrades || 0}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="declined">Declined</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <TradeList trades={filterTradesByStatus('pending')} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <TradeList trades={filterTradesByStatus('pending')} />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <TradeList trades={filterTradesByStatus('completed')} />
        </TabsContent>

        <TabsContent value="declined" className="mt-6">
          <TradeList trades={filterTradesByStatus('declined')} />
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <TradeList trades={trades} />
        </TabsContent>
      </Tabs>
    </div>
  );

  function TradeList({ trades }: { trades: any[] }) {
    if (isTradesLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-3 w-2/3 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (trades.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="flex justify-center mb-4">
            <Users className="w-16 h-16 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No trades found</h3>
          <p className="text-gray-400">
            {activeTab === 'active'
              ? 'You have no active trades. Start trading with other users!'
              : `You have no ${activeTab} trades.`}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trades.map((trade: any) => (
          <Card key={trade.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={trade.sender.avatar} alt={trade.sender.username} />
                    <AvatarFallback>{trade.sender.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{trade.sender.username}</p>
                    <p className="text-sm text-gray-500">to {trade.recipient.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(trade.status)}
                  <Badge variant="default" className={`text-white ${getStatusColor(trade.status)}`}>
                    {trade.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Trade Type:</span>
                  <span className="font-medium capitalize">{trade.type}</span>
                </div>

                {trade.offeredAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Offered:</span>
                    <span className="font-semibold text-green-500">
                      {formatCurrency(trade.offeredAmount)}
                    </span>
                  </div>
                )}

                {trade.requestedAmount && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">Requested:</span>
                    <span className="font-semibold text-red-500">
                      {formatCurrency(trade.requestedAmount)}
                    </span>
                  </div>
                )}

                {trade.offeredItem && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={`https://community.akamai.steamstatic.com/economy/image/${trade.offeredItem.iconUrl}/64fx64f`}
                        alt={trade.offeredItem.marketName}
                      />
                      <AvatarFallback>{trade.offeredItem.marketName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{trade.offeredItem.marketName}</p>
                      {trade.offeredItem.steamPrice && (
                        <p className="text-sm text-gray-500">
                          Value: {formatCurrency(trade.offeredItem.steamPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {trade.requestedItem && (
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage
                        src={`https://community.akamai.steamstatic.com/economy/image/${trade.requestedItem.iconUrl}/64fx64f`}
                        alt={trade.requestedItem.marketName}
                      />
                      <AvatarFallback>{trade.requestedItem.marketName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{trade.requestedItem.marketName}</p>
                      {trade.requestedItem.steamPrice && (
                        <p className="text-sm text-gray-500">
                          Value: {formatCurrency(trade.requestedItem.steamPrice)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {trade.message && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">"{trade.message}"</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>Created: {formatDate(trade.createdAt)}</span>
                  {trade.updatedAt !== trade.createdAt && (
                    <span>Updated: {formatDate(trade.updatedAt)}</span>
                  )}
                </div>

                {trade.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleDeclineTrade(trade.tradeId)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAcceptTrade(trade.tradeId)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Accept
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
}