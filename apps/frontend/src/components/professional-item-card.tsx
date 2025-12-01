'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Share2,
  Eye,
  EyeOff,
  Star,
  StarOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  BadgeDollarSign,
  User,
  Users,
  BarChart3
} from 'lucide-react';

interface ProfessionalItemCardProps {
  item: {
    id: string;
    name: string;
    image: string;
    rarity: string;
    quality: string;
    wear: string;
    price: number;
    steamValue: number;
    stickers?: Array<{
      name: string;
      image: string;
      price: number;
    }>;
    float: number;
    pattern?: number;
    inventoryId?: string;
    tradable?: boolean;
    marketable?: boolean;
    inspectLink?: string;
  };
  onTrade?: (item: any) => void;
  onList?: (item: any) => void;
  onAnalyze?: (item: any) => void;
  className?: string;
  showActions?: boolean;
  showAnalytics?: boolean;
}

interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export function ProfessionalItemCard({
  item,
  onTrade,
  onList,
  onAnalyze,
  className,
  showActions = true,
  showAnalytics = true
}: ProfessionalItemCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    const loadPriceHistory = async () => {
      setIsLoadingHistory(true);
      try {
        // Simulate loading price history
        await new Promise(resolve => setTimeout(resolve, 800));

        // Generate mock price history data
        const now = Date.now();
        const history: PriceHistoryPoint[] = [];

        for (let i = 24; i >= 0; i--) {
          history.push({
            timestamp: now - (i * 60 * 60 * 1000), // Hourly data for 24 hours
            price: item.price * (0.95 + Math.random() * 0.1)
          });
        }

        setPriceHistory(history);
      } catch (error) {
        console.error('Failed to load price history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    if (showAnalytics) {
      loadPriceHistory();
    }
  }, [item.id, showAnalytics]);

  const rarityConfig = {
    'Common': { color: '#6b7280', glow: 'shadow-[0_0_8px_#6b7280]' },
    'Uncommon': { color: '#22c55e', glow: 'shadow-[0_0_8px_#22c55e]' },
    'Rare': { color: '#3b82f6', glow: 'shadow-[0_0_8px_#3b82f6]' },
    'Mythical': { color: '#8b5cf6', glow: 'shadow-[0_0_8px_#8b5cf6]' },
    'Legendary': { color: '#f97316', glow: 'shadow-[0_0_8px_#f97316]' },
    'Ancient': { color: '#ef4444', glow: 'shadow-[0_0_8px_#ef4444]' },
    'Immortal': { color: '#fbbf24', glow: 'shadow-[0_0_8px_#fbbf24]' }
  };

  const rarity = rarityConfig[item.rarity as keyof typeof rarityConfig] || rarityConfig['Common'];
  const priceChange = calculatePriceChange(priceHistory);

  const handleTrade = () => {
    onTrade?.(item);
  };

  const handleList = () => {
    onList?.(item);
  };

  const handleAnalyze = () => {
    onAnalyze?.(item);
  };

  return (
    <motion.div
      className={cn(
        'professional-item-card relative group overflow-hidden',
        'glass-morphism border-2 transition-all duration-300',
        'hover:scale-105 hover:shadow-2xl',
        isVisible ? 'opacity-100' : 'opacity-50',
        className
      )}
      style={{
        borderColor: rarity.color,
        boxShadow: isHovered ? `${rarity.glow}, 0 20px 40px rgba(0,0,0,0.3)` : `0 0 0 1px ${rarity.color}`
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -8 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Rarity Border Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          borderRadius: 'calc(1rem - 2px)',
          boxShadow: `0 0 0 2px ${rarity.color}`
        }}
      />

      {/* Item Image with 3D Effect */}
      <div className="item-image-container relative overflow-hidden">
        <motion.img
          src={item.image}
          alt={item.name}
          className="item-image w-full h-48 object-cover"
          whileHover={{ scale: 1.1 }}
          transition={{ duration: 0.3 }}
        />

        {/* Stickers Overlay */}
        {item.stickers && item.stickers.length > 0 && (
          <div className="stickers-overlay absolute inset-0 pointer-events-none">
            {item.stickers.slice(0, 4).map((sticker, index) => (
              <motion.div
                key={sticker.name}
                className="sticker-badge absolute"
                style={{
                  left: `${20 + (index * 20)}%`,
                  top: `${10 + (index * 15)}%`,
                  width: '40px',
                  height: '40px'
                }}
                whileHover={{ scale: 1.2 }}
                transition={{ duration: 0.2 }}
              >
                <img
                  src={sticker.image}
                  alt={sticker.name}
                  className="w-full h-full object-cover rounded-md"
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Item Status Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {item.tradable === false && (
            <motion.div
              className="status-badge bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-1.5 py-0.5 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Shield className="w-3 h-3 inline mr-1" />
              Not Tradable
            </motion.div>
          )}
          {item.marketable === false && (
            <motion.div
              className="status-badge bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs px-1.5 py-0.5 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <BadgeDollarSign className="w-3 h-3 inline mr-1" />
              Not Marketable
            </motion.div>
          )}
        </div>

        {/* Favorite Button */}
        <motion.button
          className="favorite-button absolute top-2 right-2 glass-morphism border border-steam-border hover:border-yellow-400/50 p-2 rounded-lg transition-all duration-200"
          onClick={() => setIsFavorite(!isFavorite)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isFavorite ? (
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          ) : (
            <StarOff className="w-4 h-4 text-steam-text-secondary" />
          )}
        </motion.button>

        {/* Visibility Toggle */}
        <motion.button
          className="visibility-button absolute top-12 right-2 glass-morphism border border-steam-border hover:border-blue-400/50 p-2 rounded-lg transition-all duration-200"
          onClick={() => setIsVisible(!isVisible)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isVisible ? (
            <Eye className="w-4 h-4 text-blue-400" />
          ) : (
            <EyeOff className="w-4 h-4 text-steam-text-secondary" />
          )}
        </motion.button>

        {/* Rarity Glow Overlay */}
        <div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/20"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${rarity.color}20 100%)`
          }}
        />
      </div>

      {/* Item Details */}
      <div className="item-details p-4">
        {/* Item Name and Quality */}
        <div className="flex items-center justify-between mb-2">
          <h3
            className="item-name text-lg font-bold text-steam-text-primary"
            style={{ color: rarity.color }}
          >
            {item.name}
          </h3>
          <span className="quality-badge bg-steam-bg-secondary text-steam-text-secondary text-xs px-2 py-1 rounded-full">
            {item.quality}
          </span>
        </div>

        {/* Item Stats */}
        <div className="item-stats flex items-center gap-4 text-sm mb-3">
          <span className="wear-value text-steam-text-secondary">
            <User className="w-3 h-3 inline mr-1" />
            Float: {item.float.toFixed(6)}
          </span>
          {item.pattern && (
            <span className="pattern-value text-steam-text-secondary">
              <Users className="w-3 h-3 inline mr-1" />
              Pattern: {item.pattern}
            </span>
          )}
          <span className="rarity-badge" style={{ color: rarity.color }}>
            {item.rarity}
          </span>
        </div>

        {/* Price Information */}
        <div className="price-section mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="price-info">
              <span className="current-price text-2xl font-bold" style={{ color: rarity.color }}>
                ${item.price.toFixed(2)}
              </span>
              <span className="steam-value text-sm text-steam-text-secondary ml-2">
                Steam: ${item.steamValue.toFixed(2)}
              </span>
            </div>
            <AnimatePresence>
              {priceChange && (
                <motion.div
                  className={`price-change flex items-center gap-1 ${
                    priceChange.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  {priceChange.change >= 0 ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{Math.abs(priceChange.change).toFixed(1)}%</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Price Chart Preview */}
          {showAnalytics && priceHistory.length > 0 && (
            <div className="price-chart-preview relative h-16 mb-2">
              <svg className="w-full h-full" viewBox="0 0 100 20">
                <polyline
                  points={priceHistory
                    .map((point, index) => {
                      const x = (index / (priceHistory.length - 1)) * 100;
                      const y = 20 - ((point.price - Math.min(...priceHistory.map(p => p.price))) / (Math.max(...priceHistory.map(p => p.price)) - Math.min(...priceHistory.map(p => p.price))) * 20;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                  fill="none"
                  stroke={rarity.color}
                  strokeWidth="0.5"
                  className="price-line"
                />
                <motion.path
                  d={`M 0,20 L 0,${20 - ((priceHistory[0].price - Math.min(...priceHistory.map(p => p.price))) / (Math.max(...priceHistory.map(p => p.price)) - Math.min(...priceHistory.map(p => p.price))) * 20} ${
                    priceHistory
                      .map((point, index) => {
                        const x = (index / (priceHistory.length - 1)) * 100;
                        const y = 20 - ((point.price - Math.min(...priceHistory.map(p => p.price))) / (Math.max(...priceHistory.map(p => p.price)) - Math.min(...priceHistory.map(p => p.price))) * 20;
                        return `L ${x},${y}`;
                      })
                      .join(' ')
                  } L 100,20 Z`}
                  fill={`${rarity.color}20`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.3 }}
                  transition={{ duration: 0.5 }}
                />
              </svg>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        {showActions && (
          <div className="item-actions grid grid-cols-3 gap-2">
            <motion.button
              className="steam-button glass-morphism border border-steam-border hover:border-green-400/50 text-green-400 py-2 px-3 rounded-lg transition-all duration-200 text-sm font-medium"
              onClick={handleTrade}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Trade
            </motion.button>

            <motion.button
              className="steam-button glass-morphism border border-steam-border hover:border-blue-400/50 text-blue-400 py-2 px-3 rounded-lg transition-all duration-200 text-sm font-medium"
              onClick={handleList}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <DollarSign className="w-3 h-3 inline mr-1" />
              List
            </motion.button>

            <motion.button
              className="steam-button glass-morphism border border-steam-border hover:border-purple-400/50 text-purple-400 py-2 px-3 rounded-lg transition-all duration-200 text-sm font-medium"
              onClick={handleAnalyze}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <BarChart3 className="w-3 h-3 inline mr-1" />
              Analyze
            </motion.button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="quick-stats flex items-center justify-between text-xs text-steam-text-tertiary mt-3">
          <span className="inventory-id text-steam-text-tertiary/70">
            ID: {item.inventoryId || 'N/A'}
          </span>
          <div className="flex items-center gap-2">
            <span className="steam-ratio text-green-400/80">
              <CheckCircle className="w-3 h-3 inline mr-1" />
              Steam+: ${(item.price - item.steamValue).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Hover Overlay */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="hover-overlay absolute inset-0 glass-morphism bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function calculatePriceChange(priceHistory: PriceHistoryPoint[]): { change: number; trend: 'up' | 'down' | 'stable' } | null {
  if (priceHistory.length < 2) return null;

  const current = priceHistory[priceHistory.length - 1].price;
  const previous = priceHistory[0].price;
  const change = ((current - previous) / previous) * 100;

  let trend: 'up' | 'down' | 'stable';
  if (change > 2) trend = 'up';
  else if (change < -2) trend = 'down';
  else trend = 'stable';

  return { change, trend };
}

/* Enhanced CSS for professional item cards */
export const professionalItemStyles = `
  .professional-item-card {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    backdrop-filter: blur(20px);
    background: rgba(10, 10, 10, 0.8);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .professional-item-card:hover {
    transform: translateY(-8px) scale(1.02);
  }

  .item-image {
    transition: transform 0.3s ease-out;
    object-fit: cover;
  }

  .item-image-container:hover .item-image {
    transform: scale(1.1);
  }

  .sticker-badge {
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;
  }

  .price-line {
    transition: stroke-dasharray 0.5s ease;
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
  }

  .professional-item-card:hover .price-line {
    stroke-dashoffset: 0;
  }

  .steam-button {
    position: relative;
    overflow: hidden;
  }

  .steam-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
    transition: left 0.5s;
  }

  .steam-button:hover::before {
    left: 100%;
  }

  .hover-overlay {
    z-index: 1;
  }

  .item-details {
    z-index: 2;
  }
`;

/* Add this CSS to your global styles */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = professionalItemStyles;
  document.head.appendChild(style);
}