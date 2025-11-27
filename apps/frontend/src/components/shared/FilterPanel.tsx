'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { twMerge } from 'tailwind-merge';

export interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'checkbox' | 'search' | 'toggle' | 'radio';
  options?: Array<{
    value: string;
    label: string;
    icon?: React.ReactNode;
    color?: string; // For rarity colors
  }>;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  unit?: string;
  searchable?: boolean;
  clearable?: boolean;
}

interface FilterPanelProps {
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
  className?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  presets?: Array<{
    id: string;
    label: string;
    filters: Record<string, any>;
  }>;
  showPresets?: boolean;
  urlSync?: boolean; // Sync filters with URL query params
  loading?: boolean; // Show loading state
}

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  unit?: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  step,
  value,
  onChange,
  label,
  unit,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), value[1] - step);
    onChange([newMin, value[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), value[0] + step);
    onChange([value[0], newMax]);
  };

  const formatValue = (val: number) => {
    if (unit === '%') return `${Math.round(val * 100)}%`;
    if (typeof unit === 'string') return `${val}${unit}`;
    return val.toString();
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-300">{label}</span>
        <span className="text-sm text-orange-400 font-medium">
          {formatValue(value[0])} - {formatValue(value[1])}
        </span>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-gray-500">
          <span>{formatValue(min)}</span>
          <span>{formatValue(max)}</span>
        </div>
        <div className="relative">
          <div className="absolute top-0 left-0 right-0 bottom-0 bg-gray-700 rounded-full opacity-50" />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[0]}
            onChange={handleMinChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider focus:outline-none"
            style={{
              zIndex: value[0] > value[1] - step ? 10 : 1,
            }}
          />
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[1]}
            onChange={handleMaxChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer slider focus:outline-none"
            style={{
              zIndex: value[0] > value[1] - step ? 1 : 10,
            }}
          />
        </div>
      </div>
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f97316, #fb923c);
          cursor: pointer;
          border: 2px solid #1f2937;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className,
  collapsible = true,
  defaultExpanded = true,
  presets = [],
  showPresets = true,
  urlSync = false,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const [recentFilters, setRecentFilters] = React.useState<Array<{filters: Record<string, any>; timestamp: number}>>([]);

  React.useEffect(() => {
    if (urlSync) {
      // Sync with URL params (implementation would depend on router)
      const params = new URLSearchParams(window.location.search);
      // This would parse URL params and update activeFilters
    }
  }, []);

  const getActiveFilterCount = () => {
    return Object.entries(activeFilters).filter(([key, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      return value !== undefined && value !== '' && value !== null;
    }).length;
  };

  const activeFilterCount = getActiveFilterCount();

  const handlePresetApply = (presetFilters: Record<string, any>) => {
    Object.entries(presetFilters).forEach(([key, value]) => {
      onFilterChange(key, value);
    });
    // Add to recent filters
    setRecentFilters(prev => [
      { filters: presetFilters, timestamp: Date.now() },
      ...prev.slice(0, 4) // Keep only last 5
    ]);
  };

  const handleFilterChangeWithRecent = (key: string, value: any) => {
    onFilterChange(key, value);
    // This could be used to track filter usage for "recent filters" feature
  };

  const renderFilter = (filter: FilterConfig) => {
    const value = activeFilters[filter.key];

    switch (filter.type) {
      case 'multiselect':
        return (
          <div key={filter.key} className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-medium text-gray-300">{filter.label}</h4>
              {filter.clearable && value && Array.isArray(value) && value.length > 0 && (
                <button
                  onClick={() => onFilterChange(filter.key, [])}
                  className="text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {filter.options?.map((option) => {
                const isSelected = Array.isArray(value) && value.includes(option.value);
                const bgColor = option.color || 'bg-gray-700';

                // Explicit mapping for Tailwind ring classes
                const ringClasses = {
                  gray: 'ring-gray-500',
                  green: 'ring-green-500',
                  blue: 'ring-blue-500',
                  purple: 'ring-purple-500',
                  orange: 'ring-orange-500',
                  red: 'ring-red-500',
                  yellow: 'ring-yellow-500',
                  indigo: 'ring-indigo-500',
                  pink: 'ring-pink-500',
                  emerald: 'ring-emerald-500',
                  teal: 'ring-teal-500',
                  cyan: 'ring-cyan-500',
                  violet: 'ring-violet-500',
                  fuchsia: 'ring-fuchsia-500',
                  rose: 'ring-rose-500',
                };

                const glowColor = option.color?.replace('bg-', '').replace('-500', '') || 'orange';
                const ringClass = ringClasses[glowColor as keyof typeof ringClasses] || ringClasses.orange;

                return (
                  <Badge
                    key={option.value}
                    variant="glass"
                    size="sm"
                    glow={isSelected}
                    className={twMerge(
                      `cursor-pointer transition-all transform hover:scale-105`,
                      isSelected && ringClass,
                      bgColor
                    )}
                    onClick={() =>
                      handleFilterChangeWithRecent(
                        filter.key,
                        isSelected
                          ? value.filter((v: string) => v !== option.value)
                          : [...(Array.isArray(value) ? value : []), option.value]
                      )
                    }
                  >
                    {option.icon && <span className="mr-1 text-xs">{option.icon}</span>}
                    <span className="text-xs">{option.label}</span>
                  </Badge>
                );
              })}
            </div>
          </div>
        );

      case 'range':
        return (
          <div key={filter.key} className="space-y-2">
            <RangeSlider
              min={filter.min || 0}
              max={filter.max || 100}
              step={filter.step || 1}
              value={value || [filter.min || 0, filter.max || 100]}
              onChange={(newValue) => handleFilterChangeWithRecent(filter.key, newValue)}
              label={filter.label}
              unit={filter.unit}
            />
          </div>
        );

      case 'toggle':
        return (
          <div key={filter.key} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">{filter.label}</h4>
            <div className="flex items-center space-x-3">
              {filter.options?.map((option) => (
                <label key={option.value} className="inline-flex items-center cursor-pointer">
                  <div className={`relative w-10 h-6 rounded-full transition-colors ${value === option.value ? 'bg-orange-500' : 'bg-gray-600'}`}>
                    <input
                      type="radio"
                      name={filter.key}
                      value={option.value}
                      checked={value === option.value}
                      onChange={() => handleFilterChangeWithRecent(filter.key, option.value)}
                      className="sr-only"
                    />
                    <div className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${value === option.value ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="ml-2 text-sm text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'radio':
        return (
          <div key={filter.key} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">{filter.label}</h4>
            <div className="space-y-1">
              {filter.options?.map((option) => (
                <label key={option.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name={filter.key}
                    value={option.value}
                    checked={value === option.value}
                    onChange={() => handleFilterChangeWithRecent(filter.key, option.value)}
                    className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-offset-gray-800"
                  />
                  <span className="ml-2 text-sm text-gray-300 flex items-center">
                    {option.icon && <span className="mr-1">{option.icon}</span>}
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );

      case 'search':
        return (
          <div key={filter.key} className="space-y-2">
            <h4 className="text-sm font-medium text-gray-300">{filter.label}</h4>
            <div className="relative">
              <input
                type="text"
                placeholder={filter.placeholder}
                value={value || ''}
                onChange={(e) => handleFilterChangeWithRecent(filter.key, e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              {value && (
                <button
                  onClick={() => handleFilterChangeWithRecent(filter.key, '')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={twMerge('bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-xl p-4', className)}>
      {/* Filter Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Filters</h3>
        <div className="flex items-center space-x-2">
          {activeFilterCount > 0 && (
            <motion.span
              className="bg-orange-500 text-white text-xs px-2 py-1 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {activeFilterCount}
            </motion.span>
          )}
          {collapsible && (
            <Button
              variant="glass"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? '−' : '+'}
            </Button>
          )}
        </div>
      </div>

      {/* Preset Filters */}
      {showPresets && presets.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Quick Filters</h4>
          <div className="flex flex-wrap gap-1">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="glass"
                size="sm"
                onClick={() => handlePresetApply(preset.filters)}
                className="text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Recent Filters */}
      {recentFilters.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Recent</h4>
          <div className="flex flex-wrap gap-1">
            {recentFilters.map((recent, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handlePresetApply(recent.filters)}
                className="text-xs text-gray-400 hover:text-orange-400"
              >
                Recent {index + 1}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filters Chips */}
      {activeFilterCount > 0 && (
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(activeFilters).map(([key, value]) => {
              if (!value || (Array.isArray(value) && value.length === 0)) return null;

              const filterConfig = filters.find(f => f.key === key);
              if (!filterConfig) return null;

              const renderChipValue = () => {
                if (Array.isArray(value)) {
                  return value.map(v => {
                    const option = filterConfig.options?.find(o => o.value === v);
                    return option ? option.label : v;
                  }).join(', ');
                }
                if (typeof value === 'object' && value !== null && 'min' in value && 'max' in value) {
                  return `${value.min}${filterConfig.unit || ''} - ${value.max}${filterConfig.unit || ''}`;
                }
                return value;
              };

              return (
                <motion.div
                  key={key}
                  className="bg-gradient-to-r from-orange-500/20 to-transparent border border-orange-500/30 text-orange-400 text-sm px-3 py-1 rounded-full flex items-center space-x-2 backdrop-blur-sm"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <span className="font-medium text-xs">{filterConfig.label}:</span>
                  <span className="text-xs">{renderChipValue()}</span>
                  <button
                    onClick={() => handleFilterChangeWithRecent(key, Array.isArray(value) ? [] : undefined)}
                    className="text-orange-400 hover:text-orange-300 ml-1"
                  >
                    ✕
                  </button>
                </motion.div>
              );
            })}
            <Button
              variant="glass"
              size="sm"
              onClick={onClearAll}
              className="text-xs"
            >
              Clear all
            </Button>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin" />
            <span className="text-sm">Applying filters...</span>
          </div>
        </div>
      )}

      {/* Filter Content */}
      <AnimatePresence>
        {(!collapsible || isExpanded) && (
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {filters.map(renderFilter)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Preset filter configurations for common use cases
export const ITEM_FILTERS: FilterConfig[] = [
  {
    key: 'rarity',
    label: 'Rarity',
    type: 'multiselect',
    options: [
      { value: 'common', label: 'Common', icon: '⚪', color: 'bg-gray-500' },
      { value: 'uncommon', label: 'Uncommon', icon: '🟢', color: 'bg-green-500' },
      { value: 'rare', label: 'Rare', icon: '🔵', color: 'bg-blue-500' },
      { value: 'mythical', label: 'Mythical', icon: '🟣', color: 'bg-purple-500' },
      { value: 'legendary', label: 'Legend', icon: '🟠', color: 'bg-orange-500' },
      { value: 'ancient', label: 'Ancient', icon: '🔴', color: 'bg-red-500' },
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
  {
    key: 'condition',
    label: 'Condition',
    type: 'multiselect',
    options: [
      { value: 'factory_new', label: 'FN', color: 'bg-green-500' },
      { value: 'minimal_wear', label: 'MW', color: 'bg-blue-500' },
      { value: 'field_tested', label: 'FT', color: 'bg-yellow-500' },
      { value: 'well_worn', label: 'WW', color: 'bg-orange-500' },
      { value: 'battle_scarred', label: 'BS', color: 'bg-red-500' },
    ],
  },
  {
    key: 'stattrak',
    label: 'StatTrak™',
    type: 'toggle',
    options: [
      { value: 'yes', label: 'Yes' },
      { value: 'no', label: 'No' },
    ],
  },
];

export const MARKET_FILTERS: FilterConfig[] = [
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
    key: 'price',
    label: 'Price Range',
    type: 'range',
    min: 0,
    max: 1000,
    step: 1,
    unit: '$',
  },
  {
    key: 'sort',
    label: 'Sort By',
    type: 'radio',
    options: [
      { value: 'price_asc', label: 'Price: Low to High', icon: '⬆️' },
      { value: 'price_desc', label: 'Price: High to Low', icon: '⬇️' },
      { value: 'newest', label: 'Newest First', icon: '🆕' },
      { value: 'oldest', label: 'Oldest First', icon: '📅' },
    ],
  },
  {
    key: 'availability',
    label: 'Availability',
    type: 'toggle',
    options: [
      { value: 'in_stock', label: 'In Stock' },
      { value: 'pre_order', label: 'Pre Order' },
    ],
  },
];

// Enhanced preset configurations
export const FILTER_PRESETS = [
  {
    id: 'popular',
    label: 'Popular',
    filters: {
      rarity: ['legendary', 'ancient'],
      price: [0, 500],
    },
  },
  {
    id: 'high_value',
    label: 'High Value',
    filters: {
      price: [100, 1000],
    },
  },
  {
    id: 'new_listings',
    label: 'New Listings',
    filters: {
      sort: 'newest',
    },
  },
  {
    id: 'discounts',
    label: 'On Sale',
    filters: {
      discount: [10, 100],
    },
  },
  {
    id: 'factory_new',
    label: 'Factory New',
    filters: {
      condition: ['factory_new'],
      float: [0, 0.05],
    },
  },
];