'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  Shield,
  Server,
  Globe,
  RefreshCw,
  CheckCircle,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Settings
} from 'lucide-react';

interface SteamAuthStatus {
  backend: boolean;
  steamAuth: boolean;
  user: any;
  error: string | null;
}

export default function SteamAuthPage() {
  const [status, setStatus] = useState<SteamAuthStatus>({
    backend: false,
    steamAuth: false,
    user: null,
    error: null
  });
  const [loading, setLoading] = useState(false);

  const checkSteamAuth = async () => {
    setLoading(true);
    setStatus(prev => ({ ...prev, error: null }));

    try {
      // Check Backend
      try {
        const backendResponse = await fetch('http://localhost:3002/health');
        setStatus(prev => ({ ...prev, backend: backendResponse.ok }));
      } catch (error) {
        setStatus(prev => ({ ...prev, backend: false, error: 'Backend not accessible' }));
      }

      // Check Steam Auth endpoint
      if (status.backend) {
        try {
          const authResponse = await fetch('http://localhost:3002/auth/steam');
          setStatus(prev => ({ ...prev, steamAuth: authResponse.ok || authResponse.status === 302 }));
        } catch (error) {
          setStatus(prev => ({ ...prev, steamAuth: false }));
        }
      }

      // Check User Auth status
      try {
        const userResponse = await fetch('http://localhost:3002/auth/me', {
          credentials: 'include'
        });
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setStatus(prev => ({ ...prev, user: userData.data }));
        } else {
          setStatus(prev => ({ ...prev, user: null }));
        }
      } catch (error) {
        setStatus(prev => ({ ...prev, user: null }));
      }
    } catch (error) {
      setStatus(prev => ({ ...prev, error: error.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleSteamLogin = () => {
    window.open('/api/auth/steam', '_blank', 'width=800,height=600');
  };

  useEffect(() => {
    checkSteamAuth();
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

  const getSteamAuthStatus = () => {
    if (status.user) return '✅ Authenticated';
    if (status.steamAuth) return '🔄 Ready for Auth';
    if (status.backend) return '⚠️ Backend OK, Steam Auth Error';
    return '❌ Backend Error';
  };

  const canLogin = status.backend && status.steamAuth && !status.user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            <Shield className="h-8 w-8 inline-block mr-3" />
            Steam OAuth - Система Аутентификации
          </h1>
          <p className="text-gray-300">
            Проверка и настройка Steam аутентификации для marketplace
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <div className="p-6">
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={checkSteamAuth}
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
                      Проверить систему
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSteamLogin}
                  disabled={!canLogin}
                  className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <ExternalLink className="h-4 w-4" />
                  Пробный вход
                </Button>
              </div>
              {!canLogin && (
                <p className="text-center text-yellow-400 text-sm mt-2">
                  ⚠️ Steam OAuth не готов к использованию
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Backend Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Server className="h-6 w-6 text-blue-400" />
                  <div>
                    <h3 className="text-white font-semibold">Backend</h3>
                    <p className="text-gray-400 text-sm">Сервер</p>
                  </div>
                </div>
                {getStatusIcon(status.backend)}
              </div>
              <p className={`text-sm ${status.backend ? 'text-green-400' : 'text-red-400'}`}>
                {getStatusText(status.backend)}
              </p>
            </div>
          </Card>

          {/* Steam Auth Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-orange-400" />
                  <div>
                    <h3 className="text-white font-semibold">Steam Auth</h3>
                    <p className="text-gray-400 text-sm">Аутентификация</p>
                  </div>
                </div>
                {getStatusIcon(status.steamAuth)}
              </div>
              <p className={`text-sm ${status.steamAuth ? 'text-green-400' : 'text-red-400'}`}>
                {getSteamAuthStatus()}
              </p>
            </div>
          </Card>

          {/* User Status */}
          <Card className="bg-white/10 backdrop-blur-md border-white/20">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-green-400" />
                  <div>
                    <h3 className="text-white font-semibold">User Status</h3>
                    <p className="text-gray-400 text-sm">Пользователь</p>
                  </div>
                </div>
                {status.user ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              {status.user ? (
                <div className="space-y-1 text-sm text-green-400">
                  <p>✅ Аутентифицирован</p>
                  <p className="text-gray-300">Steam ID: {status.user.steamId}</p>
                  <p className="text-gray-300">Ник: {status.user.nickname}</p>
                </div>
              ) : (
                <p className="text-red-400 text-sm">❌ Не аутентифицирован</p>
              )}
            </div>
          </Card>
        </div>

        {/* Error Display */}
        {status.error && (
          <Card className="bg-red-500/10 border-red-500/20 mb-8">
            <div className="p-6">
              <div className="flex items-center space-x-3 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Ошибка: {status.error}</span>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <div className="p-6">
            <h3 className="text-white font-semibold mb-4">
              📋 Инструкция по настройке Steam OAuth
            </h3>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/30 mt-0.5">1</Badge>
                <div>
                  <p className="font-medium text-white">Получите Steam API Key</p>
                  <p>Перейдите на <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">steamcommunity.com/dev/apikey</a> и зарегистрируйте приложение</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 mt-0.5">2</Badge>
                <div>
                  <p className="font-medium text-white">Настройте Backend</p>
                  <p>Убедитесь что в <code>.env</code> файле backend указан <code>STEAM_API_KEY</code></p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 mt-0.5">3</Badge>
                <div>
                  <p className="font-medium text-white">Проверьте CORS</p>
                  <p>Убедитесь что backend разрешает запросы с <code>http://localhost:3000</code></p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500/30 mt-0.5">4</Badge>
                <div>
                  <p className="font-medium text-white">Тестируйте аутентификацию</p>
                  <p>Используйте кнопку "Пробный вход" для тестирования Steam OAuth</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Quick Links */}
        <div className="mt-8 text-center space-x-4">
          <a href="/system" className="text-blue-400 hover:text-blue-300">
            🖥️ Системный мониторинг
          </a>
          <span className="text-gray-600">|</span>
          <a href="/auth/setup" className="text-purple-400 hover:text-purple-300">
            ⚙️ Настройка OAuth
          </a>
          <span className="text-gray-600">|</span>
          <a href="/auth" className="text-green-400 hover:text-green-300">
            🔙 Назад к аутентификации
          </a>
        </div>
      </div>
    </div>
  );
}