'use client';

import { useState, useEffect } from 'react';
import {
  Bars3Icon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  CubeIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  ScaleIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  UserIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Tooltip } from '@/components/shared/Tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications, useUnreadCount } from '@/stores/notificationStore';
import { useTradeCart } from '@/stores/tradeStore';
import { formatCurrency } from '@/utils/formatters';

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const notifications = useNotifications();
  const unreadCount = useUnreadCount();
  const { selectedItems } = useTradeCart();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const navigation = [
    { name: 'Marketplace', href: '/market', icon: ShoppingBagIcon },
    { name: 'Inventory', href: '/inventory', icon: CubeIcon, protected: true },
    { name: 'Trade', href: '/trade', icon: ScaleIcon, protected: true },
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, protected: true },
  ];

  const quickActions = [
    { name: 'Create Trade', href: '/trade/create', icon: SparklesIcon, variant: 'primary' },
    { name: 'Sync Inventory', href: '/inventory/sync', icon: CreditCardIcon, variant: 'secondary' },
  ];

  const adminNavigation = [
    { name: 'Admin', href: '/admin', icon: Cog6ToothIcon, admin: true },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      // Add to recent searches
      setRecentSearches(prev => {
        const newSearches = [query, ...prev.filter(s => s !== query)].slice(0, 5);
        localStorage.setItem('recentSearches', JSON.stringify(newSearches));
        return newSearches;
      });
      // Navigate to search results
      window.location.href = `/market?search=${encodeURIComponent(query)}`;
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const userMenuItems = [
    {
      label: 'Profile',
      icon: UserIcon,
      onClick: () => window.location.href = '/profile',
    },
    {
      label: 'Settings',
      icon: Cog6ToothIcon,
      onClick: () => window.location.href = '/profile/settings',
    },
    {
      label: 'Notifications',
      icon: BellIcon,
      onClick: () => window.location.href = '/dashboard#notifications',
    },
    {
      label: 'Logout',
      icon: CreditCardIcon,
      onClick: handleLogout,
      className: 'text-red-600 hover:bg-red-50',
    },
  ];

  // Handle scroll behavior
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load recent searches from localStorage
  useEffect(() => {
    const savedSearches = localStorage.getItem('recentSearches');
    if (savedSearches) {
      try {
        setRecentSearches(JSON.parse(savedSearches));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-50 backdrop-blur-lg border-b transition-all duration-300 ${
        isScrolled
          ? 'bg-gray-900/95 border-gray-700/50 py-2'
          : 'bg-gray-900/80 border-gray-700/30 py-3'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Main Navigation */}
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <span className="sr-only">Open main menu</span>
                {isMobileMenuOpen ? (
                  <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>

              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                  Steam<span className="text-white">Market</span>
                </span>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden md:ml-8 md:flex md:space-x-2">
                {navigation.map((item) => {
                  if (item.protected && !isAuthenticated) return null;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-gray-800/50 group"
                    >
                      <item.icon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-orange-500 transition-colors" />
                      {item.name}
                    </a>
                  );
                })}
                {isAuthenticated &&
                  adminNavigation.map((item) => {
                    if (user?.role !== 'admin') return null;
                    return (
                      <a
                        key={item.name}
                        href={item.href}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-all duration-200 hover:bg-gray-800/50 group"
                      >
                        <item.icon className="w-4 h-4 mr-2 text-gray-400 group-hover:text-red-500 transition-colors" />
                        {item.name}
                      </a>
                    );
                  })}
              </nav>
            </div>

            {/* Search Bar */}
            <div className="hidden lg:flex lg:items-center lg:space-x-4 flex-1 max-w-lg">
              <div className="relative w-full">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search items, games, collections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowSearch(true)}
                    onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                    className="block w-full bg-gray-800/50 border border-gray-600 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  />
                </form>

                {/* Search Suggestions */}
                {showSearch && searchQuery.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    <div className="p-3">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Recent Searches
                      </h3>
                      {recentSearches
                        .filter(search => search.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((search, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setSearchQuery(search);
                              handleSearch(search);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
                          >
                            <div className="flex items-center">
                              <MagnifyingGlassIcon className="w-4 h-4 mr-2 text-gray-400" />
                              {search}
                            </div>
                          </button>
                        ))}
                      {recentSearches.filter(search => search.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500 text-center">
                          No recent searches found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right side - Actions and User Menu */}
            <div className="flex items-center space-x-3">
              {/* Quick Actions */}
              <div className="hidden lg:flex lg:items-center lg:space-x-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.name}
                    variant={action.variant as any}
                    size="sm"
                    onClick={() => window.location.href = action.href}
                    className="text-xs font-medium"
                  >
                    <action.icon className="w-3 h-3 mr-1" />
                    {action.name}
                  </Button>
                ))}
              </div>

              {/* Authenticated User */}
              {isAuthenticated && user ? (
                <>
                  {/* Balance Display */}
                  <Tooltip content={`Available Balance: ${formatCurrency(user.balance || 0, 'USD')}`} placement="bottom">
                    <div className="hidden sm:flex items-center text-green-400 font-semibold cursor-help hover:text-green-300 transition-colors">
                      <CreditCardIcon className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">
                        {formatCurrency(user.balance || 0, 'USD')}
                      </span>
                    </div>
                  </Tooltip>

                  {/* Trade Cart Badge */}
                  {selectedItems.length > 0 && (
                    <div className="relative">
                      <Tooltip content={`${selectedItems.length} items in trade cart`} placement="bottom">
                        <button
                          className="p-2 text-gray-400 hover:text-white transition-colors"
                          onClick={() => window.location.href = '/trade'}
                        >
                          <ShoppingCartIcon className="w-5 h-5" />
                          <Badge
                            variant="error"
                            size="sm"
                            className="absolute -top-1 -right-1 animate-pulse"
                          >
                            {selectedItems.length}
                          </Badge>
                        </button>
                      </Tooltip>
                    </div>
                  )}

                  {/* Notifications */}
                  <div className="relative">
                    <Tooltip content="Notifications" placement="bottom">
                      <button className="p-2 text-gray-400 hover:text-white transition-colors">
                        <BellIcon className="w-5 h-5" />
                        {unreadCount > 0 && (
                          <Badge
                            variant="error"
                            size="sm"
                            className="absolute -top-1 -right-1"
                          >
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </Badge>
                        )}
                      </button>
                    </Tooltip>
                  </div>

                  {/* User Menu */}
                  <div className="relative group">
                    <Tooltip content={user.username} placement="bottom">
                      <button className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all">
                        <div className="flex items-center space-x-2">
                          <img
                            className="h-8 w-8 rounded-full border-2 border-gray-700/50"
                            src={user.avatar || '/api/placeholder/32/32'}
                            alt={user.username || 'User'}
                          />
                          <span className="hidden md:inline text-gray-300 hover:text-white text-sm font-medium">
                            {user.username}
                          </span>
                        </div>
                      </button>
                    </Tooltip>

                    {/* User Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-gray-800/95 backdrop-blur-xl ring-1 ring-black ring-opacity-5 border border-gray-700/50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 scale-95 group-hover:scale-100 z-50">
                      <div className="py-1">
                        {userMenuItems.map((item) => (
                          <button
                            key={item.label}
                            className={`flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50 cursor-pointer rounded-lg transition-all ${
                              item.className || ''
                            }`}
                            onClick={item.onClick}
                          >
                            <item.icon className="w-4 h-4 mr-3 text-gray-400" />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Guest Actions */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.href = '/auth/login'}
                    className="hidden sm:inline-flex"
                  >
                    <SparklesIcon className="w-4 h-4 mr-2" />
                    Sign in with Steam
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.location.href = '/auth/login'}
                    className="sm:hidden"
                  >
                    <SparklesIcon className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Mobile Search Bar */}
          {showSearch && (
            <div className="lg:hidden mt-4">
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search items, games, collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full bg-gray-800/50 border border-gray-600 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </form>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-700/30">
            <div className="pt-4 pb-3 space-y-1 bg-gray-900/50">
              {/* Search in mobile menu */}
              <div className="px-4 mb-3">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full bg-gray-800/50 border border-gray-600 rounded-full py-2 pl-10 pr-4 text-white placeholder-gray-400 focus:outline-none"
                  />
                </form>
              </div>

              {navigation.map((item) => {
                if (item.protected && !isAuthenticated) return null;
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="flex items-center px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg mx-2 transition-all"
                  >
                    <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                    {item.name}
                  </a>
                );
              })}
              {isAuthenticated &&
                adminNavigation.map((item) => {
                  if (user?.role !== 'admin') return null;
                  return (
                    <a
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-4 py-3 text-base font-medium text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg mx-2 transition-all"
                    >
                      <item.icon className="w-5 h-5 mr-3 text-gray-400" />
                      {item.name}
                    </a>
                  );
                })}

              {/* Quick Actions in Mobile */}
              {isAuthenticated && (
                <div className="mt-3 pt-3 border-t border-gray-700/30">
                  <div className="px-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Quick Actions
                    </h3>
                    {quickActions.map((action) => (
                      <a
                        key={action.name}
                        href={action.href}
                        className="flex items-center px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all mb-1"
                      >
                        <action.icon className="w-4 h-4 mr-2 text-gray-400" />
                        {action.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {isAuthenticated && (
              <div className="pt-4 pb-3 border-t border-gray-700/30">
                <div className="px-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <img
                        className="h-12 w-12 rounded-full"
                        src={user?.avatar || '/api/placeholder/48/48'}
                        alt="User"
                      />
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">
                        {user?.username}
                      </div>
                      <div className="text-sm font-medium text-gray-400">
                        {formatCurrency(user?.balance || 0, 'USD')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {userMenuItems.map((item) => (
                      <button
                        key={item.label}
                        className={`block w-full text-left px-3 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-lg transition-all ${
                          item.className || ''
                        }`}
                        onClick={item.onClick}
                      >
                        <item.icon className="w-4 h-4 mr-3 text-gray-400 inline" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </header>
    </>
  );
}