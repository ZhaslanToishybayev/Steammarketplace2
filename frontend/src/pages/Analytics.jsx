import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Users, ShoppingBag, DollarSign, Activity, Zap } from 'lucide-react';

const COLORS = ['#f97316', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];

export default function Analytics() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('7d');
  const [realTimeData, setRealTimeData] = useState(null);

  // Mock data for sales chart
  const salesData = [
    { date: '2024-01-01', sales: 4000, volume: 2400 },
    { date: '2024-01-02', sales: 3000, volume: 1398 },
    { date: '2024-01-03', sales: 2000, volume: 9800 },
    { date: '2024-01-04', sales: 2780, volume: 3908 },
    { date: '2024-01-05', sales: 1890, volume: 4800 },
    { date: '2024-01-06', sales: 2390, volume: 3800 },
    { date: '2024-01-07', sales: 3490, volume: 4300 },
    { date: '2024-01-08', sales: 4200, volume: 5100 },
    { date: '2024-01-09', sales: 3800, volume: 4700 },
    { date: '2024-01-10', sales: 4500, volume: 5300 },
    { date: '2024-01-11', sales: 5200, volume: 6200 },
    { date: '2024-01-12', sales: 4800, volume: 5800 },
    { date: '2024-01-13', sales: 5500, volume: 6500 },
    { date: '2024-01-14', sales: 6100, volume: 7100 },
  ];

  // Mock data for user activity
  const userActivityData = [
    { time: '00:00', users: 240 },
    { time: '04:00', users: 139 },
    { time: '08:00', users: 980 },
    { time: '12:00', users: 3908 },
    { time: '16:00', users: 4800 },
    { time: '20:00', users: 3800 },
  ];

  // Mock data for popular items
  const popularItemsData = [
    { name: 'AK-47 | Redline', value: 450, color: '#f97316' },
    { name: 'AWP | Dragon Lore', value: 320, color: '#ec4899' },
    { name: 'M4A4 | Howl', value: 280, color: '#8b5cf6' },
    { name: 'AWP | Medusa', value: 220, color: '#3b82f6' },
    { name: 'AK-47 | Fire Serpent', value: 180, color: '#10b981' },
  ];

  // Mock data for price trends
  const priceTrendsData = [
    { item: 'Redline', price: 85, change: 5.2 },
    { item: 'Dragon Lore', price: 1250, change: -2.1 },
    { item: 'Howl', price: 2100, change: 8.5 },
    { item: 'Medusa', price: 950, change: 1.8 },
    { item: 'Fire Serpent', price: 680, change: -0.5 },
  ];

  // Mock real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeData({
        activeUsers: Math.floor(Math.random() * 500) + 1000,
        sales: Math.floor(Math.random() * 50) + 100,
        volume: Math.floor(Math.random() * 10000) + 50000,
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const timeRangeOptions = [
    { value: '24h', label: t('analytics.timeRange.24h') },
    { value: '7d', label: t('analytics.timeRange.7d') },
    { value: '30d', label: t('analytics.timeRange.30d') },
    { value: '90d', label: t('analytics.timeRange.90d') },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 light:from-gray-50 light:via-blue-50 light:to-indigo-50 relative overflow-hidden pt-32 pb-20 transition-colors duration-300">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block mb-6 px-6 py-2 rounded-full bg-gradient-to-r dark:from-orange-500/30 dark:via-pink-500/30 dark:to-violet-500/30 light:from-orange-400/20 light:via-pink-400/20 light:to-violet-400/20 border dark:border-white/20 light:border-black/10 backdrop-blur-xl shadow-2xl transition-colors duration-300">
            <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent flex items-center">
              <Activity className="w-4 h-4 mr-2 text-orange-500" />
              {t('analytics.realtime')}
              <Zap className="w-4 h-4 ml-2 text-pink-500" />
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-6">
            <span className="bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
              {t('analytics.title')}
            </span>
          </h1>
          <p className="text-2xl dark:text-gray-300 light:text-gray-700 font-semibold mb-8 transition-colors duration-300">
            {t('analytics.subtitle')}
          </p>

          {/* Time Range Selector */}
          <div className="flex justify-center">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-2 flex gap-2">
              {timeRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTimeRange(option.value)}
                  className={`px-6 py-3 rounded-xl font-bold text-lg transition-all duration-300 ${
                    timeRange === option.value
                      ? 'bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 text-white shadow-2xl'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time Stats Cards */}
        {realTimeData && (
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-orange-500/20 via-pink-500/10 to-violet-500/20 border border-white/20 rounded-3xl p-6 hover:scale-105 transition-all duration-500">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-green-400 text-sm font-bold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Live
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">{realTimeData.activeUsers.toLocaleString()}</h3>
                <p className="text-gray-300 text-lg">{t('analytics.activeUsers')}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-orange-500/20 border border-white/20 rounded-3xl p-6 hover:scale-105 transition-all duration-500">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-pink-500 to-violet-600 rounded-2xl flex items-center justify-center">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-green-400 text-sm font-bold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Live
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">{realTimeData.sales}</h3>
                <p className="text-gray-300 text-lg">{t('analytics.sales24h')}</p>
              </div>
            </div>

            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-violet-500/20 via-orange-500/10 to-pink-500/20 border border-white/20 rounded-3xl p-6 hover:scale-105 transition-all duration-500">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-orange-600 rounded-2xl flex items-center justify-center">
                    <DollarSign className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-green-400 text-sm font-bold flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Live
                  </div>
                </div>
                <h3 className="text-3xl font-black text-white mb-2">${realTimeData.volume.toLocaleString()}</h3>
                <p className="text-gray-300 text-lg">{t('analytics.volume24h')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Sales Chart */}
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6">{t('analytics.salesVolume')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#f97316"
                  fillOpacity={1}
                  fill="url(#colorSales)"
                  name={t('analytics.sales')}
                />
                <Area
                  type="monotone"
                  dataKey="volume"
                  stroke="#ec4899"
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  name={t('analytics.volume')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Activity and Popular Items */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* User Activity */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6">{t('analytics.userActivity')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={userActivityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 6 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Popular Items */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8">
            <h2 className="text-3xl font-bold text-white mb-6">{t('analytics.popularItems')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={popularItemsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {popularItemsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(15, 23, 42, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Price Trends */}
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8">
          <h2 className="text-3xl font-bold text-white mb-6">{t('analytics.priceTrends')}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priceTrendsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="item" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend />
                <Bar dataKey="price" fill="#3b82f6" name={t('analytics.price')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
