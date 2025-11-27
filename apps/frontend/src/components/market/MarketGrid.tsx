'use client';

import { useInView } from 'react-intersection-observer';
import { useMarket } from '@/hooks/useMarket';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { useBottomSheet, FilterBottomSheet } from '@/components/shared/BottomSheet';
import { ItemCard } from '@/components/inventory/ItemCard';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { Tooltip } from '@/components/shared/Tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect } from 'react';
import { twMerge } from 'tailwind-merge';

interface MarketGridProps {
  filters?: {
    gameId?: string;
    rarity?: string[];
    wear?: string[];
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    minFloat?: number;
    maxFloat?: number;
    sort?: string;
  };
  className?: string;
  limit?: number;
}

export function MarketGrid({ filters = {}, className, limit }: MarketGridProps) {
  const [sortBy, setSortBy] = useState(filters.sort || 'price_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'large'>('grid');
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

  // FilterPanel hook for mobile
  const filterSheet = useBottomSheet(false);

  // Market data with enhanced filters
  const {
    listings,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useMarket({ ...filters, ...activeFilters });

  // Real-time price updates
  const listingIds = useMemo(() => listings.map(listing => listing.id), [listings]);
  const { prices } = usePriceUpdates({
    itemIds: listingIds,
    enabled: !isLoading && listings.length > 0,
  });

  // Setup infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  // Load more items when scrolled to bottom
  useEffect(() => {
    if (inView && hasNextPage && !isFetching) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetching, fetchNextPage]);

  // Grid columns and layout based on view mode
  const gridConfig = useMemo(() => {
    switch (viewMode) {
      case 'grid':
        return {
          columns: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
          cardSize: 'aspect-square',
        };
      case 'large':
        return {
          columns: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
          cardSize: 'aspect-[3/4]',
        };
      case 'list':
        return {
          columns: 'grid-cols-1',
          cardSize: 'aspect-auto',
        };
      default:
        return {
          columns: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
          cardSize: 'aspect-square',
        };
    }
  }, [viewMode]);

  // Handle filter changes
  const handleFilterChange = (key: string, value: any) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setActiveFilters({});
    filterSheet.close();
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    setActiveFilters(prev => ({
      ...prev,
      sort: newSort,
    }));
  };

  const sortOptions = [
    { value: 'price_asc', label: 'Price: Low to High', icon: '💰' },
    { value: 'price_desc', label: 'Price: High to Low', icon: '💸' },
    { value: 'newest', label: 'Newest First', icon: '🆕' },
    { value: 'oldest', label: 'Oldest First', icon: '📅' },
    { value: 'popularity', label: 'Most Popular', icon: '🔥' },
    { value: 'discount', label: 'Biggest Discount', icon: '📉' },
  ];

  // Get marketplace statistics
  const marketplaceStats = useMemo(() => {
    const totalListings = listings.length;
    const activeListings = listings.filter(l => l.isActive).length;
    const featuredListings = listings.filter(l => l.isFeatured).length;
    const totalValue = listings.reduce((sum, listing) => sum + (listing.price * listing.quantity), 0);

    return {
      totalListings,
      activeListings,
      featuredListings,
      totalValue,
    };
  }, [listings]);

  // Stagger container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex space-x-2">
            <Skeleton className="w-32 h-10 rounded-lg" />
            <Skeleton className="w-16 h-10 rounded-lg" />
          </div>
        </div>

        {/* Filter skeleton */}
        <Skeleton className="h-48 w-full rounded-xl" />

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-lg" />
          ))}
        </div>

        {/* Grid skeleton */}
        <motion.div
          className={`grid ${gridConfig.columns} gap-4`}
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {Array.from({ length: 12 }, (_, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Skeleton className={`rounded-lg ${gridConfig.cardSize} bg-gray-700`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState
        icon="market"
        title="No Items Found"
        description={
          Object.keys(activeFilters).length > 0
            ? "No items match your current filters. Try adjusting your search criteria."
            : "The marketplace is currently empty. Check back later or browse other categories."
        }
        action={
          Object.keys(activeFilters).length === 0 ? (
            <div className="space-y-3">
              <Button
                variant="gradient"
                onClick={() => refetch()}
                className="text-sm"
              >
                🔄 Refresh Marketplace
              </Button>
              <p className="text-sm text-gray-400 text-center">
                New items are added regularly. Come back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="glass"
                onClick={handleClearFilters}
                className="text-sm"
              >
                Clear All Filters
              </Button>
              <Button
                variant="secondary"
                onClick={() => window.location.href = '/market'}
                className="text-sm"
              >
                Reset Page
              </Button>
            </div>
          )
        }
      />
    );
  }

  return (
    <div className={twMerge('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400">
            {marketplaceStats.activeListings} active listings • ${marketplaceStats.totalValue.toLocaleString()} total value
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex bg-gray-700 rounded-lg p-1">
            {(['grid', 'large', 'list'] as const).map((mode) => (
              <Button
                key={mode}
                variant="glass"
                size="sm"
                onClick={() => setViewMode(mode)}
                className={twMerge(
                  'px-3',
                  viewMode === mode && 'bg-gray-600 text-white'
                )}
              >
                {mode === 'grid' && '📊'}
                {mode === 'large' && '🖼️'}
                {mode === 'list' && '📄'}
              </Button>
            ))}
          </div>

          {/* Filter button (mobile) */}
          <Button
            variant="glass"
            size="sm"
            onClick={filterSheet.open}
            className="lg:hidden text-sm"
          >
            📋 Filters
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          className="glass-card p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="text-2xl font-bold text-white">
            {marketplaceStats.activeListings}
          </div>
          <div className="text-sm text-gray-400">Available</div>
        </motion.div>

        <motion.div
          className="glass-card p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="text-2xl font-bold text-green-400">
            {marketplaceStats.featuredListings}
          </div>
          <div className="text-sm text-gray-400">Featured</div>
        </motion.div>

        <motion.div
          className="glass-card p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <div className="text-xl font-bold text-orange-400">
            ${marketplaceStats.totalValue.toLocaleString()}
          </div>
          <div className="text-sm text-gray-400">Total Value</div>
        </motion.div>

        <motion.div
          className="glass-card p-4 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <div className="text-2xl font-bold text-blue-400">
            {listings.length}
          </div>
          <div className="text-sm text-gray-400">Total Items</div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => handleSortChange(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-transparent"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="glass"
            size="sm"
            onClick={() => refetch()}
            className="text-sm"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Active Filters */}
      {Object.keys(activeFilters).length > 0 && (
        <div className="flex items-center flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;

            const label = Array.isArray(value)
              ? `${value.length} ${key}(s)`
              : `${key}: ${value}`;

            return (
              <motion.div
                key={key}
                className="bg-gray-700 text-gray-300 text-sm px-3 py-1 rounded-full flex items-center space-x-2"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                <span>{label}</span>
                <button
                  onClick={() => handleFilterChange(key, Array.isArray(value) ? [] : undefined)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </motion.div>
            );
          })}
          <Button
            variant="glass"
            size="sm"
            onClick={handleClearFilters}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      )}

      {/* Desktop Filter Panel */}
      <div className="hidden lg:block">
        <FilterPanel
          filters={[
            {
              key: 'game',
              label: 'Game',
              type: 'multiselect',
              options: [
                { value: '730', label: 'CS2', icon: 'CS2' },
                { value: '570', label: 'Dota 2', icon: '🎯' },
                { value: '440', label: 'TF2', icon: '🎭' },
                { value: '252490', label: 'Rust', icon: '🏹' },
              ],
            },
            {
              key: 'rarity',
              label: 'Rarity',
              type: 'multiselect',
              options: [
                { value: 'common', label: '⚪ Common' },
                { value: 'uncommon', label: '🟢 Uncommon' },
                { value: 'rare', label: '🔵 Rare' },
                { value: 'mythical', label: '🟣 Mythical' },
                { value: 'legendary', label: '🟠 Legendary' },
                { value: 'ancient', label: '🔴 Ancient' },
              ],
            },
            {
              key: 'price',
              label: 'Price Range',
              type: 'range',
              min: 0,
              max: 1000,
              step: 1,
              unit: '$',
            },
            {
              key: 'float',
              label: 'Float Value',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
            },
          ]}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
          defaultExpanded={true}
        />
      </div>

      {/* Market Grid */}
      <motion.div
        className={`grid ${gridConfig.columns} gap-4`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {(limit ? listings.slice(0, limit) : listings).map((listing, index) => (
          <motion.div key={listing.id} variants={itemVariants}>
            <MarketItemCard
              listing={listing}
              viewMode={viewMode}
              priceUpdates={prices}
            />
          </motion.div>
        ))}

        {/* Loading more items */}
        {isFetching && (
          <div className="col-span-full flex justify-center py-8">
            <div className="flex items-center space-x-3">
              <Skeleton className="rounded-full w-8 h-8" />
              <span className="text-gray-400">Loading more items...</span>
            </div>
          </div>
        )}
      </motion.div>

      {/* End of results */}
      {!hasNextPage && listings.length > 0 && (!limit || listings.length >= limit) && (
        <div className="col-span-full flex justify-center py-8">
          <p className="text-gray-400 text-sm text-center">
            You've reached the end of the marketplace
          </p>
        </div>
      )}

      {/* Load more trigger */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="col-span-full h-1" />
      )}

      {/* Mobile Filter Bottom Sheet */}
      <FilterBottomSheet
        isOpen={filterSheet.isOpen}
        onClose={filterSheet.close}
      >
        <FilterPanel
          filters={[
            {
              key: 'game',
              label: 'Game',
              type: 'multiselect',
              options: [
                { value: '730', label: 'CS2', icon: 'CS2' },
                { value: '570', label: 'Dota 2', icon: '🎯' },
                { value: '440', label: 'TF2', icon: '🎭' },
                { value: '252490', label: 'Rust', icon: '🏹' },
              ],
            },
            {
              key: 'rarity',
              label: 'Rarity',
              type: 'multiselect',
              options: [
                { value: 'common', label: '⚪ Common' },
                { value: 'uncommon', label: '🟢 Uncommon' },
                { value: 'rare', label: '🔵 Rare' },
                { value: 'mythical', label: '🟣 Mythical' },
                { value: 'legendary', label: '🟠 Legendary' },
                { value: 'ancient', label: '🔴 Ancient' },
              ],
            },
            {
              key: 'price',
              label: 'Price Range',
              type: 'range',
              min: 0,
              max: 1000,
              step: 1,
              unit: '$',
            },
            {
              key: 'float',
              label: 'Float Value',
              type: 'range',
              min: 0,
              max: 1,
              step: 0.01,
            },
          ]}
          activeFilters={activeFilters}
          onFilterChange={handleFilterChange}
          onClearAll={handleClearFilters}
          collapsible={false}
        />
      </FilterBottomSheet>
    </div>
  );
}

// Enhanced Market Item Card component
interface MarketItemCardProps {
  listing: {
    id: string;
    item: {
      id: string;
      name: string;
      image: string;
      game: string;
      rarity: string;
      wear?: string;
      float?: number;
      price: number;
      steamAssetId?: string;
      description?: string;
    };
    seller: {
      id: string;
      username: string;
      avatar: string;
      tradeUrl?: string;
      reputation?: number;
      tradeCount?: number;
    };
    price: number;
    originalPrice?: number;
    discountPercent?: number;
    quantity: number;
    createdAt: string;
    isActive: boolean;
    isFeatured: boolean;
    views: number;
    favorites: number;
    priceChange?: {
      value: number;
      percentage: number;
      direction: 'up' | 'down';
    };
  };
  viewMode: 'grid' | 'list' | 'large';
  priceUpdates?: Record<string, any>;
}

function MarketItemCard({ listing, viewMode, priceUpdates }: MarketItemCardProps) {
  const {
    item,
    seller,
    price,
    originalPrice,
    discountPercent,
    quantity,
    isActive,
    isFeatured,
    views,
    favorites,
    priceChange,
  } = listing;

  const [isHovered, setIsHovered] = useState(false);
  const priceUpdate = priceUpdates?.[listing.id];

  const handleBuyNow = () => {
    // This would open the buy modal or redirect to checkout
    console.log('Buying item:', listing.id);
  };

  const formatFloat = (float: number) => {
    return float.toFixed(6);
  };

  const rarityColor = item.rarity.toLowerCase();

  const displayPrice = priceUpdate ? priceUpdate.currentPrice : price;
  const priceChangeValue = priceUpdate?.change || priceChange?.percentage || 0;

  if (viewMode === 'list') {
    return (
      <motion.div
        className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-gray-600 transition-all duration-300 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ x: 4, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)' }}
      >
        {/* Item Info */}
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative w-16 h-16 bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={item.image}
              alt={item.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {isFeatured && (
              <Badge
                variant="legendary"
                size="sm"
                glow
                className="absolute top-1 left-1"
              >
                🌟
              </Badge>
            )}
            {!isActive && (
              <div className="absolute inset-0 bg-black bg-opacity-60 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs font-semibold">SOLD</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <Tooltip content={item.name} placement="top">
                <h3 className="font-semibold text-white mb-1 cursor-help line-clamp-1">
                  {item.name}
                </h3>
              </Tooltip>
              {priceChange && (
                <Badge
                  variant={priceChange.direction === 'up' ? 'success' : 'error'}
                  size="sm"
                >
                  {priceChange.direction === 'up' ? '↑' : '↓'} {Math.abs(priceChange.percentage).toFixed(1)}%
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Tooltip content={`Seller: ${seller.username}`} placement="top">
                <span className="cursor-help flex items-center space-x-1">
                  <img src={seller.avatar} alt="" className="w-4 h-4 rounded-full" />
                  <span>{seller.username}</span>
                  {seller.reputation && (
                    <span className="text-yellow-400">⭐{seller.reputation}</span>
                  )}
                </span>
              </Tooltip>
              <span>•</span>
              <span>{quantity} available</span>
              <span>•</span>
              <span>{views} views</span>
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <Badge variant={rarityColor as any} size="sm" glow>
                {item.rarity}
              </Badge>
              {item.wear && (
                <Badge variant="gray" size="sm">
                  {item.wear}
                </Badge>
              )}
              {discountPercent && discountPercent > 0 && (
                <Badge variant="success" size="sm" glow>
                  -{discountPercent}%
                </Badge>
              )}
              {priceChangeValue !== 0 && (
                <Badge
                  variant={priceChangeValue > 0 ? 'success' : 'error'}
                  size="sm"
                >
                  {priceChangeValue > 0 ? '↑' : '↓'} {Math.abs(priceChangeValue).toFixed(1)}%
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            {originalPrice && originalPrice > price && (
              <div className="text-sm text-gray-500 line-through">
                ${originalPrice.toFixed(2)}
              </div>
            )}
            <div className={`text-lg font-bold ${priceChangeValue > 0 ? 'text-green-400' : priceChangeValue < 0 ? 'text-red-400' : 'text-orange-500'}`}>
              ${displayPrice.toFixed(2)}
            </div>
          </div>
          <Button
            variant={isActive ? 'gradient' : 'glass'}
            size="sm"
            onClick={handleBuyNow}
            disabled={!isActive}
            className="text-sm"
          >
            {isActive ? 'Buy Now' : 'Sold'}
          </Button>
        </div>
      </motion.div>
    );
  }

  if (viewMode === 'large') {
    return (
      <motion.div
        className="relative group"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        transition={{ duration: 0.3 }}
      >
        <ItemCard
          item={{
            ...item,
            price: displayPrice,
          }}
          priceUpdates={priceUpdates}
        />

        {/* Marketplace Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-lg transition-all duration-300 pointer-events-none" />

        {/* Seller Info */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 rounded-b-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Tooltip content={`Seller: ${seller.username}`} placement="top">
                <div className="flex items-center space-x-1 cursor-help">
                  <img
                    src={seller.avatar}
                    alt={seller.username}
                    className="w-6 h-6 rounded-full"
                  />
                  <div>
                    <span className="text-white text-sm font-medium">{seller.username}</span>
                    {seller.reputation && (
                      <span className="text-yellow-400 text-xs">⭐{seller.reputation}</span>
                    )}
                  </div>
                </div>
              </Tooltip>
            </div>
            <div className="text-right">
              {quantity > 1 && (
                <div className="text-xs text-gray-300">x{quantity}</div>
              )}
              <div className={`text-lg font-bold ${priceChangeValue > 0 ? 'text-green-400' : priceChangeValue < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                ${displayPrice.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col space-y-1">
          {isFeatured && (
            <Badge variant="legendary" size="sm" glow>
              🌟 Featured
            </Badge>
          )}
          {discountPercent && discountPercent > 0 && (
            <Badge variant="success" size="sm" glow>
              -{discountPercent}% OFF
            </Badge>
          )}
          {!isActive && (
            <Badge variant="error" size="sm">
              SOLD
            </Badge>
          )}
        </div>

        {/* Stats */}
        <div className="absolute top-3 right-3 flex flex-col space-y-1 text-xs text-gray-300">
          <div className="text-center">
            <div className="text-green-400">👁️ {views}</div>
          </div>
          <div className="text-center">
            <div className="text-pink-400">❤️ {favorites}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="absolute bottom-4 left-4 right-4">
            <Button
              variant="glass"
              size="sm"
              fullWidth
              onClick={handleBuyNow}
              disabled={!isActive}
              className="text-sm backdrop-blur-sm"
            >
              {isActive ? '🛒 Add to Cart' : 'Item Sold'}
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid view
  return (
    <motion.div
      className="relative group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.3 }}
    >
      <ItemCard
        item={{
          ...item,
          price: displayPrice,
        }}
        priceUpdates={priceUpdates}
      />

      {/* Marketplace Overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-300 pointer-events-none" />

      {/* Seller Info */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <div className="flex items-center space-x-1">
            <Tooltip content={`Seller: ${seller.username}`} placement="top">
              <img
                src={seller.avatar}
                alt={seller.username}
                className="w-4 h-4 rounded-full cursor-help"
              />
            </Tooltip>
            <Tooltip content={`Seller: ${seller.username}`} placement="top">
              <span className="cursor-help">{seller.username}</span>
            </Tooltip>
          </div>
          <div className="flex items-center space-x-1">
            {quantity > 1 && (
              <span className="text-gray-400">
                x{quantity}
              </span>
            )}
            <Tooltip
              content={`Current Price: $${displayPrice.toFixed(2)}${priceChangeValue !== 0 ? `\nChange: ${priceChangeValue >= 0 ? '+' : ''}${priceChangeValue.toFixed(2)}%` : ''}`}
              placement="top"
            >
              <span className={`font-semibold cursor-help ${priceChangeValue > 0 ? 'text-green-400' : priceChangeValue < 0 ? 'text-red-400' : 'text-orange-400'}`}>
                ${displayPrice.toFixed(2)}
              </span>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="absolute top-2 left-2 flex flex-col space-y-1">
        {isFeatured && (
          <Badge variant="legendary" size="sm" glow>
            🌟
          </Badge>
        )}
        {discountPercent && discountPercent > 0 && (
          <Badge variant="success" size="sm" glow>
            -{discountPercent}%
          </Badge>
        )}
        {!isActive && (
          <Badge variant="error" size="sm">
            SOLD
          </Badge>
        )}
      </div>

      {/* Quick Actions */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute bottom-2 left-2 right-2">
          <Button
            variant="glass"
            size="sm"
            fullWidth
            onClick={handleBuyNow}
            disabled={!isActive}
            className="text-xs backdrop-blur-sm"
          >
            {isActive ? 'Buy' : 'Sold'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}