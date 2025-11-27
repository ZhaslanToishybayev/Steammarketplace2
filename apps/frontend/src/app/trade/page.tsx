'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  Gavel,
  Users,
  RefreshCw,
  Plus,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Search
} from 'lucide-react';

interface TradeOffer {
  id: string;
  tradeId: string;
  type: 'sent' | 'received';
  status: 'pending' | 'accepted' | 'declined' | 'expired' | 'cancelled';
  itemsFromMe: TradeItem[];
  itemsFromOther: TradeItem[];
  counterparty: {
    id: string;
    nickname: string;
  };
  createdAt: string;
  expiresAt: string;
  lastUpdated?: string;
}

interface TradeItem {
  id: string;
  name: string;
  imageUrl: string;
  price: number;
  rarity: string;
}

export default function TradePage() {
  const [offers, setOffers] = useState<TradeOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'received' | 'sent' | 'completed'>('received');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTradeOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        type: activeTab === 'received' ? 'received' : activeTab === 'sent' ? 'sent' : 'completed',
        search: searchQuery
      });

      const response = await fetch(`http://localhost:3002/trade/offers?${queryParams}`, {
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trade offers');
      }

      const data = await response.json();
      setOffers(data.data || []);
    } catch (err) {
      setError('Не удалось загрузить торговые предложения');
      console.error('Trade offers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const acceptTradeOffer = async (offerId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/trade/${offerId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to accept offer');
      }

      const result = await response.json();
      setSuccess('✅ Торговое предложение принято!');
      fetchTradeOffers();
    } catch (err) {
      setError(`❌ Ошибка принятия: ${err.message}`);
    }
  };

  const declineTradeOffer = async (offerId: string) => {
    try {
      const response = await fetch(`http://localhost:3002/trade/${offerId}/decline`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to decline offer');
      }

      const result = await response.json();
      setSuccess('✅ Торговое предложение отклонено!');
      fetchTradeOffers();
    } catch (err) {
      setError(`❌ Ошибка отклонения: ${err.message}`);
    }
  };

  const createTradeOffer = () => {
    // Navigate to create trade page
    window.location.href = '/trade/create';
  };

  useEffect(() => {
    fetchTradeOffers();
  }, [activeTab, searchQuery]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            В ожидании
          </Badge>
        );
      case 'accepted':
        return (
          <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Принято
          </Badge>
        );
      case 'declined':
        return (
          <Badge variant="outline" className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Отклонено
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Просрочено
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-gray-500/20 text-gray-400 border-gray-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Отменено
          </Badge>
        );
      default:
        return null;
    }
  };

  const calculateTotalValue = (items: TradeItem[]) => {
    return items.reduce((sum, item) => sum + item.price, 0);
  };

  const filteredOffers = offers.filter(offer => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return offer.counterparty.nickname.toLowerCase().includes(searchLower) ||
           offer.itemsFromMe.some(item => item.name.toLowerCase().includes(searchLower)) ||
           offer.itemsFromOther.some(item => item.name.toLowerCase().includes(searchLower));
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
      {/* Header */}
      <div className="border-b border-gray-700 bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Торговые Предложения</h1>
              <p className="text-gray-300">Управление торговыми предложениями и обменами</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => window.location.reload()}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button
                onClick={createTradeOffer}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4" />
                Создать предложение
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Navigation Tabs */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20 mb-6">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2 text-sm">
                  <Gavel className="h-4 w-4" />
                  Категории
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { key: 'received', label: 'Полученные', icon: Users },
                  { key: 'sent', label: 'Отправленные', icon: Gavel },
                  { key: 'completed', label: 'Завершенные', icon: CheckCircle }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key as any)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                      <span className="ml-auto bg-white/20 px-2 py-1 rounded text-xs">
                        {offers.filter(offer => offer.type === tab.key || (tab.key === 'completed' && (offer.status === 'accepted' || offer.status === 'declined' || offer.status === 'expired'))).length}
                      </span>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Search */}
            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 text-gray-400 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по нику или предмету..."
                    className="w-full pl-10 pr-4 py-2 bg-black/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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

            {/* Offers List */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-4" />
                  <p className="text-gray-300">Загрузка торговых предложений...</p>
                </div>
              </div>
            ) : filteredOffers.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gavel className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-white text-lg mb-2">
                  {activeTab === 'received' ? 'Нет received предложений' :
                   activeTab === 'sent' ? 'Нет отправленных предложений' :
                   'Нет завершенных сделок'}
                </h3>
                <p className="text-gray-400">
                  {activeTab === 'received' ? 'Ожидайте предложения от других пользователей' :
                   activeTab === 'sent' ? 'Создайте новое торговое предложение' :
                   'Здесь будут отображаться ваши завершенные сделки'}
                </p>
                {activeTab !== 'completed' && (
                  <Button
                    onClick={createTradeOffer}
                    className="mt-4 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Создать предложение
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredOffers.map((offer) => {
                  const myTotal = calculateTotalValue(offer.itemsFromMe);
                  const theirTotal = calculateTotalValue(offer.itemsFromOther);
                  const isMyTurn = offer.type === 'received' && offer.status === 'pending';

                  return (
                    <Card key={offer.id} className="bg-white/10 backdrop-blur-md border-white/20 hover:border-white/40 transition-all duration-200">
                      <CardHeader className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="h-10 w-10 bg-blue-500/20 rounded-full flex items-center justify-center">
                              <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-white font-semibold">{offer.counterparty.nickname}</h3>
                              <p className="text-gray-400 text-sm">
                                {new Date(offer.createdAt).toLocaleDateString('ru-RU')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(offer.status)}
                            {isMyTurn && (
                              <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                                Ваш ход
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="p-4 space-y-4">
                        {/* Items from me */}
                        {offer.itemsFromMe.length > 0 && (
                          <div>
                            <h4 className="text-gray-300 text-sm mb-2">
                              {offer.type === 'sent' ? 'Вы предлагаете:' : 'Вам предлагают:'}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {offer.itemsFromMe.map((item) => (
                                <div key={item.id} className="text-center">
                                  <img
                                    src={item.imageUrl || '/placeholder-item.png'}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-lg mb-1"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder-item.png';
                                    }}
                                  />
                                  <p className="text-xs text-gray-400 truncate" title={item.name}>
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-white font-semibold">
                                    ${item.price}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="text-right mt-2">
                              <span className="text-sm text-white font-semibold">
                                Итого: ${myTotal}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Items from other */}
                        {offer.itemsFromOther.length > 0 && (
                          <div>
                            <h4 className="text-gray-300 text-sm mb-2">
                              {offer.type === 'sent' ? 'Вам дают:' : 'Вы хотите:'}
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {offer.itemsFromOther.map((item) => (
                                <div key={item.id} className="text-center">
                                  <img
                                    src={item.imageUrl || '/placeholder-item.png'}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded-lg mb-1"
                                    onError={(e) => {
                                      e.currentTarget.src = '/placeholder-item.png';
                                    }}
                                  />
                                  <p className="text-xs text-gray-400 truncate" title={item.name}>
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-white font-semibold">
                                    ${item.price}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <div className="text-right mt-2">
                              <span className="text-sm text-white font-semibold">
                                Итого: ${theirTotal}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        {offer.status === 'pending' && isMyTurn && (
                          <div className="flex space-x-2 pt-2">
                            <Button
                              onClick={() => acceptTradeOffer(offer.id)}
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2"
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Принять
                            </Button>
                            <Button
                              onClick={() => declineTradeOffer(offer.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Отклонить
                            </Button>
                          </div>
                        )}

                        {/* Expiration info */}
                        {offer.status === 'pending' && (
                          <div className="text-xs text-gray-400 text-center pt-2">
                            Истекает: {new Date(offer.expiresAt).toLocaleString('ru-RU')}
                          </div>
                        )}
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