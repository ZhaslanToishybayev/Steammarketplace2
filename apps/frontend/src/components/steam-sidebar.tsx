'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import {
  Home,
  Store,
  Package,
  RefreshCw,
  BarChart3,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Steam,
  Zap,
  TrendingUp,
  Shield,
  Badge,
  Clock,
  DollarSign,
  CreditCard,
  Activity,
  Globe,
  Database,
  Cpu,
  Wifi,
  WifiOff
} from 'lucide-react';

interface SteamSidebarProps {
  className?: string;
  collapsed?: boolean;
  onToggle?: () => void;
}

interface NavigationItem {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
  steamRarity?: string;
  description?: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

const navigationItems: NavigationItem[] = [
  {
    name: 'Dashboard',
    icon: Home,
    href: '/dashboard',
    badge: 'Analytics',
    steamRarity: 'Legendary',
    description: 'Overview and performance metrics'
  },
  {
    name: 'Marketplace',
    icon: Store,
    href: '/marketplace',
    badge: 'Live',
    steamRarity: 'Mythical',
    description: 'Browse and trade items'
  },
  {
    name: 'Inventory',
    icon: Package,
    href: '/inventory',
    badge: 'Sync',
    steamRarity: 'Rare',
    description: 'Manage your items'
  },
  {
    name: 'Trades',
    icon: RefreshCw,
    href: '/trades',
    badge: 'Active',
    steamRarity: 'Ancient',
    description: 'Trade offers and history'
  },
  {
    name: 'Analytics',
    icon: BarChart3,
    href: '/analytics',
    badge: 'Pro',
    steamRarity: 'Legendary',
    description: 'Advanced market analysis'
  },
  {
    name: 'Automations',
    icon: Cpu,
    href: '/automations',
    badge: 'AI',
    steamRarity: 'Mythical',
    description: 'Trading bots and rules',
    comingSoon: true
  }
];

const secondaryItems = [
  {
    name: 'Settings',
    icon: Settings,
    href: '/settings',
    description: 'Account and preferences'
  },
  {
    name: 'Profile',
    icon: User,
    href: '/profile',
    description: 'Your Steam profile'
  }
];

export function SteamSidebar({ className, collapsed = false, onToggle }: SteamSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['main']));

  const toggleSection = (section: string) => {
    const newOpenSections = new Set(openSections);
    if (newOpenSections.has(section)) {
      newOpenSections.delete(section);
    } else {
      newOpenSections.add(section);
    }
    setOpenSections(newOpenSections);
  };

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 steam-button glass-morphism border border-steam-border hover:border-steam-accent transition-all duration-200"
      >
        {isMobileMenuOpen ? (
          <X className="w-6 h-6 text-steam-text-primary" />
        ) : (
          <Menu className="w-6 h-6 text-steam-text-primary" />
        )}
      </button>

      {/* Sidebar Overlay for Mobile */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar */}
      <motion.aside
        initial={{ x: collapsed ? -280 : 0 }}
        animate={{ x: isMobileMenuOpen ? 0 : (collapsed ? -280 : 0) }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={cn(
          'steam-sidebar fixed left-0 top-0 z-40 lg:z-10 h-screen lg:h-[calc(100vh-4rem)] lg:mt-16 w-72 lg:w-[280px] border-r border-steam-border glass-morphism bg-steam-bg-primary/95 backdrop-blur-xl',
          'transition-all duration-300 ease-in-out',
          collapsed && 'lg:w-20',
          className
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-steam-border">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="steam-icon-container glass-morphism p-2 rounded-lg">
                  <Steam className="w-8 h-8 text-steam-accent" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-steam-accent to-orange-400 bg-clip-text text-transparent">
                    Steam Market
                  </h1>
                  <p className="text-xs text-steam-text-secondary">Professional Trading</p>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="steam-icon-container glass-morphism p-2 rounded-lg mx-auto">
                <Steam className="w-8 h-8 text-steam-accent" />
              </div>
            )}
            <button
              onClick={onToggle}
              className="lg:hidden steam-button glass-morphism border border-steam-border hover:border-steam-accent p-2 rounded-lg transition-all duration-200"
            >
              <X className="w-4 h-4 text-steam-text-primary" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* Main Navigation */}
          <div className="mb-8">
            {!collapsed && (
              <div className="px-4 mb-3">
                <h2 className="text-sm font-semibold text-steam-text-secondary uppercase tracking-wider">
                  Main Navigation
                </h2>
              </div>
            )}
            <div className="space-y-1">
              {navigationItems.map((item) => (
                <SteamNavLink
                  key={item.href}
                  item={item}
                  isActive={isActive(item.href)}
                  collapsed={collapsed}
                  comingSoon={item.comingSoon}
                />
              ))}
            </div>
          </div>

          {/* Secondary Navigation */}
          {!collapsed && (
            <div className="border-t border-steam-border pt-4">
              <div className="px-4 mb-3">
                <h2 className="text-sm font-semibold text-steam-text-secondary uppercase tracking-wider">
                  Settings
                </h2>
              </div>
              <div className="space-y-1">
                {secondaryItems.map((item) => (
                  <SteamNavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Steam Status Footer */}
        <div className="border-t border-steam-border p-4">
          <SteamStatusIndicator collapsed={collapsed} />
        </div>
      </motion.aside>
    </>
  );
}

interface SteamNavLinkProps {
  item: NavigationItem;
  isActive: boolean;
  collapsed: boolean;
  comingSoon?: boolean;
}

function SteamNavLink({ item, isActive, collapsed, comingSoon }: SteamNavLinkProps) {
  const Icon = item.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative"
    >
      <div
        className={cn(
          'steam-nav-item group relative flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl transition-all duration-200',
          'hover:bg-steam-bg-secondary/50 hover:border-steam-accent/30 hover:glow-sm',
          isActive && 'bg-steam-bg-secondary/80 border border-steam-accent/50 glow-md',
          item.disabled && 'opacity-50 cursor-not-allowed',
          comingSoon && 'opacity-60'
        )}
      >
        {/* Rarity Border Effect */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl pointer-events-none',
            `rarity-border-${item.steamRarity?.toLowerCase() || 'common'}`,
            isActive && 'glow-lg'
          )}
        />

        {/* Icon */}
        <div className="relative z-10 flex items-center justify-center">
          <Icon
            className={cn(
              'w-5 h-5 transition-colors duration-200',
              isActive ? 'text-steam-accent' : 'text-steam-text-secondary',
              item.disabled && 'opacity-50'
            )}
          />
          {comingSoon && (
            <div className="absolute -top-1 -right-1">
              <Clock className="w-3 h-3 text-orange-400 animate-pulse" />
            </div>
          )}
        </div>

        {/* Content */}
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm font-medium truncate transition-colors duration-200',
                isActive ? 'text-steam-text-primary' : 'text-steam-text-secondary'
              )}>
                {item.name}
              </span>
              {item.badge && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 text-xs rounded-full font-medium',
                    `bg-rarity-${item.steamRarity?.toLowerCase() || 'common'}-overlay text-rarity-${item.steamRarity?.toLowerCase() || 'common'}`,
                    'transition-all duration-200'
                  )}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <p className="text-xs text-steam-text-tertiary truncate mt-0.5">
              {item.description}
            </p>
          </div>
        )}

        {/* Chevron for collapsed state */}
        {collapsed && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <ChevronRight className="w-4 h-4 text-steam-text-secondary" />
          </div>
        )}

        {/* Coming Soon Overlay */}
        {comingSoon && (
          <div className="absolute inset-0 bg-steam-bg-primary/80 backdrop-blur-sm rounded-xl flex items-center justify-center">
            <span className="text-xs font-medium text-steam-text-tertiary">Soon</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface SteamStatusIndicatorProps {
  collapsed: boolean;
}

function SteamStatusIndicator({ collapsed }: SteamStatusIndicatorProps) {
  const [steamStatus, setSteamStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');
  const [botStatus, setBotStatus] = useState<'online' | 'offline' | 'error'>('offline');
  const [tradeVolume, setTradeVolume] = useState(0);

  useEffect(() => {
    const updateStatus = async () => {
      try {
        const response = await fetch('/api/steam/status');
        const data = await response.json();

        setSteamStatus(data.connected ? 'connected' : 'disconnected');
        setBotStatus(data.botOnline ? 'online' : 'offline');
        setTradeVolume(data.tradeVolume || 0);
      } catch (error) {
        setSteamStatus('disconnected');
        setBotStatus('error');
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    connected: {
      icon: Wifi,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/30',
      text: 'Steam Connected'
    },
    connecting: {
      icon: Zap,
      color: 'text-yellow-400',
      bg: 'bg-yellow-400/10',
      border: 'border-yellow-400/30',
      text: 'Connecting...'
    },
    disconnected: {
      icon: WifiOff,
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      text: 'Steam Offline'
    }
  };

  const config = statusConfig[steamStatus];
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      'steam-status-monitor glass-morphism border',
      config.border,
      config.bg,
      'p-3 rounded-xl transition-all duration-300'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-lg',
          config.bg
        )}>
          <StatusIcon className={cn(config.color, 'w-4 h-4')} />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-sm font-medium', config.color)}>
                {config.text}
              </span>
              <div className={cn(
                'w-2 h-2 rounded-full animate-pulse',
                steamStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
              )} />
            </div>

            <div className="flex items-center gap-3 mt-1 text-xs text-steam-text-tertiary">
              <span className={cn(
                'px-1.5 py-0.5 rounded-full',
                botStatus === 'online' ? 'bg-green-400/20 text-green-400' : 'bg-red-400/20 text-red-400'
              )}>
                {botStatus === 'online' ? 'Bot Online' : 'Bot Offline'}
              </span>
              {tradeVolume > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  <span>${tradeVolume.toLocaleString()}/24h</span>
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status indicator for collapsed view */}
        {collapsed && (
          <div className={cn(
            'w-2 h-2 rounded-full animate-pulse',
            steamStatus === 'connected' ? 'bg-green-400' : 'bg-yellow-400'
          )} />
        )}
      </div>
    </div>
  );
}

/* Enhanced CSS for rarity borders and effects */
export const rarityStyles = `
  .rarity-border-common {
    box-shadow: inset 0 0 0 1px rgba(107, 114, 128, 0.3);
  }
  .rarity-border-uncommon {
    box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.3);
  }
  .rarity-border-rare {
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3);
  }
  .rarity-border-mythical {
    box-shadow: inset 0 0 0 1px rgba(139, 92, 246, 0.3);
  }
  .rarity-border-legendary {
    box-shadow: inset 0 0 0 1px rgba(249, 119, 22, 0.3);
  }
  .rarity-border-ancient {
    box-shadow: inset 0 0 0 1px rgba(239, 68, 68, 0.3);
  }

  .bg-rarity-common-overlay {
    background: rgba(107, 114, 128, 0.15);
    color: #6b7280;
  }
  .bg-rarity-uncommon-overlay {
    background: rgba(34, 197, 94, 0.15);
    color: #22c55e;
  }
  .bg-rarity-rare-overlay {
    background: rgba(59, 130, 246, 0.15);
    color: #3b82f6;
  }
  .bg-rarity-mythical-overlay {
    background: rgba(139, 92, 246, 0.15);
    color: #8b5cf6;
  }
  .bg-rarity-legendary-overlay {
    background: rgba(249, 119, 22, 0.15);
    color: #f97316;
  }
  .bg-rarity-ancient-overlay {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }
`;

/* Add this CSS to your global styles */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = rarityStyles;
  document.head.appendChild(style);
}