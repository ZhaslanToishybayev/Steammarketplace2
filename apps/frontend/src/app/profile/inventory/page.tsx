'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function InventoryPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState('730'); // CS2 by default

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/steam/auth/me');
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setCurrentUser(data.data);
            // Fetch inventory for the user
            await fetchUserInventory(data.data.steamId);
          } else {
            router.push('/auth');
          }
        } else {
          router.push('/auth');
        }
      } catch (error) {
        console.error('Ошибка проверки аутентификации:', error);
        router.push('/auth');
      }
    };

    checkAuth();
  }, [router]);

  const fetchUserInventory = async (steamId) => {
    setLoading(true);
    try {
      // Получаем реальный инвентарь из Steam Inventory API
      console.log(`📦 Fetching real Steam inventory for user: ${steamId}, App ID: ${selectedApp}`);

      const response = await fetch(`http://localhost:3000/api/steam/inventory/${steamId}?appId=${selectedApp}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Successfully loaded ${result.data.items.length} real items from Steam`);
        setInventory(result.data.items);
      } else {
        console.error('❌ Failed to load inventory:', result.error);
        // Если ошибка, показываем пустой инвентарь с сообщением
        setInventory([]);
        // Можно добавить toast уведомление об ошибке
      }
    } catch (error) {
      console.error('❌ Steam Inventory API Error:', error);
      // В случае ошибки (например, приватный инвентарь), показываем пустой инвентарь
      setInventory([]);

      // Проверяем тип ошибки и показываем соответствующее сообщение
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('💡 Inventory is private or empty');
      } else {
        console.log('💡 Network error or Steam API issue');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppChange = (appId) => {
    setSelectedApp(appId);
    if (currentUser) {
      fetchUserInventory(currentUser.steamId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка инвентаря...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <header className="border-b border-gray-700 bg-black/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/profile" className="text-gray-300 hover:text-white mr-6">← Назад</Link>
              <div className="h-10 w-10 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2V13m0-3h6m-6 0h-6m6 0v6" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">Steam Инвентарь</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">Привет, {currentUser.nickname}!</span>
              <button
                onClick={() => {
                  fetch('http://localhost:3000/api/steam/auth/logout', { method: 'POST' });
                  router.push('/auth');
                }}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* App Selection */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Выбор игры</h3>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleAppChange('730')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedApp === '730'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🎮 Counter-Strike 2
              </button>
              <button
                onClick={() => handleAppChange('570')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedApp === '570'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🏰 Dota 2
              </button>
              <button
                onClick={() => handleAppChange('440')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedApp === '440'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🏔️ Team Fortress 2
              </button>
              <button
                onClick={() => handleAppChange('753')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedApp === '753'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                🎪 Steam Community
              </button>
            </div>
          </div>

          {/* Inventory Stats */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{inventory.length}</div>
                <div className="text-gray-400 text-sm">Всего предметов</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {inventory.filter(item => item.marketable).length}
                </div>
                <div className="text-gray-400 text-sm">На продажу</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {inventory.filter(item => item.tradable).length}
                </div>
                <div className="text-gray-400 text-sm">Торговые</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  ${inventory.reduce((total, item) => total + item.price, 0).toFixed(2)}
                </div>
                <div className="text-gray-400 text-sm">Общая стоимость</div>
              </div>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {inventory.map((item, index) => (
              <div key={item.assetId} className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden hover:border-blue-600 transition-colors group">
                <div className="relative">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      e.target.src = 'https://steamcommunity-a.akamaihd.net/economy/image/-9a81dlWLwJ2UUGcVs_nsVtzdOEdtWwkgUATLIQRupTKQswJqvsL76kMBidF6jhgbQlVxQT1PAPz-ALhAJmwXwQqovADzhpQMFhQkA2H';
                    }}
                  />
                  <div className="absolute top-2 left-2">
                    {item.marketable && (
                      <span className="bg-green-600 text-xs px-2 py-1 rounded-full text-white">На продажу</span>
                    )}
                    {!item.marketable && item.tradable && (
                      <span className="bg-yellow-600 text-xs px-2 py-1 rounded-full text-white">Торг</span>
                    )}
                    {!item.marketable && !item.tradable && (
                      <span className="bg-gray-600 text-xs px-2 py-1 rounded-full text-white">Нет</span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  <h4 className="font-semibold text-white text-sm mb-2 line-clamp-2">{item.name}</h4>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Тип:</span>
                      <span className="text-white">{item.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Редкость:</span>
                      <span className={`${
                        item.rarity === 'Covert' ? 'text-red-400' :
                        item.rarity === 'Classified' ? 'text-purple-400' :
                        item.rarity === 'Restricted' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {item.rarity}
                      </span>
                    </div>
                    {item.exterior && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Состояние:</span>
                        <span className="text-orange-400">{item.exterior}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Цена:</span>
                      <span className="text-green-400 font-semibold">${item.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors">
                      📦 Выставить на продажу
                    </button>
                    <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors">
                      🔄 Торг предложение
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {inventory.length === 0 && (
            <div className="text-center py-12">
              <div className="h-16 w-16 bg-gray-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2V13m0-3h6m-6 0h-6m6 0v6" />
                </svg>
              </div>
              <h4 className="text-white font-semibold mb-2">Инвентарь пуст</h4>
              <p className="text-gray-300 mb-6">Ваш инвентарь в этой игре пуст или является приватным</p>
              <div className="space-x-4">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md transition-colors">
                  🎮 Проверить другую игру
                </button>
                <button className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-md transition-colors">
                  🔧 Настроить приватность
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}