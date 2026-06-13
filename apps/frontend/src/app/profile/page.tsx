'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { sessionManager } from '@/lib/session';
import { apiClient, InventoryItem, ProfileResponse } from '@/lib/api';
import toast from 'react-hot-toast';
import { Button, Input } from '@/components/ui';
import { motion } from 'framer-motion';
import { Settings, ExternalLink, Package, Gamepad2, User, Moon, Sun, Link2, Shield, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default function ProfilePage() {
  const router = useRouter();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<'cs2' | 'dota'>('cs2');
  const [profile, setProfile] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showTradeUrl, setShowTradeUrl] = useState(false);
  const [tradeUrl, setTradeUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

    // Auto-refresh inventory every 30 seconds
    const interval = setInterval(() => {
      load();
    }, 30000);

    return () => clearInterval(interval);
  }, [selectedGame, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#FF8C00]/30 rounded-full"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-[#FF8C00] rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-steam rounded-3xl p-8 max-w-md w-full text-center border border-[#EF4444]/20"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[#EF4444]/10 flex items-center justify-center">
            <Package className="w-8 h-8 text-[#EF4444]" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Error loading inventory</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="bg-[#EF4444] hover:bg-[#DC2626] text-white"
          >
            Try Again
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Navbar />

      {/* Hero Header */}
      <div className="relative pt-24 pb-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#FF8C00]/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#E67E00]/5 rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-6 relative">
          {profile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row items-start md:items-center gap-6"
            >
              {/* Avatar - Square */}
              <div className="relative">
                <img
                  src={profile.avatarFull || profile.avatar}
                  alt={profile.username}
                  className="w-24 h-24 rounded-lg ring-4 ring-[#FF8C00]/30 shadow-lg shadow-[#FF8C00]/20"
                />
                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#22C55E] rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-full bg-[#FF8C00]/10 border border-[#FF8C00]/25 text-[#FF8C00] text-sm font-medium">
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                  {profile.username}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-gray-400">
                  <span className="text-sm">Steam ID: {profile.steamId}</span>
                  <a
                    href={`https://steamcommunity.com/profiles/${profile.steamId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#FF8C00] hover:text-[#FFA500] text-sm transition-colors"
                  >
                    View Steam Profile
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {/* Admin Panel Button - Only for ENTER user */}
                {profile?.username === 'ENTER' && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      className="border-[#8B5CF6]/30 text-[#8B5CF6] hover:bg-[#8B5CF6]/10"
                    >
                      <Shield className="w-5 h-5 mr-2" />
                      Admin Panel
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => setShowTradeUrl(true)}
                  variant="outline"
                  className="border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/10"
                >
                  <Link2 className="w-5 h-5 mr-2" />
                  Trade URL
                </Button>
                <Button
                  onClick={() => setShowSettings(true)}
                  variant="outline"
                  className="border-[#FF8C00]/30 text-[#FF8C00] hover:bg-[#FF8C00]/10"
                >
                  <Settings className="w-5 h-5 mr-2" />
                  Settings
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Trade URL Modal */}
      {showTradeUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="glass-steam p-8 rounded-3xl border border-[#22C55E]/30 w-full max-w-lg shadow-[0_0_50px_rgba(34,197,94,0.15)] relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#22C55E]/5 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#22C55E]/10 flex items-center justify-center border border-[#22C55E]/20">
                <Link2 className="w-6 h-6 text-[#22C55E]" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Connect Steam Trade</h3>
                <p className="text-sm text-gray-400">Required to send and receive skins</p>
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-sm font-semibold text-gray-300 mb-3 ml-1">Paste your Trade URL</label>
              <div className="relative">
                <Input
                  value={tradeUrl}
                  onChange={(e) => setTradeUrl(e.target.value.trim())}
                  onPaste={(e: any) => {
                    const text = e.clipboardData.getData('text');
                    const match = text.match(/https?:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+/);
                    if (match) {
                      e.preventDefault();
                      setTradeUrl(match[0]);
                      toast.success('✨ Link auto-detected!');
                    }
                  }}
                  placeholder="https://steamcommunity.com/tradeoffer/new/?partner=..."
                  className="bg-black/30 border-[#22C55E]/20 text-white placeholder:text-gray-600 h-14 rounded-xl px-4 text-sm font-mono focus:border-[#22C55E]/50 transition-all"
                />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-[#22C55E]/5 border border-[#22C55E]/10 flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#22C55E]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#22C55E] text-xs font-bold">?</span>
                </div>
                <div>
                  <p className="text-sm text-gray-300 mb-2">Don't know where to find it?</p>
                  <a
                    href="https://steamcommunity.com/id/me/tradeoffers/privacy#trade_offer_access_url"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#22C55E] hover:text-[#4ADE80] transition-colors uppercase tracking-wide"
                  >
                    Open Steam Settings <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
              <Button
                variant="ghost"
                onClick={() => setShowTradeUrl(false)}
                disabled={saving}
                className="text-gray-400 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!tradeUrl.match(/partner=\d+&token=/)) {
                    toast.error('That doesn\'t look like a valid Trade URL');
                    return;
                  }
                  setSaving(true);
                  try {
                    await apiClient.updateProfile({ tradeUrl });
                    toast.success('Trade URL saved successfully!');
                    setShowTradeUrl(false);
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to save');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving || !tradeUrl}
                className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] hover:from-[#4ADE80] hover:to-[#22C55E] text-white shadow-lg shadow-green-500/20"
              >
                {saving ? 'Saving...' : 'Save URL'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-steam p-8 rounded-3xl border border-[#FF8C00]/20 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-2xl font-bold text-white mb-6">Site Settings</h3>

            {/* Theme Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-400 mb-3">Theme</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${theme === 'dark'
                    ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                    }`}
                >
                  <Moon className="w-4 h-4" />
                  Dark
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${theme === 'light'
                    ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-white/10'
                    }`}
                >
                  <Sun className="w-4 h-4" />
                  Light
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Choose your preferred color scheme
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-white"
              >
                Close
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Statistics Section */}
      {profile && (
        <div className="container mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {[
              { label: 'Wallet Balance', value: `$${Number(profile.balance || 0).toFixed(2)}`, icon: '💰', color: '#22C55E' },
              { label: 'Total Trades', value: '12', icon: '🔄', color: '#FF8C00' },
              { label: 'Items Sold', value: '8', icon: '📦', color: '#8B5CF6' },
              { label: 'Items Bought', value: '4', icon: '🛒', color: '#3B82F6' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ y: -4 }}
                className="glass-steam rounded-2xl p-5 border border-[#FF8C00]/10 hover:border-[#FF8C00]/30 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{stat.icon}</span>
                  <span className="text-sm text-gray-400">{stat.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Inventory Section */}
      <div className="container mx-auto px-6 pb-12">
        {/* Game Tabs */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white">Your Inventory</h2>
          <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-[#FF8C00]/10">
            <button
              onClick={() => setSelectedGame('cs2')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${selectedGame === 'cs2'
                ? 'bg-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Gamepad2 className="w-4 h-4" />
              CS2
            </button>
            <button
              onClick={() => setSelectedGame('dota')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${selectedGame === 'dota'
                ? 'bg-[#8B5CF6] text-white shadow-lg shadow-[#8B5CF6]/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
            >
              <Gamepad2 className="w-4 h-4" />
              Dota 2
            </button>
          </div>
        </div>

        {/* Inventory Grid */}
        {inventory.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 glass-steam rounded-3xl border border-[#FF8C00]/10"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-[#FF8C00]/10 flex items-center justify-center">
              <Package className="w-10 h-10 text-[#FF8C00]/50" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No items found</h3>
            <p className="text-gray-400 max-w-sm mx-auto">
              This inventory appears to be empty or set to private.
            </p>
          </motion.div>
        ) : (
          <>
            <p className="text-gray-400 mb-6">Showing {inventory.length} items</p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {inventory.map((item, index) => {
                // Build proper Steam image URL
                const getImageUrl = (iconUrl?: string) => {
                  if (!iconUrl) return '';
                  if (iconUrl.startsWith('http')) return iconUrl;
                  return `https://steamcommunity-a.akamaihd.net/economy/image/${iconUrl}/360fx360f`;
                };
                const imageUrl = getImageUrl(item.icon_url_large || item.icon_url);

                return (
                  <motion.div
                    key={item.id || `item-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.02, 0.5) }}
                    className="glass-steam rounded-2xl border border-[#FF8C00]/10 hover:border-[#FF8C00]/30 overflow-hidden transition-all hover:-translate-y-1 group"
                  >
                    <div className="aspect-square relative bg-gradient-to-br from-white/5 to-transparent flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform p-3"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      {!item.tradable && (
                        <div className="absolute top-2 right-2 bg-[#EF4444] text-white text-xs px-2 py-0.5 rounded-lg font-medium">
                          Locked
                        </div>
                      )}
                    </div>

                    <div className="p-3">
                      <h3 className="font-medium text-white text-sm truncate mb-2">
                        {item.name}
                      </h3>
                      {item.tradable && (
                        <Link href="/sell">
                          <button className="w-full text-xs bg-[#FF8C00] hover:bg-[#FFA500] text-white px-3 py-1.5 rounded-lg font-semibold transition-colors">
                            Sell
                          </button>
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
