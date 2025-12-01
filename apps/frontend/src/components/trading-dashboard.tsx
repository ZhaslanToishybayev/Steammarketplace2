'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Users,
  Clock,
  Calendar,
  Activity,
  PieChart,
  LineChart,
  Zap,
  Shield,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  Coins,
  Globe,
  Database,
  Cpu,
  Wifi,
  WifiOff
} from 'lucide-react';

interface TradingDashboardProps {
  className?: string;
}

interface TradeData {
  timestamp: number;
  volume: number;
  profit: number;
  successRate: number;
  avgPrice: number;
}

interface MarketData {
  item: string;
  price: number;
  change24h: number;
  volume: number;
  rarity: string;
}

export function TradingDashboard({ className }: TradingDashboardProps) {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [tradeData, setTradeData] = useState<TradeData[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [steamStatus, setSteamStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Simulate loading data from API
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Generate mock trade data
        const now = Date.now();
        const mockTradeData: TradeData[] = [];

        for (let i = 23; i >= 0; i--) {
          const timestamp = now - (i * 60 * 60 * 1000);
          mockTradeData.push({
            timestamp,
            volume: 500 + Math.random() * 2000,
            profit: (Math.random() - 0.5) * 500,
            successRate: 85 + Math.random() * 10,
            avgPrice: 15 + Math.random() * 50
          });
        }

        setTradeData(mockTradeData);

        // Generate mock market data
        const mockMarketData: MarketData[] = [
          { item: 'AK-47 | Redline (Battle-Scarred)', price: 12.50, change24h: 8.5, volume: 1250, rarity: 'Mythical' },
          { item: 'M4A4 | Desert-Eagle (Factory New)', price: 8.75, change24h: -2.3, volume: 890, rarity: 'Rare' },
          { item: 'AWP | Dragon Lore (Minimal Wear)', price: 1250.00, change24h: 15.2, volume: 45, rarity: 'Ancient' },
          { item: 'Glock-18 | Fade (Factory New)', price: 24.50, change24h: 22.8, volume: 320, rarity: 'Legendary' },
          { item: 'P90 | Emerald (Battle-Scarred)', price: 6.80, change24h: -5.6, volume: 670, rarity: 'Uncommon' }
        ];

        setMarketData(mockMarketData);
        setSteamStatus('connected');
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
        setSteamStatus('disconnected');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const calculateStats = () => {
    if (tradeData.length === 0) return null;

    const totalVolume = tradeData.reduce((sum, data) => sum + data.volume, 0);
    const totalProfit = tradeData.reduce((sum, data) => sum + data.profit, 0);
    const avgSuccessRate = tradeData.reduce((sum, data) => sum + data.successRate, 0) / tradeData.length;
    const maxProfit = Math.max(...tradeData.map(data => data.profit));
    const minProfit = Math.min(...tradeData.map(data => data.profit));

    return {
      totalVolume,
      totalProfit,
      avgSuccessRate,
      maxProfit,
      minProfit,
      profitChange: tradeData.length > 1 ? ((tradeData[tradeData.length - 1].profit - tradeData[0].profit) / Math.abs(tradeData[0].profit)) * 100 : 0
    };
  };

  const stats = calculateStats();

  if (isLoading) {
    return (
      <div className={cn('trading-dashboard p-6', className)}>
        <div className="grid gap-6">
          {/* Loading Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-morphism border border-steam-border p-6 rounded-xl animate-pulse">
                <div className="h-4 bg-steam-border rounded mb-4"></div>
                <div className="h-8 bg-steam-accent/20 rounded mb-2"></div>
                <div className="h-3 bg-steam-text-secondary/30 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('trading-dashboard p-6 space-y-6', className)}>
      {/* Header */}
      <div className="dashboard-header flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-steam-accent to-orange-400 bg-clip-text text-transparent">
            Trading Analytics Dashboard
          </h1>
          <p className="text-steam-text-secondary mt-1">Professional trading insights and market analysis</p>
        </div>

        {/* Time Range Selector */}
        <div className="time-range-selector glass-morphism border border-steam-border rounded-lg p-1">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                'px-4 py-2 rounded-md text-sm font-medium transition-all duration-200',
                timeRange === range
                  ? 'bg-steam-accent/20 text-steam-accent border border-steam-accent/30'
                  : 'text-steam-text-secondary hover:text-steam-text-primary hover:bg-steam-bg-secondary'
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Steam Status Indicator */}
      <SteamConnectionStatus status={steamStatus} />

      {/* Performance Metrics */}
      <div className="performance-metrics grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <PerformanceMetric
          title="Total Volume"
          value={stats ? formatCurrency(stats.totalVolume) : '$0.00'}
          change={12.5}
          icon={DollarSign}
          color="green"
        />
        <PerformanceMetric
          title="Net Profit"
          value={stats ? formatCurrency(stats.totalProfit) : '$0.00'}
          change={stats?.profitChange || 0}
          icon={TrendingUp}
          color={stats && stats.totalProfit >= 0 ? 'green' : 'red'}
        />
        <PerformanceMetric
          title="Success Rate"
          value={stats ? `${stats.avgSuccessRate.toFixed(1)}%` : '0.0%'}
          change={3.2}
          icon={CheckCircle}
          color="blue"
        />
        <PerformanceMetric
          title="Active Trades"
          value="24"
          change={-8.3}
          icon={RefreshCw}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="charts-grid grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume & Profit Chart */}
        <div className="chart-card glass-morphism border border-steam-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steam-text-primary">Volume & Profit Trends</h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1 text-green-400 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                Profit
              </div>
              <div className="flex items-center gap-1 text-blue-400 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                Volume
              </div>
            </div>
          </div>
          <div className="chart-container h-64 relative">
            <VolumeProfitChart data={tradeData} />
          </div>
        </div>

        {/* Market Overview */}
        <div className="chart-card glass-morphism border border-steam-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-steam-text-primary">Market Overview</h3>
            <BarChart3 className="w-5 h-5 text-steam-accent" />
          </div>
          <div className="space-y-4">
            {marketData.map((item, index) => (
              <MarketItemRow key={index} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="advanced-analytics grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trade Analysis */}
        <div className="analytics-card glass-morphism border border-steam-border p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-5 h-5 text-steam-accent" />
            <h3 className="text-lg font-semibold text-steam-text-primary">Trade Analysis</h3>
          </div>
          <div className="space-y-3">
            <AnalyticsStat label="Best Trade" value="+$247.50" change="Today" color="green" />
            <AnalyticsStat label="Worst Trade" value="-$89.30" change="Yesterday" color="red" />
            <AnalyticsStat label="Avg. Trade Time" value="2m 34s" change="Faster" color="blue" />
            <AnalyticsStat label="Trade Count" value="156" change="+23 this week" color="orange" />
          </div>
        </div>

        {/* Risk Management */}
        <div className="analytics-card glass-morphism border border-steam-border p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-steam-text-primary">Risk Management</h3>
          </div>
          <div className="space-y-3">
            <RiskMetric label="Max Drawdown" value="-12.5%" color="red" />
            <RiskMetric label="Risk Score" value="Low" color="green" />
            <RiskMetric label="Diversification" value="85%" color="green" />
            <RiskMetric label="Alerts" value="2" color="orange" />
          </div>
        </div>

        {/* Market Sentiment */}
        <div className="analytics-card glass-morphism border border-steam-border p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-steam-text-primary">Market Sentiment</h3>
          </div>
          <div className="space-y-3">
            <SentimentIndicator sentiment="bullish" confidence={78} />
            <SentimentIndicator sentiment="volume" confidence={65} />
            <SentimentIndicator sentiment="liquidity" confidence={82} />
            <div className="text-center mt-4">
              <span className="text-steam-text-secondary text-sm">Updated 2 minutes ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity glass-morphism border border-steam-border p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-steam-text-primary">Recent Activity</h3>
          <Clock className="w-5 h-5 text-steam-text-secondary" />
        </div>
        <div className="space-y-3">
          {[
            { action: 'Trade Completed', item: 'AWP | Dragon Lore', amount: '+$1,250.00', time: '2 minutes ago' },
            { action: 'Trade Failed', item: 'M4A4 | Howl', amount: '—', time: '15 minutes ago' },
            { action: 'Item Listed', item: 'AK-47 | Redline', amount: '$12.50', time: '32 minutes ago' },
            { action: 'Trade Success', item: 'Glock-18 | Fade', amount: '+$24.50', time: '1 hour ago' }
          ].map((activity, index) => (
            <ActivityRow key={index} activity={activity} />
          ))}
        </div>
      </div>
    </div>
  );
}

interface PerformanceMetricProps {
  title: string;
  value: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'green' | 'red' | 'blue' | 'orange';
}

function PerformanceMetric({ title, value, change, icon: Icon, color }: PerformanceMetricProps) {
  const colorClasses = {
    green: { text: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/30' },
    red: { text: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
    blue: { text: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    orange: { text: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' }
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      className={cn(
        'performance-metric glass-morphism border',
        colors.border,
        colors.bg,
        'p-6 rounded-xl hover:glow-sm transition-all duration-300'
      )}
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={cn(colors.text, 'p-2 rounded-lg', colors.bg)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          change >= 0 ? 'text-green-400' : 'text-red-400'
        )}>
          {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          <span>{Math.abs(change).toFixed(1)}%</span>
        </div>
      </div>
      <div className="text-2xl font-bold text-steam-text-primary mb-1">{value}</div>
      <div className="text-sm text-steam-text-secondary">{title}</div>
    </motion.div>
  );
}

function SteamConnectionStatus({ status }: { status: string }) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/30',
      text: 'Steam Connected'
    },
    connecting: {
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      text: 'Connecting...'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      text: 'Steam Offline'
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.connecting;
  const StatusIcon = config.icon;

  return (
    <motion.div
      className={cn(
        'steam-status-monitor glass-morphism border',
        config.border,
        config.bg,
        'p-4 rounded-xl flex items-center gap-4'
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={cn('p-3 rounded-lg', config.bg)}>
        <StatusIcon className={cn(config.color, 'w-6 h-6')} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className={cn('text-lg font-semibold', config.color)}>{config.text}</span>
          <div className={cn(
            'w-3 h-3 rounded-full animate-pulse',
            status === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
          )} />
        </div>
        <p className="text-steam-text-secondary mt-1">
          Real-time Steam integration with trading bot and market data
        </p>
      </div>
      <div className="text-right">
        <div className="text-sm text-steam-text-secondary">Bot Status</div>
        <div className="text-green-400 font-medium">Online</div>
      </div>
    </motion.div>
  );
}

function VolumeProfitChart({ data }: { data: TradeData[] }) {
  if (data.length === 0) return null;

  const maxVolume = Math.max(...data.map(d => d.volume));
  const maxProfit = Math.max(...data.map(d => Math.abs(d.profit)));

  return (
    <div className="w-full h-full flex items-end justify-between gap-1">
      {data.slice(-24).map((point, index) => {
        const volumeHeight = (point.volume / maxVolume) * 100;
        const profitHeight = (Math.abs(point.profit) / maxProfit) * 60;
        const isProfitPositive = point.profit >= 0;

        return (
          <div key={index} className="flex-1 flex items-end gap-1 relative">
            {/* Volume Bar */}
            <div
              className="w-full bg-blue-400/30 rounded-t transition-all duration-300 hover:bg-blue-400/50"
              style={{ height: `${volumeHeight}%` }}
            />
            {/* Profit Indicator */}
            <div
              className={`absolute w-full rounded transition-all duration-300 ${
                isProfitPositive ? 'bg-green-400/60' : 'bg-red-400/60'
              }`}
              style={{
                height: `${profitHeight}%`,
                bottom: `${volumeHeight}%`,
                left: 0
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function MarketItemRow({ item }: { item: MarketData }) {
  const rarityColors = {
    Common: 'text-gray-400',
    Uncommon: 'text-green-400',
    Rare: 'text-blue-400',
    Mythical: 'text-purple-400',
    Legendary: 'text-orange-400',
    Ancient: 'text-red-400'
  };

  return (
    <div className="market-item-row flex items-center justify-between p-3 rounded-lg hover:bg-steam-bg-secondary transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-steam-border rounded flex items-center justify-center">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: rarityColors[item.rarity as keyof typeof rarityColors] || '#6b7280' }}></div>
        </div>
        <div>
          <div className="font-medium text-steam-text-primary text-sm">{item.item}</div>
          <div className={cn('text-xs', rarityColors[item.rarity as keyof typeof rarityColors] || 'text-gray-400')}>
            {item.rarity}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold text-steam-text-primary">${item.price}</div>
        <div className={cn('text-xs', item.change24h >= 0 ? 'text-green-400' : 'text-red-400')}>
          {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

function AnalyticsStat({ label, value, change, color }: { label: string; value: string; change: string; color: string }) {
  const colorClasses = {
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400'
  };

  return (
    <div className="analytics-stat flex items-center justify-between">
      <div>
        <div className="text-steam-text-secondary text-sm">{label}</div>
        <div className="text-steam-text-primary font-medium">{value}</div>
      </div>
      <div className={cn('text-xs font-medium', colorClasses[color as keyof typeof colorClasses])}>
        {change}
      </div>
    </div>
  );
}

function RiskMetric({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses = {
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    orange: 'text-orange-400'
  };

  return (
    <div className="risk-metric flex items-center justify-between">
      <span className="text-steam-text-secondary text-sm">{label}</span>
      <span className={cn('text-sm font-medium', colorClasses[color as keyof typeof colorClasses])}>
        {value}
      </span>
    </div>
  );
}

function SentimentIndicator({ sentiment, confidence }: { sentiment: string; confidence: number }) {
  const sentimentIcons = {
    bullish: <TrendingUp className="w-4 h-4 text-green-400" />,
    bearish: <TrendingDown className="w-4 h-4 text-red-400" />,
    volume: <BarChart3 className="w-4 h-4 text-blue-400" />,
    liquidity: <DollarSign className="w-4 h-4 text-purple-400" />
  };

  return (
    <div className="sentiment-indicator flex items-center justify-between">
      <div className="flex items-center gap-2">
        {sentimentIcons[sentiment as keyof typeof sentimentIcons] || <Activity className="w-4 h-4 text-gray-400" />}
        <span className="text-steam-text-secondary text-sm capitalize">{sentiment}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-16 bg-steam-border rounded-full h-2">
          <div
            className="h-2 bg-gradient-to-r from-green-400 to-orange-400 rounded-full transition-all duration-300"
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-sm font-medium text-steam-text-primary">{confidence}%</span>
      </div>
    </div>
  );
}

function ActivityRow({ activity }: { activity: { action: string; item: string; amount: string; time: string } }) {
  const actionColors = {
    'Trade Completed': 'text-green-400',
    'Trade Success': 'text-green-400',
    'Trade Failed': 'text-red-400',
    'Item Listed': 'text-blue-400'
  };

  return (
    <div className="activity-row flex items-center justify-between p-3 rounded-lg hover:bg-steam-bg-secondary transition-all duration-200">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-steam-accent to-orange-400 rounded-full flex items-center justify-center">
          <RefreshCw className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="font-medium text-steam-text-primary">{activity.action}</div>
          <div className="text-steam-text-secondary text-sm">{activity.item}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={cn('font-medium', actionColors[activity.action as keyof typeof actionColors] || 'text-steam-text-primary')}>
          {activity.amount}
        </div>
        <div className="text-steam-text-tertiary text-xs">{activity.time}</div>
      </div>
    </div>
  );
}