'use client';

import { useInView } from 'react-intersection-observer';
import { useInventory } from '@/hooks/useInventory';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { useBottomSheet, FilterBottomSheet } from '@/components/shared/BottomSheet';
import { ItemCard } from '@/components/inventory/ItemCard';
import { Skeleton } from '@/components/shared/Skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { FilterPanel } from '@/components/shared/FilterPanel';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTradeStore } from '@/stores/tradeStore';
import { useEffect, useMemo, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface InventoryGridProps {
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
  selectionMode?: boolean;
  onSelectionChange?: (selectedItems: any[]) => void;
  className?: string;
}

export function InventoryGrid({
  filters = {},
  selectionMode = false,
  onSelectionChange,
  className,
}: InventoryGridProps) {
  const { user } = useAuth();
  const { selectedItems } = useTradeStore();

  // State for filters and view mode
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'large'>('grid');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // FilterPanel hook for mobile
  const filterSheet = useBottomSheet(false);

  // Inventory data with enhanced filters
  const {
    items,
    isLoading,
    isFetching,
    hasNextPage,
    fetchNextPage,
    syncInventory,
    syncMutation,
  } = useInventory({ ...filters, ...activeFilters });

  // Real-time price updates
  const itemIds = useMemo(() => items.map(item => item.id), [items]);
  const { prices } = usePriceUpdates({
    itemIds,
    enabled: !isLoading && items.length > 0,
  });

  // Setup infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  // Handle selection changes
  useEffect(() => {
    if (selectionMode && onSelectionChange) {
      onSelectionChange(selectedItems);
    }
  }, [selectedItems, selectionMode, onSelectionChange]);

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
          columns: selectionMode ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
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
  }, [viewMode, selectionMode]);

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
    setIsFilterPanelOpen(false);
    filterSheet.close();
  };

  // Handle sync inventory
  const handleSyncInventory = async () => {
    try {
      await syncInventory();
      // Show success toast or update UI
    } catch (error) {
      console.error('Error syncing inventory:', error);
    }
  };

  // Handle item selection
  const handleItemSelect = (item: any, selected: boolean) => {
    // This interacts with the trade store via toggleItem
    // The actual selection state is managed by the trade store
    if (selectionMode) {
      console.log(`Item ${selected ? 'selected' : 'deselected'}:`, item.name);
      // Note: The ItemCard component will call toggleItem on the trade store
      // when selectionMode is true, so we don't need to do it here
    }
  };

  // Get selected items total value
  const selectedItemsValue = useMemo(() => {
    return selectedItems.reduce((total: number, item: any) => total + item.price, 0);
  }, [selectedItems]);

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

  if (!user) {
    return (
      <EmptyState
        icon="inventory"
        title="Authentication Required"
        description="Please sign in to view your inventory"
        action={
          <Button
            variant="gradient"
            onClick={() => (window.location.href = '/auth/login')}
          >
            Sign in with Steam
          </Button>
        }
      />
    );
  }

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
            <Skeleton className="w-24 h-10 rounded-lg" />
            <Skeleton className="w-10 h-10 rounded-lg" />
          </div>
        </div>

        {/* Filter skeleton */}
        <Skeleton className="h-48 w-full rounded-xl" />

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

  if (items.length === 0) {
    return (
      <EmptyState
        icon="inventory"
        title="No Items Found"
        description={
          Object.keys(activeFilters).length > 0
            ? "No items match your current filters. Try adjusting your search criteria."
            : "Your Steam inventory is empty or hasn't been synced yet."
        }
        action={
          Object.keys(activeFilters).length === 0 ? (
            <div className="space-y-3">
              <Button
                variant="gradient"
                onClick={handleSyncInventory}
                disabled={syncMutation.isLoading}
                isLoading={syncMutation.isLoading}
                loadingText="Syncing..."
              >
                Sync Steam Inventory
              </Button>
              <p className="text-sm text-gray-400 text-center">
                Connect your Steam inventory to see your items here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="glass"
                onClick={handleClearFilters}
              >
                Clear All Filters
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  handleClearFilters();
                  syncInventory();
                }}
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Your Inventory</h1>
          <p className="text-gray-400">
            {items.length} item{items.length !== 1 ? 's' : ''} found
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

          {/* Sync button */}
          <Button
            variant="glass"
            size="sm"
            onClick={handleSyncInventory}
            disabled={syncMutation.isLoading}
            className="text-sm"
          >
            🔄 Sync
          </Button>

          {/* Filter button (mobile) */}
          <Button
            variant="glass"
            size="sm"
            onClick={filterSheet.open}
            className="sm:hidden text-sm"
          >
            📋 Filters
          </Button>
        </div>
      </div>

      {/* Selection Mode Info */}
      {selectionMode && selectedItems.length > 0 && (
        <motion.div
          className="p-4 bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-500/30 rounded-xl"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <Badge variant="legendary" size="sm" glow>
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
              </Badge>
              <span className="text-gray-300 text-sm">
                Total value: ${selectedItemsValue.toLocaleString()}
              </span>
            </div>
            <div className="flex space-x-2">
              <Button variant="glass" size="sm">
                Select All
              </Button>
              <Button variant="glass" size="sm">
                Clear Selection
              </Button>
            </div>
          </div>
        </motion.div>
      )}

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
      <div className="hidden sm:block">
        <FilterPanel
          filters={[
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

      {/* Inventory Grid */}
      <motion.div
        className={`grid ${gridConfig.columns} gap-4`}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {items.map((item, index) => (
          <motion.div key={item.id} variants={itemVariants}>
            <ItemCard
              item={item}
              selectionMode={selectionMode}
              onSelect={handleItemSelect}
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
      {!hasNextPage && items.length > 0 && (
        <div className="col-span-full flex justify-center py-8">
          <p className="text-gray-400 text-sm text-center">
            You've reached the end of your inventory
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

// Enhanced skeleton component
export function InventoryGridSkeleton({ columns = 6, rows = 3 }: { columns?: number; rows?: number }) {
  const gridColumns = `grid-cols-${columns}`;
  const totalItems = columns * rows;

  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="w-24 h-10 rounded-lg" />
          <Skeleton className="w-10 h-10 rounded-lg" />
        </div>
      </div>

      {/* Filter skeleton */}
      <Skeleton className="h-48 w-full rounded-xl" />

      {/* Grid skeleton */}
      <motion.div
        className={`grid ${gridColumns} gap-4`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ staggerChildren: 0.05 }}
      >
        {Array.from({ length: totalItems }, (_, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Skeleton
              className="rounded-lg aspect-square bg-gray-700 animate-pulse"
            />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}