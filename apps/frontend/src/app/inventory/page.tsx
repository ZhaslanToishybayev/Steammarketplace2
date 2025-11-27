'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  RefreshCw,
  Upload,
  Download,
  Search,
  Eye,
  DollarSign,
  Box,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface InventoryItem {
  id: string;
  name: string;
  steamId: string;
  imageUrl: string;
  description: string;
  rarity: string;
  type: string;
  condition?: string;
  float?: number;
  pattern?: number;
  price?: number;
  marketValue?: number;
  tradable: boolean;
  marketable: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const rarities = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband'];
  const types = ['Rifle', 'SMG', 'Pistol', 'Knife', 'Glove', 'Sticker', 'Music Kit', 'Container', 'Key'];

  const fetchInventory = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (selectedTypes.length) queryParams.append('types', selectedTypes.join(','));
      if (selectedRarities.length) queryParams.append('rarities', selectedRarities.join(','));

      const response = await fetch(`http://localhost:3002/inventory?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch inventory');
      }

      const data = await response.json();
      setItems(data.data || []);
    } catch (err) {
      setError('Не удалось загрузить инвентарь');
      console.error('Inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const syncSteamInventory = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('http://localhost:3002/inventory/sync', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Sync failed');
      }

      const result = await response.json();
      setSuccess(`✅ Синхронизация успешна! Найдено ${result.data.items?.length || 0} предметов.`);
      fetchInventory();
    } catch (err) {
      setError(`❌ Ошибка синхронизации: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const listItemForSale = async (itemId: string, price: number) => {
    try {
      const response = await fetch(`http://localhost:3002/inventory/${itemId}/list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        },
        body: JSON.stringify({ price })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to list item');
      }

      const result = await response.json();
      setSuccess('✅ Предмет выставлен на продажу!');
      fetchInventory();
    } catch (err) {
      setError(`❌ Ошибка выставления: ${err.message}`);
    }
  };

  const unlistItem = async (itemId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/inventory/${itemId}/unlist`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unlist item');
      }

      const result = await response.json();
      setSuccess('✅ Предмет снят с продажи!');
      fetchInventory();
    } catch (err) {
      setError(`❌ Ошибка снятия: ${err.message}`);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [searchQuery, selectedTypes, selectedRarities]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.marketValue || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Мой Инвентарь</h1>
              <p className="text-gray-300">Ваши Steam предметы и управление продажей</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={syncSteamInventory}
                disabled={syncing || loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Синхронизировать
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Stats Card */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Статистика
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Всего предметов</span>
                  <span className="text-white font-bold">{items.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">На продаже</span>
                  <span className="text-green-400 font-bold">
                    {items.filter(item => item.price).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Общая стоимость</span>
                  <span className="text-white font-bold">
                    {formatPrice(getTotalValue())}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Средняя цена</span>
                  <span className="text-white font-bold">
                    {items.length > 0 ? formatPrice(getTotalValue() / items.length) : '$0.00'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Filters */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <Search className="h-4 w-4" />
                  Фильтры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию..."
                    className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Тип</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {types.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTypes(prev => [...prev, type]);
                            } else {
                              setSelectedTypes(prev => prev.filter(t => t !== type));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-300">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Rarity Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-2">Редкость</label>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {rarities.map((rarity) => (
                      <label key={rarity} className="flex items-center space-x-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedRarities.includes(rarity)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRarities(prev => [...prev, rarity]);
                            } else {
                              setSelectedRarities(prev => prev.filter(r => r !== rarity));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-300">{rarity}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-3 text-green-400">
                  <CheckCircle className="h-5 w-5" />
                  <span>{success}</span>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-3 text-red-400">
                  <AlertTriangle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Items Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-300">Загрузка инвентаря...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Box className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-white text-lg mb-2">Инвентарь пуст</h3>
                <p className="text-gray-400 mb-4">Нажмите "Синхронизировать" чтобы загрузить предметы из Steam</p>
                <Button
                  onClick={syncSteamInventory}
                  disabled={syncing}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Синхронизировать инвентарь
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => {
                  const isListed = !!item.price;
                  const priceDiff = item.price && item.marketValue
                    ? ((item.price - item.marketValue) / item.marketValue) * 100
                    : 0;

                  return (
                    <Card key={item.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:border-white/40 transition-all duration-200">
                      <CardHeader className="p-4">
                        <div className="relative">
                          <img
                            src={item.imageUrl || '/placeholder-item.png'}
                            alt={item.name}
                            className="w-full h-32 object-cover rounded-lg"
                            onError={(e) => {
                              e.currentTarget.src = '/placeholder-item.png';
                            }}
                          />
                          {item.rarity && (
                            <Badge
                              variant="outline"
                              className={`absolute top-2 left-2 text-xs ${
                                item.rarity === 'Covert' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                item.rarity === 'Classified' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                item.rarity === 'Restricted' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                item.rarity === 'Mil-Spec' ? 'bg-lightblue-500/20 text-lightblue-400 border-lightblue-500/30' :
                                item.rarity === 'Industrial Grade' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                item.rarity === 'Consumer Grade' ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' :
                                'bg-gray-500/20 text-gray-400 border-gray-500/30'
                              }`}
                            >
                              {item.rarity}
                            </Badge>
                          )}
                          {isListed && (
                            <Badge
                              variant="outline"
                              className="absolute top-2 right-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs"
                            >
                              На продаже
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="text-white font-semibold text-sm line-clamp-2">{item.name}</h3>

                        <div className="flex items-center justify-between">
                          <div className="text-white font-bold text-lg">
                            {formatPrice(item.marketValue || 0)}
                          </div>
                          {item.price && (
                            <div className={`flex items-center space-x-1 text-sm ${
                              priceDiff > 0 ? 'text-red-400' : 'text-green-400'
                            }`}>
                              <span className={priceDiff > 0 ? 'text-red-400' : 'text-green-400'}>
                                {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>

                        {item.condition && (
                          <div className="text-gray-400 text-sm">{item.condition}</div>
                        )}

                        {item.float !== undefined && (
                          <div className="text-gray-400 text-sm">
                            Float: {item.float.toFixed(6)}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2">
                          {!isListed ? (
                            <Button
                              onClick={() => {
                                const price = prompt('Введите цену продажи:', item.marketValue?.toString() || '10');
                                if (price && !isNaN(Number(price))) {
                                  listItemForSale(item.id, Number(price));
                                }
                              }}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-1 px-3 rounded transition-colors duration-200"
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              Выставить
                            </Button>
                          ) : (
                            <Button
                              onClick={() => unlistItem(item.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-1 px-3 rounded transition-colors duration-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Снять
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}