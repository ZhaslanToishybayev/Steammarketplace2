// apps/frontend/src/app/profile/[steamId]/inventory/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager } from '@/lib/session';
import { apiClient, InventoryItem, ProfileResponse } from '@/lib/api';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';

export default function InventoryPage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<'cs2' | 'dota'>('cs2');
  const [profile, setProfile] = useState<any>(null); // Type 'any' to handle raw DB fields
  const [showSettings, setShowSettings] = useState(false);
  const [tradeUrl, setTradeUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = sessionManager.getUser();
    if (!user) {
      router.push('/');
      return;
    }
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const p = await apiClient.getProfile();
        if (p.success && p.user) {
          setProfile(p.user);
          // @ts-ignore
          setTradeUrl(p.user.trade_url || p.user.tradeUrl || '');
        }
        const resp = selectedGame === 'cs2'
          ? await apiClient.getCs2Inventory()
          : await apiClient.getDotaInventory();
        if (resp.success) {
          setInventory(resp.items);
        } else {
          setError(resp.error || 'Failed to load inventory');
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load inventory');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedGame, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error loading inventory</h3>
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
            (async () => {
              try {
                const resp = selectedGame === 'cs2'
                  ? await apiClient.getCs2Inventory()
                  : await apiClient.getDotaInventory();
                if (resp.success) {
                  setInventory(resp.items);
                } else {
                  setError(resp.error || 'Failed to load inventory');
                }
              } catch (e: any) {
                setError(e.message || 'Failed to load inventory');
              } finally {
                setLoading(false);
              }
            })();
          }}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {profile && (
        <div className="flex items-center gap-4 mb-6">
          <img src={profile.avatar} alt={profile.username} className="h-16 w-16 rounded-full border border-gray-700" />
          <div>
            <div className="text-xl font-semibold text-gray-900">{profile.username}</div>
            <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
              View Steam Profile
            </a>
            <div className="text-xs text-gray-500 mt-1">Steam ID: {profile.steamId}</div>
          </div>
          <div className="ml-auto">
            <Button onClick={() => setShowSettings(true)} variant="secondary">
              ⚙️ Settings
            </Button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1b2838] p-6 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Profile Settings</h3>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Steam Trade URL</label>
              <Input
                value={tradeUrl}
                onChange={(e) => setTradeUrl(e.target.value)}
                placeholder="https://steamcommunity.com/tradeoffer/new/..."
                className="bg-[#0f1519] border-gray-700 text-white"
              />
              <p className="text-xs text-gray-500 mt-2">
                Required for bots to send you items.
                <a href="https://steamcommunity.com/id/me/tradeoffers/privacy#trade_offer_access_url" target="_blank" className="text-blue-400 hover:underline ml-1">
                  Find my URL
                </a>
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="ghost"
                onClick={() => setShowSettings(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  setSaving(true);
                  try {
                    await apiClient.updateProfile({ tradeUrl });
                    toast.success('Settings saved!');
                    setShowSettings(false);
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to save');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>

        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedGame('cs2')}
            className={`px-4 py-2 rounded-lg ${selectedGame === 'cs2' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            CS2
          </button>
          <button
            onClick={() => setSelectedGame('dota')}
            className={`px-4 py-2 rounded-lg ${selectedGame === 'dota' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Dota 2
          </button>
        </div>
      </div>

      {inventory.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">🎮</div>
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No items found</h3>
          <p className="text-gray-500">This inventory appears to be empty or set to private.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-gray-600">
            Showing {inventory.length} items
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200 overflow-hidden group"
              >
                <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-300">
                  {item.icon_url ? (
                    <img
                      src={item.icon_url}
                      alt={item.name}
                      className="object-contain p-2 w-full h-full"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = '/placeholder-image.png';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  {!item.tradable && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                      Non-Tradable
                    </div>
                  )}
                </div>

                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate text-sm">
                    {item.name}
                  </h3>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">
                      {item.market_hash_name}
                    </span>
                    {item.tradable && (
                      <button className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition-colors">
                        Trade
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
