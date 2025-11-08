import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ShoppingCart, User, TrendingUp, Shield, Zap, ArrowRight, Star, Flame, Award, Heart } from 'lucide-react';
import { useAuthStore } from './store/authStore';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { marketplaceService, steamService } from './services/api';

// Import pages
import Marketplace from './pages/Marketplace';
import Favorites from './pages/Favorites';
import Analytics from './pages/Analytics';

// Import theme components
import { ThemeProvider } from './contexts/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import LanguageSelector from './components/LanguageSelector';

function Header() {
  const { user, isAuthenticated, login, logout } = useAuthStore();
  const { t } = useTranslation();

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
              <span className="relative z-10">{t('nav.home')}</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/marketplace" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">{t('nav.marketplace')}</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-pink-500 to-violet-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/favorites" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold flex items-center gap-2">
              <Heart className="w-5 h-5" />
              <span className="relative z-10">{t('nav.favorites')}</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-violet-500 to-orange-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-violet-500/20 to-orange-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/inventory" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">{t('nav.inventory')}</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-orange-500/20 to-pink-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
            <Link to="/analytics" className="text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 relative group font-semibold">
              <span className="relative z-10">{t('nav.analytics')}</span>
              <div className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 group-hover:w-full transition-all duration-500"></div>
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/20 to-violet-500/20 rounded-xl opacity-0 group-hover:opacity-100 blur-xl transition-all duration-500"></div>
            </Link>
          </nav>

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
              >
                <span className="relative z-10 flex items-center">
                  <User className="w-5 h-5 mr-2 animate-pulse" />
                  {t('nav.logout')} {user?.username}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <LanguageSelector />
              <ThemeToggle />
              <button
                onClick={handleLogin}
                className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white px-8 py-4 rounded-2xl font-bold transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
              >
                <span className="relative z-10 flex items-center">
                  <User className="w-5 h-5 mr-2 animate-pulse" />
                  {t('nav.connectSteam')}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Home() {
  const { isAuthenticated, login } = useAuthStore();
  const { t } = useTranslation();
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
    <div className="min-h-screen bg-gradient-to-br dark:from-indigo-950 dark:via-purple-950 dark:to-slate-900 light:from-gray-50 light:via-blue-50 light:to-indigo-50 relative overflow-hidden transition-colors duration-300">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-40">
          <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br dark:from-orange-500/30 dark:to-pink-500/30 light:from-orange-300/20 light:to-pink-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-32 w-80 h-80 bg-gradient-to-br dark:from-violet-500/30 dark:to-blue-500/30 light:from-violet-300/20 light:to-blue-300/20 rounded-full blur-3xl animate-pulse delay-500"></div>
          <div className="absolute bottom-32 left-1/3 w-72 h-72 bg-gradient-to-br dark:from-pink-500/30 dark:to-orange-500/30 light:from-pink-300/20 light:to-orange-300/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br dark:from-blue-500/30 dark:to-violet-500/30 light:from-blue-300/20 light:to-violet-300/20 rounded-full blur-3xl animate-pulse delay-1500"></div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br dark:from-orange-500/10 dark:via-pink-500/10 dark:to-violet-500/10 light:from-orange-300/5 light:via-pink-300/5 light:to-violet-300/5 rounded-full blur-3xl animate-spin" style={{ animationDuration: '60s' }}></div>
      </div>

      <div className="relative z-10 pt-32 pb-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <div className="inline-block mb-8 px-6 py-2 rounded-full bg-gradient-to-r dark:from-orange-500/30 dark:via-pink-500/30 dark:to-violet-500/30 light:from-orange-400/20 light:via-pink-400/20 light:to-violet-400/20 border dark:border-white/20 light:border-black/10 backdrop-blur-xl shadow-2xl transition-colors duration-300">
              <span className="text-sm font-bold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <Flame className="w-4 h-4 mr-2 text-orange-500" />
                {t('home.hero.subtitle')}
                <Star className="w-4 h-4 ml-2 text-pink-500" />
              </span>
            </div>

            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
              <span className="block dark:bg-gradient-to-r dark:from-white dark:via-orange-200 dark:to-white light:bg-gradient-to-r light:from-gray-800 light:via-gray-700 light:to-gray-800 bg-clip-text text-transparent drop-shadow-2xl animate-pulse transition-colors duration-300">
                {t('home.hero.title')}
              </span>
            </h1>

            <p className="text-xl md:text-2xl dark:text-gray-300 light:text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed font-medium transition-colors duration-300">
              {t('home.hero.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {isAuthenticated ? (
                <button
                  onClick={handleGoToMarketplace}
                  className="group relative overflow-hidden bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-black py-5 px-10 rounded-2xl text-xl transition-all duration-500 transform hover:scale-110 hover:shadow-2xl hover:shadow-pink-500/50 before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/20 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                >
                  <span className="relative z-10 flex items-center">
                    <span className="mr-3 text-2xl">🚀</span>
                    {t('home.hero.goToMarketplace')}
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
                    {t('home.hero.startTrading')}
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
                  {t('home.hero.viewStats')}
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
                <p className="text-gray-300 text-xl font-semibold mb-4">{t('home.stats.title')}</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">↗ +23.5% {t('home.stats.growth')}</span>
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
                <p className="text-gray-300 text-xl font-semibold mb-4">{t('home.stats.traders')}</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">↗ +342 {t('home.stats.newToday')}</span>
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
                <p className="text-gray-300 text-xl font-semibold mb-4">{t('home.stats.tradeTime')}</p>
                <div className="flex items-center text-green-400 bg-green-500/10 px-4 py-2 rounded-full border border-green-500/30">
                  <span className="text-sm font-bold">⚡ {t('home.stats.lightningFast')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Features */}
          <div className="mt-40">
            <h2 className="text-5xl md:text-7xl font-black text-center mb-20">
              <span className="bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
                {t('home.features.title')}
              </span>
            </h2>

            <div className="grid md:grid-cols-3 gap-10">
              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-orange-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-500/10 before:to-pink-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">🔒</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-orange-300 to-pink-300 bg-clip-text text-transparent">{t('home.features.escrow.title')}</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  {t('home.features.escrow.description')}
                </p>
              </div>

              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-500/10 before:to-violet-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">⚡</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-pink-300 to-violet-300 bg-clip-text text-transparent">{t('home.features.instant.title')}</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  {t('home.features.instant.description')}
                </p>
              </div>

              <div className="group backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-3xl p-10 hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-violet-500/20 before:absolute before:inset-0 before:bg-gradient-to-br before:from-violet-500/10 before:to-orange-500/10 before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500">
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-violet-400 to-orange-500 rounded-full blur-2xl opacity-30 group-hover:opacity-60 transition-opacity duration-500"></div>
                <div className="text-7xl mb-8 group-hover:scale-110 transition-transform duration-500">🌍</div>
                <h3 className="text-3xl font-bold text-white mb-6 bg-gradient-to-r from-violet-300 to-orange-300 bg-clip-text text-transparent">{t('home.features.global.title')}</h3>
                <p className="text-gray-300 text-xl leading-relaxed font-medium">
                  {t('home.features.global.description')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AuthError() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const message = new URLSearchParams(window.location.search).get('message') || t('auth.failed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 pt-32 flex items-center justify-center">
      <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-3xl p-12 text-center max-w-lg">
        <div className="text-6xl mb-6">❌</div>
        <h1 className="text-4xl font-black text-white mb-4">{t('auth.error')}</h1>
        <p className="text-gray-300 text-xl mb-8">{message}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105"
        >
          {t('auth.backToHome')}
        </button>
      </div>
    </div>
  );
}

function Inventory() {
  const [activeInventoryTab, setActiveInventoryTab] = useState('user');
  const [activeGameTab, setActiveGameTab] = useState('cs2');
  const { user } = useAuthStore();

  // NEW: User inventory with diagnostics
  const { data: userCs2Inventory, isLoading: userCs2Loading, refetch: refetchUserCs2 } = useQuery({
    queryKey: ['user-inventory-diagnostic', 'cs2'],
    queryFn: () => steamService.getUserInventoryWithDiagnostics('cs2'),
    enabled: !!localStorage.getItem('token'),
  });

  const { data: userDota2Inventory, isLoading: userDota2Loading, refetch: refetchUserDota2 } = useQuery({
    queryKey: ['user-inventory-diagnostic', 'dota2'],
    queryFn: () => steamService.getUserInventoryWithDiagnostics('dota2'),
    enabled: !!localStorage.getItem('token'),
  });

  const { data: botCs2Inventory, isLoading: botCs2Loading, refetch: refetchBotCs2 } = useQuery({
    queryKey: ['bot-inventory', 'cs2'],
    queryFn: () => steamService.getBotInventory('cs2'),
    enabled: !!localStorage.getItem('token'),
  });

  const { data: botDota2Inventory, isLoading: botDota2Loading, refetch: refetchBotDota2 } = useQuery({
    queryKey: ['bot-inventory', 'dota2'],
    queryFn: () => steamService.getBotInventory('dota2'),
    enabled: !!localStorage.getItem('token'),
  });

  const getCurrentInventory = () => {
    if (activeInventoryTab === 'user') {
      return activeGameTab === 'cs2' ? userCs2Inventory : userDota2Inventory;
    } else {
      return activeGameTab === 'cs2' ? botCs2Inventory : botDota2Inventory;
    }
  };

  const getCurrentLoading = () => {
    if (activeInventoryTab === 'user') {
      return activeGameTab === 'cs2' ? userCs2Loading : userDota2Loading;
    } else {
      return activeGameTab === 'cs2' ? botCs2Loading : botDota2Loading;
    }
  };

  const getCurrentDiagnostics = () => {
    const inventory = getCurrentInventory();
    if (activeInventoryTab === 'user' && inventory && inventory.diagnostics) {
      return inventory.diagnostics;
    }
    return null;
  };

  // NEW: Render User Inventory with diagnostics
  const renderUserInventory = (inventory, isLoading, diagnostics) => {
    const gameName = activeGameTab === 'cs2' ? 'CS2' : 'Dota 2';

    if (isLoading) {
      return (
        <div className="text-center text-white text-2xl py-20">
          🔍 Loading {gameName} inventory diagnostics...
        </div>
      );
    }

    if (inventory && inventory.success && inventory.items && inventory.items.length > 0) {
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {inventory.items.map((item) => (
            <div
              key={item.assetId}
              className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/30 cursor-pointer p-4"
            >
              <div className="relative aspect-square flex items-center justify-center mb-3">
                {item.iconUrl ? (
                  <img
                    src={item.iconUrl}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-125 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center text-2xl">
                    🎮
                  </div>
                )}
              </div>
              <h3 className="text-white text-sm font-semibold truncate mb-2">
                {item.marketName || item.name}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {item.tradable && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    Tradable
                  </span>
                )}
                {item.marketable && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                    Marketable
                  </span>
                )}
                {item.rarity && (
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                    {typeof item.rarity === 'string' ? item.rarity : item.rarity?.name || 'Unknown'}
                  </span>
                )}
                {item.exterior && (
                  <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                    {typeof item.exterior === 'string' ? item.exterior : item.exterior?.name || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // NEW: Handle empty inventory (success but no items)
    if (inventory && inventory.success && inventory.empty) {
      return (
        <div className="space-y-6">
          <div className="backdrop-blur-2xl bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 border border-white/20 rounded-3xl p-12 text-center">
            <div className="text-8xl mb-6">✅</div>
            <h3 className="text-4xl font-black text-white mb-4">
              Инвентарь успешно загружен!
            </h3>
            <p className="text-2xl text-gray-300 mb-6">
              Ваш {gameName} инвентарь пуст или не содержит торгуемых предметов
            </p>
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl p-6">
              <p className="text-blue-200 text-lg mb-4">
                💡 Для получения предметов:
              </p>
              <ul className="text-gray-200 text-lg space-y-2">
                <li>• Откройте кейсы в {gameName}</li>
                <li>• Получите предметы в матчах</li>
                <li>• Купите предметы на торговой площадке Steam</li>
              </ul>
            </div>
          </div>

          <div className="backdrop-blur-2xl bg-gradient-to-r from-orange-500/20 via-pink-500/20 to-violet-500/20 border border-white/20 rounded-3xl p-8">
            <h3 className="text-3xl font-bold text-white mb-4 flex items-center">
              <span className="text-4xl mr-4">🤖</span>
              Или попробуйте инвентарь бота
            </h3>
            <p className="text-gray-200 text-lg mb-4">
              В инвентаре бота всегда есть предметы для тестирования системы торговли
            </p>
            <button
              onClick={() => setActiveInventoryTab('bot')}
              className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              Перейти к инвентарю бота →
            </button>
          </div>
        </div>
      );
    }

    // Show diagnostics instead of empty state
    return (
      <div className="space-y-6">
        {/* User Profile Section */}
        {inventory && inventory.userProfile && (
          <div className="backdrop-blur-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-white/20 rounded-3xl p-8">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
              <span className="text-4xl mr-4">👤</span>
              Ваш профиль Steam
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-gray-300 text-lg mb-2">
                  <span className="text-blue-400 font-bold">SteamID:</span> {inventory.userProfile.steamId}
                </p>
                <p className="text-gray-300 text-lg mb-2">
                  <span className="text-blue-400 font-bold">Username:</span> {inventory.userProfile.username}
                </p>
                <p className="text-gray-300 text-lg mb-2">
                  <span className="text-blue-400 font-bold">Статус:</span>{' '}
                  <span className={inventory.userProfile.isPublic ? 'text-green-400' : 'text-red-400'}>
                    {inventory.userProfile.isPublic ? 'Публичный' : 'Приватный'}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-lg mb-2">
                  <span className="text-purple-400 font-bold">CS2:</span>{' '}
                  <span className={inventory.gameOwnership?.cs2?.isOwner ? 'text-green-400' : 'text-red-400'}>
                    {inventory.gameOwnership?.cs2?.isOwner ? '✅ Владеет' : '❌ Не владеет'}
                  </span>
                </p>
                <p className="text-gray-300 text-lg mb-2">
                  <span className="text-purple-400 font-bold">Dota 2:</span>{' '}
                  <span className={inventory.gameOwnership?.dota2?.isOwner ? 'text-green-400' : 'text-red-400'}>
                    {inventory.gameOwnership?.dota2?.isOwner ? '✅ Владеет' : '❌ Не владеет'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Diagnostic Results */}
        {diagnostics && (
          <div className="backdrop-blur-2xl bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 border border-white/20 rounded-3xl p-8">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
              <span className="text-4xl mr-4">🔍</span>
              Диагностика инвентаря
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                <span className="text-gray-300 text-lg">Профиль загружен:</span>
                <span className={diagnostics.profileLoaded ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.profileLoaded ? '✅ Да' : '❌ Нет'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                <span className="text-gray-300 text-lg">Проверено владение игрой:</span>
                <span className={diagnostics.ownershipChecked ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.ownershipChecked ? '✅ Да' : '❌ Нет'}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl">
                <span className="text-gray-300 text-lg">Инвентарь загружен:</span>
                <span className={diagnostics.inventoryLoaded ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.inventoryLoaded ? '✅ Да' : '❌ Нет'}
                </span>
              </div>
              <div className="p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-200 text-lg font-bold mb-2">💡 Причина:</p>
                <p className="text-gray-200">{diagnostics.reason}</p>
              </div>
              {diagnostics.needsOAuth && (
                <div className="p-4 bg-blue-500/20 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-200 text-lg font-bold mb-2">🔑 Для полной загрузки инвентаря:</p>
                  <ul className="text-gray-200 list-disc list-inside space-y-2">
                    <li>Интегрировать Steam OAuth 2.0 (требует STEAM_API_SECRET)</li>
                    <li>Или сделать инвентарь публичным в настройках Steam</li>
                  </ul>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                if (activeGameTab === 'cs2') {
                  refetchUserCs2();
                } else {
                  refetchUserDota2();
                }
              }}
              className="mt-6 bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105"
            >
              🔄 Повторить попытку
            </button>
          </div>
        )}

        {/* Steam Privacy Guide */}
        <div className="backdrop-blur-2xl bg-gradient-to-r from-gray-500/20 via-gray-600/20 to-gray-700/20 border border-white/20 rounded-3xl p-8">
          <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="text-4xl mr-4">📖</span>
            Инструкция по настройке
          </h3>
          <div className="space-y-4 text-gray-200">
            <p className="text-lg">
              <span className="text-yellow-400 font-bold">Шаг 1:</span> Откройте Steam → Account Details → Privacy Settings
            </p>
            <p className="text-lg">
              <span className="text-yellow-400 font-bold">Шаг 2:</span> Установите "Inventory" = <span className="text-green-400 font-bold">Public</span>
            </p>
            <p className="text-lg">
              <span className="text-yellow-400 font-bold">Шаг 3:</span> Сохраните изменения
            </p>
            <p className="text-lg">
              <span className="text-yellow-400 font-bold">Шаг 4:</span> Нажмите "Повторить попытку" выше
            </p>
            <p className="text-sm text-gray-400 mt-4">
              💡 Альтернативно: используйте вкладку "Bot Inventory" - там всегда есть предметы для тестирования
            </p>
          </div>
        </div>
      </div>
    );
  };

  const renderBotInventory = (inventory, isLoading, diagnostics = null) => {
    const gameName = activeGameTab === 'cs2' ? 'CS2' : 'Dota 2';

    if (isLoading) {
      return (
        <div className="text-center text-white text-2xl py-20">
          🤖 Loading {gameName} bot inventory...
        </div>
      );
    }

    if (!inventory || inventory.length === 0) {
      return (
        <div className="text-center text-gray-400 text-xl py-20">
          No items in bot's {gameName} inventory
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Bot Info */}
        <div className="backdrop-blur-2xl bg-gradient-to-r from-green-500/20 via-blue-500/20 to-purple-500/20 border border-white/20 rounded-3xl p-8">
          <h3 className="text-3xl font-bold text-white mb-6 flex items-center">
            <span className="text-4xl mr-4">🤖</span>
            Инвентарь бота (Sgovt1)
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/20 rounded-xl">
              <p className="text-gray-300 text-lg">Статус:</p>
              <p className="text-green-400 font-bold text-xl">🟢 Онлайн</p>
            </div>
            <div className="p-4 bg-black/20 rounded-xl">
              <p className="text-gray-300 text-lg">Предметов:</p>
              <p className="text-blue-400 font-bold text-xl">{inventory.length}</p>
            </div>
            <div className="p-4 bg-black/20 rounded-xl">
              <p className="text-gray-300 text-lg">Готов к trade:</p>
              <p className="text-green-400 font-bold text-xl">✅ Да</p>
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {inventory.map((item) => (
            <div
              key={item.assetId}
              className="group relative overflow-hidden backdrop-blur-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20 rounded-2xl hover:scale-110 transition-all duration-700 hover:shadow-2xl hover:shadow-pink-500/30 cursor-pointer p-4"
            >
              <div className="relative aspect-square flex items-center justify-center mb-3">
                {item.iconUrl ? (
                  <img
                    src={item.iconUrl}
                    alt={item.name}
                    className="max-w-full max-h-full object-contain group-hover:scale-125 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-16 h-16 bg-gray-600 rounded flex items-center justify-center text-2xl">
                    🎮
                  </div>
                )}
              </div>
              <h3 className="text-white text-sm font-semibold truncate mb-2">
                {item.marketName || item.name}
              </h3>
              <div className="flex gap-2 flex-wrap">
                {item.tradable && (
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">
                    Tradable
                  </span>
                )}
                {item.marketable && (
                  <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">
                    Marketable
                  </span>
                )}
                {item.rarity && (
                  <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">
                    {typeof item.rarity === 'string' ? item.rarity : item.rarity?.name || 'Unknown'}
                  </span>
                )}
                {item.exterior && (
                  <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                    {typeof item.exterior === 'string' ? item.exterior : item.exterior?.name || 'Unknown'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderInventory = (inventory, isLoading, diagnostics = null) => {
    if (activeInventoryTab === 'user') {
      return renderUserInventory(inventory, isLoading, diagnostics);
    } else {
      return renderBotInventory(inventory, isLoading, diagnostics);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 relative overflow-hidden pt-32">
      <div className="absolute inset-0 overflow-hidden opacity-40">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-gradient-to-br from-orange-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gradient-to-br from-violet-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-black mb-8">
            <span className="bg-gradient-to-r from-white via-orange-200 to-white bg-clip-text text-transparent drop-shadow-2xl">
              INVENTORY
            </span>
          </h1>
          <p className="text-2xl text-gray-300 font-semibold">Your Steam CS2 inventory</p>
        </div>

        {/* Tabs */}
        <div className="space-y-6 mb-12">
          {/* Inventory Type Tabs */}
          <div className="flex justify-center">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-2 flex gap-2">
              <button
                onClick={() => setActiveInventoryTab('user')}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  activeInventoryTab === 'user'
                    ? 'bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 text-white shadow-2xl'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                My Inventory
              </button>
              <button
                onClick={() => setActiveInventoryTab('bot')}
                className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 ${
                  activeInventoryTab === 'bot'
                    ? 'bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 text-white shadow-2xl'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                Bot Inventory
              </button>
            </div>
          </div>

          {/* Game Tabs */}
          <div className="flex justify-center">
            <div className="backdrop-blur-2xl bg-white/10 border border-white/20 rounded-2xl p-2 flex gap-2">
              <button
                onClick={() => setActiveGameTab('cs2')}
                className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-2 ${
                  activeGameTab === 'cs2'
                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">🔫</span>
                CS2
              </button>
              <button
                onClick={() => setActiveGameTab('dota2')}
                className={`px-8 py-3 rounded-xl font-bold text-lg transition-all duration-300 flex items-center gap-2 ${
                  activeGameTab === 'dota2'
                    ? 'bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 text-white shadow-2xl'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="text-2xl">⚔️</span>
                Dota 2
              </button>
            </div>
          </div>
        </div>

        {/* Inventory Display */}
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8">
          {renderInventory(getCurrentInventory(), getCurrentLoading(), getCurrentDiagnostics())}
        </div>

        {/* Error Notice */}
        {getCurrentInventory() && getCurrentInventory().error && (
          <div className="mt-8 backdrop-blur-2xl bg-gradient-to-r from-red-500/20 via-orange-500/20 to-red-500/20 border border-red-500/30 rounded-3xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">🔒</div>
              <div>
                <h3 className="text-2xl font-bold text-red-300 mb-2">Приватный инвентарь</h3>
                <p className="text-gray-200 text-lg leading-relaxed mb-4">
                  Ваш Steam инвентарь приватный. Для загрузки через Steam API нужно:
                </p>
                <ul className="text-gray-200 text-lg leading-relaxed mb-4 list-disc list-inside">
                  <li>Открыть Steam → Account Details → Privacy Settings</li>
                  <li>Установить "Inventory" = <span className="text-green-400 font-bold">Public</span></li>
                  <li>Сохранить изменения</li>
                </ul>
                <p className="text-gray-300 text-base">
                  💡 <strong>Альтернатива:</strong> Используйте вкладку "Bot Inventory" - там есть 1 предмет (AUG | Sweeper)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Test Trade Button */}
        <div className="text-center mt-12">
          <button
            onClick={async () => {
              try {
                const result = await steamService.testTrade({
                  action: 'test',
                  message: 'Testing trade system',
                });
                alert('Trade test initiated! Check console for details.');
                console.log('Trade test result:', result);
              } catch (error) {
                alert('Trade test failed: ' + error.message);
              }
            }}
            className="bg-gradient-to-r from-orange-600 via-pink-600 to-violet-600 hover:from-orange-500 hover:via-pink-500 hover:to-violet-500 text-white font-bold py-4 px-8 rounded-2xl text-xl transition-all duration-500 transform hover:scale-110 shadow-2xl"
          >
            Test Trade System
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const { fetchCurrentUser } = useAuthStore();

  useEffect(() => {
    // Check for token in URL after Steam OAuth
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('token', token);
      console.log('Token saved from URL');

      // Remove token from URL
      window.history.replaceState({}, document.title, '/');

      // Fetch current user
      fetchCurrentUser();
    } else if (localStorage.getItem('token')) {
      console.log('Token found in localStorage, checking auth');
      // Check if user is authenticated with existing token
      fetchCurrentUser();
    }
  }, [fetchCurrentUser]);

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen transition-colors duration-300">
          <Header />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/auth/error" element={<AuthError />} />
          </Routes>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
