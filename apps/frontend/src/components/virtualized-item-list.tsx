'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  Grid,
  List,
  Loader2,
  Image,
  Wifi,
  WifiOff,
  Clock,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface VirtualizedItemListProps {
  items: Array<{
    id: string;
    name: string;
    image: string;
    price: number;
    rarity: string;
    change24h: number;
    steamValue: number;
    tradable?: boolean;
    marketable?: boolean;
  }>;
  itemHeight?: number;
  containerHeight?: number;
  onItemSelect?: (item: any) => void;
  enableSearch?: boolean;
  enableFilter?: boolean;
  viewMode?: 'grid' | 'list';
  className?: string;
}

export function VirtualizedItemList({
  items: allItems,
  itemHeight = 120,
  containerHeight = 600,
  onItemSelect,
  enableSearch = true,
  enableFilter = true,
  viewMode = 'list',
  className
}: VirtualizedItemListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'change' | 'rarity'>('price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const containerRef = useRef<HTMLDivElement>(null);

  // Performance optimizations
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter and sort items
  const filteredAndSortedItems = useCallback(() => {
    let filtered = allItems;

    // Search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query)
      );
    }

    // Rarity filter
    if (selectedRarity !== 'all') {
      filtered = filtered.filter(item => item.rarity === selectedRarity);
    }

    // Sort items
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'change':
          aValue = Math.abs(a.change24h);
          bValue = Math.abs(b.change24h);
          break;
        case 'rarity':
          const rarityOrder = {
            'Common': 1,
            'Uncommon': 2,
            'Rare': 3,
            'Mythical': 4,
            'Legendary': 5,
            'Ancient': 6,
            'Immortal': 7
          };
          aValue = rarityOrder[a.rarity as keyof typeof rarityOrder] || 0;
          bValue = rarityOrder[b.rarity as keyof typeof rarityOrder] || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allItems, debouncedSearchQuery, selectedRarity, sortBy, sortOrder]);

  const items = filteredAndSortedItems();

  // Calculate visible range for virtualization
  useEffect(() => {
    const calculateVisibleRange = () => {
      const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 2);
      const visibleCount = Math.ceil(containerHeight / itemHeight) + 4;
      const end = Math.min(items.length, start + visibleCount);

      setVisibleRange({ start, end });
    };

    calculateVisibleRange();
  }, [scrollTop, itemHeight, containerHeight, items.length]);

  // Debounce search input
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle scroll with throttling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = event.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Detect scrolling state for performance optimization
    if (!isScrolling) {
      setIsScrolling(true);
    }

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set timeout to detect when scrolling stops
    searchTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [isScrolling]);

  // Get visible items for rendering
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);

  // Calculate rarity options
  const rarityOptions = Array.from(new Set(allItems.map(item => item.rarity)));

  // Performance metrics
  const performanceMetrics = {
    totalItems: allItems.length,
    filteredItems: items.length,
    visibleItems: visibleItems.length,
    virtualizationRatio: ((items.length - visibleItems.length) / items.length * 100).toFixed(1)
  };

  return (
    <div className={cn('virtualized-item-list', className)}>
      {/* Header with Controls */}
      <div className="controls-section glass-morphism border border-steam-border p-4 rounded-t-lg">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {enableSearch && (
              <div className="search-container flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-steam-text-secondary w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="steam-input pl-10 pr-4 py-2 w-full bg-steam-bg-secondary border border-steam-border rounded-lg focus:border-steam-accent focus:ring-steam-accent/20 focus:ring-2 transition-all duration-200"
                  />
                </div>
              </div>
            )}

            {enableFilter && (
              <div className="filter-container flex gap-2">
                <select
                  value={selectedRarity}
                  onChange={(e) => setSelectedRarity(e.target.value)}
                  className="steam-select bg-steam-bg-secondary border border-steam-border rounded-lg px-3 py-2 text-sm focus:border-steam-accent focus:ring-steam-accent/20 transition-all duration-200"
                >
                  <option value="all">All Rarities</option>
                  {rarityOptions.map(rarity => (
                    <option key={rarity} value={rarity}>{rarity}</option>
                  ))}
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="steam-select bg-steam-bg-secondary border border-steam-border rounded-lg px-3 py-2 text-sm focus:border-steam-accent focus:ring-steam-accent/20 transition-all duration-200"
                >
                  <option value="price">Sort by Price</option>
                  <option value="name">Sort by Name</option>
                  <option value="change">Sort by Change</option>
                  <option value="rarity">Sort by Rarity</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="steam-button border border-steam-border hover:border-steam-accent transition-all duration-200 p-2 rounded-lg"
                >
                  {sortOrder === 'desc' ? '↓' : '↑'}
                </button>
              </div>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="view-mode-toggle glass-morphism border border-steam-border rounded-lg p-1">
            <button
              onClick={() => {}}
              className={cn(
                'p-2 rounded-md transition-all duration-200',
                viewMode === 'list' ? 'bg-steam-accent/20 text-steam-accent' : 'text-steam-text-secondary hover:bg-steam-bg-secondary'
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => {}}
              className={cn(
                'p-2 rounded-md transition-all duration-200',
                viewMode === 'grid' ? 'bg-steam-accent/20 text-steam-accent' : 'text-steam-text-secondary hover:bg-steam-bg-secondary'
              )}
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="performance-metrics mt-3 flex items-center gap-4 text-xs text-steam-text-tertiary">
          <span>📊 {performanceMetrics.filteredItems} items found</span>
          <span>👁️ {performanceMetrics.visibleItems} items visible</span>
          {parseFloat(performanceMetrics.virtualizationRatio) > 0 && (
            <span className="text-green-400">
              ⚡ {performanceMetrics.virtualizationRatio}% performance saved
            </span>
          )}
        </div>
      </div>

      {/* Virtualized List Container */}
      <div
        ref={containerRef}
        className="virtualized-container relative border border-steam-border border-t-0 rounded-b-lg overflow-hidden"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Loading Overlay during Scroll */}
        <AnimatePresence>
          {isScrolling && (
            <motion.div
              className="scrolling-overlay absolute inset-0 bg-steam-bg-primary/50 backdrop-blur-sm z-10 flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-steam-accent animate-spin mx-auto mb-2" />
                <span className="text-steam-text-secondary text-sm">Loading items...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Scrollable Content */}
        <div
          className="scroll-content relative"
          style={{
            height: items.length * itemHeight,
            position: 'relative'
          }}
        >
          {/* Virtualized Items */}
          <div
            className="virtualized-items"
            style={{
              transform: `translateY(${visibleRange.start * itemHeight}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItems.map((item, index) => {
              const actualIndex = visibleRange.start + index;
              return (
                <VirtualizedItemRow
                  key={`${item.id}-${actualIndex}`}
                  item={item}
                  index={actualIndex}
                  height={itemHeight}
                  isScrolling={isScrolling}
                  onClick={() => onItemSelect?.(item)}
                  viewMode={viewMode}
                />
              );
            })}
          </div>

          {/* Empty State */}
          {items.length === 0 && !isScrolling && (
            <div className="empty-state absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <Image className="w-16 h-16 text-steam-text-secondary/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-steam-text-primary mb-2">
                {debouncedSearchQuery || selectedRarity !== 'all' ? 'No items found' : 'No items available'}
              </h3>
              <p className="text-steam-text-secondary max-w-sm">
                {debouncedSearchQuery || selectedRarity !== 'all'
                  ? 'Try adjusting your search terms or filters to see more results.'
                  : 'Check back later for new items or connect your Steam inventory.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface VirtualizedItemRowProps {
  item: any;
  index: number;
  height: number;
  isScrolling: boolean;
  onClick: () => void;
  viewMode: 'grid' | 'list';
}

function VirtualizedItemRow({ item, index, height, isScrolling, onClick, viewMode }: VirtualizedItemRowProps) {
  const rarityColors = {
    Common: '#6b7280',
    Uncommon: '#22c55e',
    Rare: '#3b82f6',
    Mythical: '#8b5cf6',
    Legendary: '#f97316',
    Ancient: '#ef4444',
    Immortal: '#fbbf24'
  };

  const itemHeight = viewMode === 'grid' ? height * 1.5 : height;
  const rarityColor = rarityColors[item.rarity as keyof typeof rarityColors] || '#6b7280';

  return (
    <motion.div
      className={cn(
        'virtualized-item-row group relative',
        'border-b border-steam-border/50 hover:bg-steam-bg-secondary/80 transition-all duration-200',
        'cursor-pointer'
      )}
      style={{
        height: itemHeight,
        minHeight: itemHeight
      }}
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ x: 4 }}
    >
      {/* Item Content */}
      <div className="flex items-center gap-4 h-full px-4 py-3">
        {/* Item Image with Lazy Loading */}
        <div className="item-image-container relative flex-shrink-0">
          <LazyImage
            src={item.image}
            alt={item.name}
            className="w-16 h-16 object-cover rounded-lg"
            placeholderColor={rarityColor}
          />
          {/* Rarity Overlay */}
          <div
            className="absolute inset-0 rounded-lg"
            style={{
              background: `linear-gradient(135deg, transparent 0%, ${rarityColor}20 100%)`
            }}
          />
        </div>

        {/* Item Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="item-name text-sm font-medium text-steam-text-primary truncate" style={{ color: rarityColor }}>
              {item.name}
            </h4>
            <span
              className="item-rarity px-2 py-1 text-xs rounded-full font-medium"
              style={{
                backgroundColor: `${rarityColor}10`,
                color: rarityColor,
                border: `1px solid ${rarityColor}30`
              }}
            >
              {item.rarity}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-steam-text-secondary" />
              <span className="text-steam-text-primary font-medium">${item.price.toFixed(2)}</span>
              {item.steamValue && (
                <span className="text-steam-text-tertiary text-xs">
                  (Steam: ${item.steamValue.toFixed(2)})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {item.change24h >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span className={cn(
                'text-xs font-medium',
                item.change24h >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(1)}%
              </span>
            </div>

            {/* Status Badges */}
            <div className="flex items-center gap-1">
              {!item.tradable && (
                <span className="px-1 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
                  No Trade
                </span>
              )}
              {!item.marketable && (
                <span className="px-1 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                  No Market
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="actions-container opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="action-button glass-morphism border border-steam-border hover:border-green-400/50 text-green-400 p-1.5 rounded-lg transition-all duration-200"
          >
            <span className="text-xs font-medium">Trade</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="action-button glass-morphism border border-steam-border hover:border-blue-400/50 text-blue-400 p-1.5 rounded-lg transition-all duration-200"
          >
            <span className="text-xs font-medium">View</span>
          </motion.button>
        </div>
      </div>

      {/* Hover Effect */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-steam-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow: `0 0 0 1px ${rarityColor}20`
        }}
      />
    </motion.div>
  );
}

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
}

function LazyImage({ src, alt, className, placeholderColor = '#6b7280' }: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg">
      {/* Placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: placeholderColor + '20' }}
        >
          <div
            className="w-full h-full animate-pulse"
            style={{ backgroundColor: placeholderColor + '10' }}
          />
        </div>
      )}

      {/* Image */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
      />

      {/* Error State */}
      {hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-steam-bg-secondary"
          style={{ backgroundColor: '#1a1a1a' }}
        >
          <span className="text-steam-text-secondary text-xs">No Image</span>
        </div>
      )}
    </div>
  );
}

/* Performance Optimization Utilities */
export const useVirtualScroll = (options: {
  itemCount: number;
  itemHeight: number;
  containerHeight: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);

  const startIndex = Math.max(0, Math.floor(scrollTop / options.itemHeight) - 2);
  const endIndex = Math.min(
    options.itemCount,
    startIndex + Math.ceil(options.containerHeight / options.itemHeight) + 4
  );

  const visibleItems = endIndex - startIndex;

  return {
    scrollTop,
    setScrollTop,
    isScrolling,
    setIsScrolling,
    startIndex,
    endIndex,
    visibleItems,
    totalItems: options.itemCount
  };
};

/* CSS for Virtual Scrolling */
export const virtualScrollStyles = `
  .virtualized-container {
    position: relative;
    overflow-y: auto;
    overscroll-behavior: contain;
  }

  .virtualized-container::-webkit-scrollbar {
    width: 8px;
  }

  .virtualized-container::-webkit-scrollbar-track {
    background: rgba(58, 58, 58, 0.3);
    border-radius: 4px;
  }

  .virtualized-container::-webkit-scrollbar-thumb {
    background: rgba(14, 165, 233, 0.3);
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .virtualized-container::-webkit-scrollbar-thumb:hover {
    background: rgba(14, 165, 233, 0.5);
  }

  .scroll-content {
    will-change: transform;
  }

  .virtualized-item-row {
    contain: layout style paint;
    transform: translateZ(0);
    will-change: auto;
  }

  .item-image-container img {
    image-rendering: -webkit-optimize-contrast;
  }
`;

/* Add CSS to global styles */
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = virtualScrollStyles;
  document.head.appendChild(style);
}