'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  Search,
  Filter,
  RefreshCw,
  ShoppingCart,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle
} from 'lucide-react';

interface MarketItem {
  id: string;
  name: string;
  steamId?: string;
  imageUrl: string;
  price: number;
  suggestedPrice: number;
  rarity: string;
  condition?: string;
  type: string;
  float?: number;
  pattern?: number;
  user?: {
    id: string;
    nickname: string;
  };
  createdAt: string;
}

interface FilterOptions {
  rarity: string[];
  type: string[];
  priceMin: number;
  priceMax: number;
  sortBy: 'price_asc' | 'price_desc' | 'newest' | 'oldest';
}

export default function MarketplacePage() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    rarity: [],
    type: [],
    priceMin: 0,
    priceMax: 1000,
    sortBy: 'newest'
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarities, setSelectedRarities] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const rarities = ['Consumer Grade', 'Industrial Grade', 'Mil-Spec', 'Restricted', 'Classified', 'Covert', 'Contraband'];
  const types = ['Rifle', 'SMG', 'Pistol', 'Knife', 'Glove', 'Sticker', 'Music Kit', 'Container', 'Key'];

  const fetchMarketItems = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        search: searchQuery,
        sortBy: filters.sortBy,
        minPrice: filters.priceMin.toString(),
        maxPrice: filters.priceMax.toString(),
        rarities: selectedRarities.join(','),
        types: selectedTypes.join(',')
      });

      const response = await fetch(`http://localhost:3002/market/listings?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch market items');
      }

      const data = await response.json();
      setItems(data.data || []);
    } catch (err) {
      setError('Не удалось загрузить товары с маркетплейса');
      console.error('Market fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyItem = async (itemId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/market/buy/${itemId}`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Purchase failed');
      }

      const result = await response.json();

      // Show success message
      alert(`✅ Покупка successful! Предмет добавлен в ваш инвентарь.`);

      // Refresh market items
      fetchMarketItems();
    } catch (err) {
      alert(`❌ Ошибка покупки: ${err.message}`);
    }
  };

  const handleRefresh = () => {
    fetchMarketItems();
  };

  useEffect(() => {
    fetchMarketItems();
  }, [filters, searchQuery, selectedRarities, selectedTypes]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const getPriceChange = (current: number, suggested: number) => {
    const change = ((current - suggested) / suggested) * 100;
    return change;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Marketplace</h1>
              <p className="text-gray-300">Покупайте и продавайте предметы Steam</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Фильтры
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Поиск
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Поиск по названию..."
                      className="w-full pl-10 pr-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Диапазон цен
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Мин. цена"
                      value={filters.priceMin || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMin: Number(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Макс. цена"
                      value={filters.priceMax || ''}
                      onChange={(e) => setFilters(prev => ({ ...prev, priceMax: Number(e.target.value) || 1000 }))}
                      className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Rarity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Редкость
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {rarities.map((rarity) => (
                      <label key={rarity} className="flex items-center space-x-2 cursor-pointer">
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
                        <span className="text-gray-300 text-sm">{rarity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Тип
                  </label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {types.map((type) => (
                      <label key={type} className="flex items-center space-x-2 cursor-pointer">
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
                        <span className="text-gray-300 text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Сортировка
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-black/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="newest">Новые</option>
                    <option value="oldest">Старые</option>
                    <option value="price_asc">Дешевые</option>
                    <option value="price_desc">Дорогие</option>
                  </select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Stats Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Активных лотов</p>
                      <p className="text-white text-2xl font-bold">{items.length}</p>
                    </div>
                    <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Средняя цена</p>
                      <p className="text-white text-2xl font-bold">
                        ${items.length > 0 ? (items.reduce((sum, item) => sum + item.price, 0) / items.length).toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-300 text-sm">Объем торгов</p>
                      <p className="text-white text-2xl font-bold">
                        ${items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="h-12 w-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Display */}
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
                  <p className="text-gray-300">Загрузка предметов...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Eye className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-white text-lg mb-2">Нет доступных предметов</h3>
                <p className="text-gray-400">Попробуйте изменить фильтры или обновить страницу</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {items.map((item) => {
                  const priceChange = getPriceChange(item.price, item.suggestedPrice);

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
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <h3 className="text-white font-semibold text-sm line-clamp-2">{item.name}</h3>

                        <div className="flex items-center justify-between">
                          <div className="text-white font-bold text-lg">
                            {formatPrice(item.price)}
                          </div>
                          <div className={`flex items-center space-x-1 text-sm ${
                            priceChange > 0 ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {priceChange > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            <span>{Math.abs(priceChange).toFixed(1)}%</span>
                          </div>
                        </div>

                        {item.suggestedPrice && (
                          <div className="text-gray-400 text-sm line-through">
                            Стандарт: {formatPrice(item.suggestedPrice)}
                          </div>
                        )}

                        {item.condition && (
                          <div className="text-gray-400 text-sm">{item.condition}</div>
                        )}

                        {item.float !== undefined && (
                          <div className="text-gray-400 text-sm">
                            Float: {item.float.toFixed(6)}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-3">
                          <Button
                            onClick={() => handleBuyItem(item.id)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 px-4 rounded-lg transition-colors duration-200"
                          >
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Купить
                          </Button>
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