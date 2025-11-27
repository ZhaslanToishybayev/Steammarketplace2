'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { Label } from '@/components/shared/Label';
import { Settings, Save, AlertCircle } from 'lucide-react';

export default function SetupPage() {
  const [steamApiKey, setSteamApiKey] = useState('');
  const [steamReturnUrl, setSteamReturnUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save configuration
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          steamApiKey,
          steamReturnUrl,
        }),
      });

      if (response.ok) {
        alert("✅ Настройки сохранены\nКонфигурация Steam OAuth обновлена");
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (error) {
      alert("❌ Ошибка\nНе удалось сохранить настройки");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            <Settings className="h-8 w-8 inline-block mr-2" />
            Настройка Steam OAuth
          </h1>
          <p className="text-gray-400">
            Configure Steam authentication for your marketplace
          </p>
        </div>

        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <div className="p-6 space-y-6">
            {/* Alert */}
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 text-yellow-400">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Для работы Steam OAuth вам понадобится:
                </span>
              </div>
              <ul className="mt-2 text-sm text-gray-300 space-y-1">
                <li>• Steam API Key (получить на https://steamcommunity.com/dev/apikey)</li>
                <li>• Корректный Return URL (обычно http://localhost:3000/api/auth/steam/callback)</li>
                <li>• Backend сервер должен быть настроен на использование этих параметров</li>
              </ul>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="steamApiKey" className="text-white">
                  Steam API Key
                </Label>
                <Input
                  id="steamApiKey"
                  type="password"
                  value={steamApiKey}
                  onChange={(e) => setSteamApiKey(e.target.value)}
                  placeholder="Введите ваш Steam API Key"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="steamReturnUrl" className="text-white">
                  Steam Return URL
                </Label>
                <Input
                  id="steamReturnUrl"
                  type="url"
                  value={steamReturnUrl}
                  onChange={(e) => setSteamReturnUrl(e.target.value)}
                  placeholder="http://localhost:3000/api/auth/steam/callback"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Сохранение...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Сохранить настройки</span>
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setSteamApiKey('');
                  setSteamReturnUrl('');
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Очистить
              </Button>
            </div>
          </div>
        </Card>

        {/* Test Section */}
        <Card className="bg-white/10 backdrop-blur-md border-white/20 mt-6">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Тестирование Steam OAuth
            </h3>
            <div className="space-y-3">
              <Button
                onClick={() => window.open('/api/auth/steam', '_blank')}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                🚀 Протестировать Steam OAuth
              </Button>
              <p className="text-sm text-gray-400 text-center">
                Откроется новое окно для тестирования аутентификации
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
