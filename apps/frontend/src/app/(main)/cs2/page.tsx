'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { sessionManager } from '@/lib/session';
import { useCachedInventory } from '@/lib/useCachedInventory';

export default function CS2Page() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  // Cached inventory hook
  const {
    inventory,
    isLoading,
    error,
    refetch,
    invalidateCache,
    clearCache,
    cacheStatus,
    stats
  } = useCachedInventory({
    appId: 730, // CS2 app ID
    enabled: true,
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
    retryOnFailure: true
  });

  useEffect(() => {
    const storedUser = sessionManager.getUser();
    if (!storedUser) {
      router.push('/');
      return;
    }
    setUser(storedUser);
  }, [router]);

  const handleLogin = () => {
    const api = '';
    window.location.href = `/api/auth/steam`;
  };

  const formatMeta = (item: any) => {
    const tags = item?.tags || [];
    const get = (cat: string) => tags.find((t: any) => String(t.category || t.internal_name || '').toLowerCase().includes(cat))?.name || tags.find((t: any) => String(t.category || '').toLowerCase().includes(cat))?.localized_tag_name;
    const type = get('type') || item.type;
    const rarity = get('rarity');
    const exterior = get('exterior');
    return [rarity, exterior, type].filter(Boolean).join(' • ');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary/30 rounded-full animate-pulse mx-auto mb-4"></div>
            <div className="text-muted-foreground">Loading CS2 inventory...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <main className="container mx-auto px-4 py-8">
          <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-12 text-center">
            <div className="h-16 w-16 bg-destructive/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4">Error Loading CS2 Inventory</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="text-muted-foreground text-sm space-y-2 max-w-md mx-auto">
              <p>Common issues:</p>
              <p>• Steam inventory set to private</p>
              <p>• No CS2 items in inventory</p>
              <p>• Steam API rate limit reached</p>
              <a
                href="https://steamcommunity.com/my/edit/settings"
                target="_blank"
                className="inline-block mt-4 text-primary hover:text-primary/80"
              >
                Check Steam Privacy Settings →
              </a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
            <div>
              <Link
                href="/"
                className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </Link>
              <h1 className="text-4xl font-bold mb-2">Counter-Strike 2 Inventory</h1>
              <p className="text-muted-foreground">Your CS2 skins, knives, gloves and items</p>
            </div>

            {user && (
              <div className="mt-4 md:mt-0">
                <div className="text-right">
                  <div className="text-gray-400 text-sm">Steam ID</div>
                  <div className="text-white font-mono">{user.steamId}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {!user ? (
          <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-12 text-center">
            <div className="h-20 w-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-8">
              <span className="text-3xl">🔫</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Login to View CS2 Inventory</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto">
              Connect your Steam account to view your CS2 skins, knives, and other items
            </p>
            <button
              onClick={handleLogin}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-xl font-semibold inline-flex items-center space-x-3 transition"
            >
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
              </svg>
              <span className="text-lg">Login with Steam</span>
            </button>
          </div>
        ) : !inventory || !inventory.items || inventory.items.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-900/20 to-black border border-gray-800 rounded-2xl p-12 text-center">
            <div className="h-16 w-16 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">🔫</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">No CS2 Items Found</h2>
            <p className="text-gray-400 mb-6">
              Your CS2 inventory appears to be empty or private
            </p>
            <div className="text-gray-500 text-sm space-y-1 max-w-md mx-auto">
              <p>To see your CS2 items:</p>
              <p>1. Make sure you have CS2 items in your Steam inventory</p>
              <p>2. Set your Steam inventory privacy to "Public"</p>
              <p>3. Visit <a href="https://steamcommunity.com/my/inventory/" target="_blank" className="text-blue-400">your Steam inventory</a></p>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-800/30 rounded-2xl p-6 mb-8">
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="mb-4 sm:mb-0">
                  <h2 className="text-xl font-bold text-white mb-2">CS2 Inventory Overview</h2>
                  <p className="text-gray-400">
                    Total items: <span className="text-white font-bold">{inventory?.items?.length || 0}</span> •
                    Tradable: <span className="text-green-400 font-bold">{inventory?.items?.filter(i => i.tradable).length || 0}</span> •
                    Marketable: <span className="text-blue-400 font-bold">{inventory?.items?.filter(i => i.marketable).length || 0}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {(inventory?.items || []).map((item) => (
                <div
                  key={(item as any).assetid || (item as any).id}
                  className="group bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-blue-500 rounded-xl p-3 transition-all hover:scale-[1.02]"
                >
                  <div className="aspect-square relative mb-3">
                    <img
                      src={item.icon_url_large || item.icon_url || 'https://via.placeholder.com/256'}
                      alt={item.name}
                      className="w-full h-full object-contain rounded-lg group-hover:brightness-110 transition"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://via.placeholder.com/256';
                      }}
                    />
                    {item.amount > 1 && (
                      <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
                        {item.amount}
                      </div>
                    )}
                  </div>

                  <h3 className="text-white font-medium truncate mb-1 text-sm">{item.name}</h3>
                  <p className="text-gray-400 text-xs truncate mb-2">
                    {item.market_hash_name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatMeta(item) || 'Skin'}
                    </span>
                    <div className="flex space-x-1">
                      {item.tradable && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                          T
                        </span>
                      )}
                      {item.marketable && (
                        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                          M
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Stats */}
            <div className="mt-8 text-center">
              <p className="text-gray-400 text-sm">
                Showing {(inventory?.items || []).length} CS2 items •
                {cacheStatus.hasCache ? (
                  <span className="text-green-400">📦 Using cached data</span>
                ) : (
                  <span className="text-yellow-400">🌐 Live data</span>
                )} •
                Last updated: {new Date().toLocaleString()}
              </p>
              <div className="mt-4 flex justify-center space-x-4 text-xs text-muted-foreground">
                <span>Cache: {cacheStatus.hasCache ? 'Enabled' : 'Disabled'}</span>
                <span>•</span>
                <span>Auto-refresh: 5min</span>
                <span>•</span>
                <span>TTL: 5min</span>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}