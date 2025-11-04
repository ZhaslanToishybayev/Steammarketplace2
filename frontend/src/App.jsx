import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, User, TrendingUp, Shield, Zap, ArrowRight, Star, Flame, Award } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

function Header() {
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const handleLogin = async () => {
    await login();
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="fixed top-0 w-full z-50 backdrop-blur-2xl bg-gradient-to-r from-indigo-950/80 via-purple-950/80 to-indigo-950/80 border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-pink-500 to-violet-500 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 group-hover:blur-2xl transition-all duration-500 animate-pulse"></div>
              <ShoppingCart className="relative w-12 h-12 text-white bg-gradient-to-br from-orange-500 via-pink-500 to-violet-500 p-3 rounded-2xl shadow-2xl group-hover:rotate-12 transition-transform duration-500" />
            </div>
            <span className="text-3xl font-black bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent drop-shadow-lg">
              CS2 ELITE
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">Home</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/marketplace" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">Marketplace</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-violet-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/inventory" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">Inventory</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-orange-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/20 to-orange-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
          </nav>

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
            >
              <span className="relative z-10 flex items-center">
                <User className="w-5 h-5 mr-2 animate-pulse" />
                Logout {user?.username}
              </span>
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
            >
              <span className="relative z-10 flex items-center">
                <User className="w-5 h-5 mr-2 animate-pulse" />
                Connect Steam
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function Home() {
  const { isAuthenticated, login } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/marketplace');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    await login();
  };

  const handleGoToMarketplace = () => {
    navigate('/marketplace');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-40">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-orange-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-32 w-80 h-80 bg-gradient-to-br from-violet-500/30 to-blue-500/30 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-gradient-to-br from-pink-500/30 to-orange-500/30 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br from-blue-500/30 to-violet-500/30 rounded-full blur-3xl animate-pulse delay-1500"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/10 via-pink-500/10 to-violet-500/10 rounded-full blur-3xl animate-spin" style={{ animationDuration: '60s' }}></div>
      </div>

      <div className="relative z-10 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-block mb-8 px-6 py-2 rounded-full bg-gradient-to-r from-orange-500/30 via-pink-500/30 to-violet-500/30 border border-white/20 backdrop-blur-xl shadow-2xl">
              <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Flame className="w-4 h-4 mr-2 text-orange-500" />
                Next-Gen CS2 Trading Platform
                <Star className="w-4 h-4 ml-2 text-pink-500" />
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
              <span className="block bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl animate-pulse">
                TRADE CS2
              </span>
              <span className="block bg-gradient-to-r from-orange-400 via-pink-500 to-violet-500 bg-clip-text text-transparent drop-shadow-2xl mt-2">
                SKINS
              </span>
              <span className="block text-4xl md:text-5xl bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent mt-4 font-bold">
                INSTANTLY
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
              The <span className="text-orange-400 font-bold relative inline-block"><span className="relative z-10">fastest</span><div className="absolute -inset-1 bg-orange-500/20 blur-sm rounded"></div></span>, <span className="text-pink-400 font-bold relative inline-block"><span className="relative z-10">secure</span><div className="absolute -inset-1 bg-pink-500/20 blur-sm rounded"></div></span> and <span className="text-violet-400 font-bold relative inline-block"><span className="relative z-10">modern</span><div className="absolute -inset-1 bg-violet-500/20 blur-sm rounded"></div></span> marketplace for CS2 skins. Trade with confidence using our advanced automation.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {isAuthenticated ? (
                <button
                  onClick={handleGoToMarketplace}
                  className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-black py-5 px-10 rounded-2xl text-xl transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                >
                  <span className="relative z-10 flex items-center">
                    <span className="mr-3 text-2xl">🚀</span>
                    GO TO MARKETPLACE
                    <ArrowRight className="w-7 h-7 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </button>
              ) : (
                <button
                  onClick={handleLogin}
                  className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-black py-5 px-10 rounded-2xl text-xl transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                >
                  <span className="relative z-10 flex items-center">
                    <span className="mr-3 text-2xl">🚀</span>
                    START TRADING
                    <ArrowRight className="w-7 h-7 ml-3 group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                </button>
              )}

              <button
                onClick={handleGoToMarketplace}
                className="group relative overflow-hidden backdrop-blur-xl bg-white/10 hover:bg-white/20 text-white font-bold py-5 px-10 rounded-2xl text-xl border border-white/30 transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-white/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
              >
                <span className="relative z-10 flex items-center">
                  <span className="mr-3 text-2xl">📊</span>
                  VIEW STATS
                </span>
              </button>
            </div>
          </div>

          {/* Enhanced Stats Cards */}
          <div className="grid md:grid-cols-3 gap-8 mt-24">
            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-orange-500/20 via-pink-500/10 to-violet-500/20 border border-white/20 rounded-3xl p-8 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-orange-500/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-500/20 before:to-pink-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
              <div className="relative z-10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-orange-400 to-pink-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-pink-600 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-2xl">
                  <TrendingUp className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-5xl font-black text-white mb-3 bg-gradient-to-r from-orange-300 to-pink-300 bg-clip-text text-transparent">$2.5M+</h3>
                <p className="text-gray-300 text-xl font-semibold mb-4">Total Volume Traded</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">↗ +23.5% this month</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-pink-500/20 via-violet-500/10 to-orange-500/20 border border-white/20 rounded-3xl p-8 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-500/20 before:to-violet-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
              <div className="relative z-10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-400 to-violet-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-violet-600 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-2xl">
                  <Shield className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-5xl font-black text-white mb-3 bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">15,432</h3>
                <p className="text-gray-300 text-xl font-semibold mb-4">Active Traders</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">↗ +342 new today</span>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-violet-500/20 via-orange-500/10 to-pink-500/20 border border-white/20 rounded-3xl p-8 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-violet-500/30 before:absolute before:inset-0 before:bg-gradient-to-br before:from-violet-500/20 before:to-orange-500/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
              <div className="relative z-10">
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-400 to-orange-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-orange-600 rounded-3xl flex items-center justify-center mb-8 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-2xl">
                  <Zap className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-5xl font-black text-white mb-3 bg-gradient-to-r from-violet-300 to-orange-300 bg-clip-text text-transparent">&lt; 30s</h3>
                <p className="text-gray-300 text-xl font-semibold mb-4">Average Trade Time</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">⚡ Lightning fast</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Features */}
          <div className="mt-40">
            <h2 className="text-5xl md:text-7xl font-black text-center mb-20">
              <span className="bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
                WHY CHOOSE US?
              </span>
            </h2>

            <div className="grid md:grid-cols-3 gap-10">
              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-orange-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-500/10 before:to-pink-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">🔒</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-orange-300 to-pink-300 bg-clip-text text-transparent">Escrow Protection</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  Your trades are protected by our advanced escrow system. Your items and money are always safe with military-grade security.
                </p>
              </div>

              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-500/10 before:to-violet-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">⚡</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">Instant Delivery</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  Automated Steam trade offers deliver your skins instantly after purchase. No waiting, no hassle, just instant gratification.
                </p>
              </div>

              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-violet-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-violet-500/10 before:to-orange-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-violet-400 to-orange-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">🌍</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-violet-300 to-orange-300 bg-clip-text text-transparent">Global Market</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  Access to thousands of listings from players around the world. Best prices guaranteed with our price matching algorithm.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Marketplace() {
  const sampleListings = [
    { id: 1, name: 'AK-47 | Redline (Field-Tested)', price: 45.99, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/3563296/300x300', rarity: 'Classified', condition: 'Field-Tested' },
    { id: 2, name: 'AWP | Dragon Lore (Factory New)', price: 1250.00, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1691135/300x300', rarity: 'Covert', condition: 'Factory New' },
    { id: 3, name: 'M4A4 | Howl (Minimal Wear)', price: 3500.00, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1793950/300x300', rarity: 'Covert', condition: 'Minimal Wear' },
    { id: 4, name: 'USP-S | Kill Confirmed (Factory New)', price: 89.99, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1783243/300x300', rarity: 'Covert', condition: 'Factory New' },
    { id: 5, name: 'Glock | Fade (Factory New)', price: 120.50, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/38/300x300', rarity: 'Restricted', condition: 'Factory New' },
    { id: 6, name: 'AK-47 | Fire Serpent (Field-Tested)', price: 890.00, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/344/300x300', rarity: 'Covert', condition: 'Field-Tested' },
    { id: 7, name: 'AWP | Asiimov (Minimal Wear)', price: 185.00, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1691309/300x300', rarity: 'Covert', condition: 'Minimal Wear' },
    { id: 8, name: 'M4A1-S | Golden Coil (Field-Tested)', price: 234.50, image: 'https://community.cloudflare.steamstatic.com/economy/image/class/730/1794133/300x300', rarity: 'Covert', condition: 'Field-Tested' },
  ];

  const getRarityColor = (rarity) => {
    const colors = {
      'Consumer Grade': 'from-gray-400 to-gray-600',
      'Industrial Grade': 'from-blue-400 to-blue-600',
      'Mil-Spec Grade': 'from-blue-500 to-blue-700',
      'Restricted': 'from-purple-400 to-purple-600',
      'Classified': 'from-pink-500 to-pink-700',
      'Covert': 'from-red-500 to-red-700',
    };
    return colors[rarity] || 'from-gray-400 to-gray-600';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 relative overflow-hidden pt-32">
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>
        <div className="absolute top-0 left-0 w-full h-full" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-black mb-8">
            <span className="bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
              MARKETPLACE
            </span>
          </h1>
          <p className="text-2xl text-gray-300 font-semibold">Discover and trade the rarest CS2 skins</p>
        </div>

        {/* Enhanced Filters */}
        <div className="backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-8 mb-16 shadow-2xl">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search for skins..."
                className="w-full bg-black/40 border-2 border-white/20 rounded-2xl px-6 py-5 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 backdrop-blur-sm text-lg font-semibold"
              />
            </div>
            <select className="bg-black/40 border-2 border-white/20 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 backdrop-blur-sm text-lg font-semibold">
              <option>All Weapons</option>
              <option>AK-47</option>
              <option>AWP</option>
              <option>M4A4</option>
              <option>M4A1-S</option>
              <option>USP-S</option>
            </select>
            <select className="bg-black/40 border-2 border-white/20 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-500/20 transition-all duration-300 backdrop-blur-sm text-lg font-semibold">
              <option>All Rarities</option>
              <option>Classified</option>
              <option>Covert</option>
              <option>Restricted</option>
            </select>
            <button className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-bold px-10 py-5 rounded-2xl transition-all duration-500 transform hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50 text-lg font-bold">
              Search
            </button>
          </div>
        </div>

        {/* Enhanced Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
          {sampleListings.map((item) => (
            <div key={item.id} className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/30 cursor-pointer before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-500/10 before:to-orange-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-500/20 to-orange-500/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative aspect-square bg-gradient-to-br from-gray-800/60 to-gray-900/60 flex items-center justify-center p-8 group-hover:from-gray-700/60 group-hover:to-gray-800/60 transition-all duration-500">
                <img src={item.image} alt={item.name} className="max-w-full max-h-full object-contain group-hover:scale-125 transition-transform duration-700 drop-shadow-2xl" />

                <div className={`absolute top-5 left-5 px-4 py-2 rounded-xl bg-gradient-to-r ${getRarityColor(item.rarity)} text-white text-sm font-bold shadow-xl backdrop-blur-sm border border-white/20`}>
                  {item.rarity}
                </div>

                <div className="absolute top-5 right-5 px-4 py-2 rounded-xl bg-black/60 text-white text-sm font-bold backdrop-blur-sm border border-white/20">
                  {item.condition}
                </div>
              </div>

              <div className="relative p-8">
                <h3 className="text-white font-bold text-xl mb-4 line-clamp-2 group-hover:text-pink-300 transition-colors duration-300 font-semibold">
                  {item.name}
                </h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-4xl font-black bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                      ${item.price}
                    </span>
                  </div>
                  <span className="text-sm text-green-400 font-bold px-4 py-2 bg-green-500/20 rounded-full border-2 border-green-500/30 animate-pulse">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/inventory" element={<div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 pt-32 text-white text-center text-4xl font-bold flex items-center justify-center">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-12">
              <div className="text-8xl mb-6">🚀</div>
              <div className="bg-gradient-to-r from-orange-400 via-pink-400 to-violet-400 bg-clip-text text-transparent">
                Inventory page coming soon...
              </div>
            </div>
          </div>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
