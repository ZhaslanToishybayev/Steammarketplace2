'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  Shield,
  Server,
  Globe,
  Database,
  ShoppingBag,
  Gavel,
  Package,
  DollarSign,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';

interface SystemStatus {
  backend: boolean;
  frontend: boolean;
  steamAuth: boolean;
  marketplace: boolean;
  inventory: boolean;
  trades: boolean;
  user: any;
}

export default function SystemPage() {
  const [status, setStatus] = useState<SystemStatus>({
    backend: false,
    frontend: false,
    steamAuth: false,
    marketplace: false,
    inventory: false,
    trades: false,
    user: null
  });
  const [loading, setLoading] = useState(false);

  const checkAllSystems = async () => {
    setLoading(true);
    try {
      // Check Backend
      try {
        const backendResponse = await fetch('http://localhost:3002/health');
        setStatus(prev => ({ ...prev, backend: backendResponse.ok }));
      } catch {
        setStatus(prev => ({ ...prev, backend: false }));
      }

      // Check Frontend
      try {
        const frontendResponse = await fetch('http://localhost:3000');
        setStatus(prev => ({ ...prev, frontend: frontendResponse.ok }));
      } catch {
        setStatus(prev => ({ ...prev, frontend: false }));
      }

      // Check Steam Auth
      try {
        const authResponse = await fetch('http://localhost:3002/auth/steam');
        setStatus(prev => ({ ...prev, steamAuth: authResponse.ok || authResponse.status === 302 }));
      } catch {
        setStatus(prev => ({ ...prev, steamAuth: false }));
      }

      // Check Marketplace
      try {
        const marketplaceResponse = await fetch('http://localhost:3002/marketplace/listings');
        setStatus(prev => ({ ...prev, marketplace: marketplaceResponse.ok }));
      } catch {
        setStatus(prev => ({ ...prev, marketplace: false }));
      }

      // Check Inventory
      try {
        const inventoryResponse = await fetch('http://localhost:3002/inventory/stats');
        setStatus(prev => ({ ...prev, inventory: inventoryResponse.ok }));
      } catch {
        setStatus(prev => ({ ...prev, inventory: false }));
      }

      // Check Trades
      try {
        const tradesResponse = await fetch('http://localhost:3002/trades/stats');
        setStatus(prev => ({ ...prev, trades: tradesResponse.ok }));
      } catch {
        setStatus(prev => ({ ...prev, trades: false }));
      }

      // Check User Auth
      try {
        const userResponse = await fetch('http://localhost:3002/auth/me', {
          credentials: 'include'
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setStatus(prev => ({ ...prev, user: userData.data }));
        }
      } catch {
        setStatus(prev => ({ ...prev, user: null }));
      }

      console.log('✅ Системы проверены: Все компоненты были протестированы');
    } catch (error) {
      console.log('❌ Ошибка: Не удалось проверить системы');
    } finally {
      setLoading(false);
    }
  };

  const openFrontend = () => {
    window.open('http://localhost:3000', '_blank');
  };

  const openBackendDocs = () => {
    window.open('http://localhost:3002/docs', '_blank');
  };

  const openMarketplace = () => {
    window.open('http://localhost:3002/marketplace/listings', '_blank');
  };

  useEffect(() => {
    checkAllSystems();
  }, []);

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  const getStatusText = (isHealthy: boolean) => {
    return isHealthy ? '✅ Healthy' : '❌ Error';
  };

  const getAllSystemsHealthy = () => {
    return status.backend && status.frontend && status.steamAuth &&
           status.marketplace && status.inventory && status.trades;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🚀 Steam Marketplace - Системная Панель
          </h1>
          <p className="text-gray-300">
            Комплексное тестирование всех систем и компонентов
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={checkAllSystems}
                  disabled={loading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Проверка...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Проверить все системы
                    </>
                  )}
                </Button>
                <Button
                  onClick={openFrontend}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Frontend
                </Button>
                <Button
                  onClick={openBackendDocs}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  API Документация
                </Button>
                <Button
                  onClick={openMarketplace}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* System Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Backend Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-blue-400" />
                  <div>
                    <CardTitle className="text-white">Backend</CardTitle>
                    <CardDescription className="text-gray-400">Серверная часть</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.backend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.backend ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.backend)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">localhost:3002</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">API & Логика</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Frontend Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-green-400" />
                  <div>
                    <CardTitle className="text-white">Frontend</CardTitle>
                    <CardDescription className="text-gray-400">Клиентская часть</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.frontend)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.frontend ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.frontend)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">localhost:3000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">UI & UX</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steam Auth Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-yellow-400" />
                  <div>
                    <CardTitle className="text-white">Steam Auth</CardTitle>
                    <CardDescription className="text-gray-400">Аутентификация</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.steamAuth)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.steamAuth ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.steamAuth)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">/auth/steam</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">Steam OAuth</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Marketplace Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="h-6 w-6 text-purple-400" />
                  <div>
                    <CardTitle className="text-white">Marketplace</CardTitle>
                    <CardDescription className="text-gray-400">Маркетплейс</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.marketplace)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.marketplace ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.marketplace)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">/marketplace/listings</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">Лоты & Торговля</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Inventory Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Package className="h-6 w-6 text-blue-400" />
                  <div>
                    <CardTitle className="text-white">Inventory</CardTitle>
                    <CardDescription className="text-gray-400">Инвентарь</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.inventory)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.inventory ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.inventory)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">/inventory/stats</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">Steam Items</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trades Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gavel className="h-6 w-6 text-orange-400" />
                  <div>
                    <CardTitle className="text-white">Trades</CardTitle>
                    <CardDescription className="text-gray-400">Торговля</CardDescription>
                  </div>
                </div>
                {getStatusIcon(status.trades)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Статус:</span>
                  <span className={`font-medium ${status.trades ? 'text-green-400' : 'text-red-400'}`}>
                    {getStatusText(status.trades)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">URL:</span>
                  <span className="text-gray-400">/trades/stats</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Функция:</span>
                  <span className="text-gray-400">Trade Offers</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Status */}
        {status.user && (
          <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-8">
            <CardHeader>
              <CardTitle className="text-white">👤 User Status</CardTitle>
              <CardDescription className="text-gray-400">
                Аутентифицированный пользователь
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">ID:</span>
                  <span className="text-gray-100 font-mono">{status.user.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Steam ID:</span>
                  <span className="text-gray-100">{status.user.steamId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Никнейм:</span>
                  <span className="text-gray-100">{status.user.nickname}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Статус:</span>
                  <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Регистрация:</span>
                  <span className="text-gray-100 text-xs">
                    {new Date(status.user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Overview */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">📊 Системный Обзор</CardTitle>
            <CardDescription className="text-gray-400">
              Общее состояние всех компонентов системы
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getAllSystemsHealthy() ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span className="text-white font-medium">
                  {getAllSystemsHealthy() ? '✅ Все системы работают' : '❌ Есть проблемы'}
                </span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Object.values(status).filter(v => v === true).length - 1}/6
                </div>
                <div className="text-sm text-gray-400">Систем онлайн</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}