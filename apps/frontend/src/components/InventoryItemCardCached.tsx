'use client';

import { useState, useEffect } from 'react';
import { LazyImage, useImageCache } from './LazyImageCached';

interface InventoryItemCardProps {
  item: {
    id: string;
    classid: string;
    instanceid: string;
    amount: number;
    name: string;
    market_hash_name: string;
    icon_url: string;
    type: string;
    tradable: boolean;
    marketable: boolean;
    descriptions?: Array<{
      type: string;
      value: string;
      color?: string;
    }>;
    stickers?: string[];
    float_value?: number;
    inspect_link?: string;
  };
  isSelected?: boolean;
  onSelect?: (itemId: string) => void;
  onDeselect?: (itemId: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Enhanced Inventory Item Card with Image Caching
 * - Smart image loading with IndexedDB caching
 * - Lazy loading for performance
 * - Selection state management
 * - Status indicators
 */
export function InventoryItemCardCached({
  item,
  isSelected = false,
  onSelect,
  onDeselect,
  size = 'md',
}: InventoryItemCardProps) {
  const [selected, setSelected] = useState(isSelected);

  // Handle selection changes
  useEffect(() => {
    setSelected(isSelected);
  }, [isSelected]);

  // Get optimized image URL
  const getOptimizedImageUrl = (iconUrl: string): string => {
    if (!iconUrl) return '';

    // Steam CDN optimization
    const baseUrl = iconUrl.replace('https://steamcommunity-a.akamaihd.net/economy/image/', '');
    const optimizedUrl = `https://steamcommunity-a.akamaihd.net/economy/image/${encodeURIComponent(baseUrl)}/128fx`;

    return optimizedUrl;
  };

  const handleCardClick = () => {
    const newSelected = !selected;
    setSelected(newSelected);

    if (newSelected) {
      onSelect?.(item.id);
    } else {
      onDeselect?.(item.id);
    }
  };

  const formatMeta = () => {
    const tags = item?.descriptions || [];
    const get = (cat: string) =>
      tags.find((t: any) =>
        String(t.type || '').toLowerCase().includes(cat)
      )?.value;

    const type = get('type') || item.type;
    const rarity = get('rarity');
    const exterior = get('exterior') || get('quality');
    return [rarity, exterior, type].filter(Boolean).join(' • ');
  };

  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  };

  const imageSize = {
    sm: 64,
    md: 96,
    lg: 128,
  };

  return (
    <div
      className={`
        group relative bg-gradient-to-b from-gray-900 to-black
        border border-gray-800 hover:border-blue-500
        rounded-xl transition-all duration-300 cursor-pointer
        transform hover:scale-[1.02] hover:shadow-2xl
        ${selected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-black' : ''}
        ${sizeClasses[size]}
      `}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      {/* Selection Overlay */}
      <div className="absolute inset-0 rounded-xl">
        <div
          className={`
            absolute top-2 right-2 w-6 h-6 rounded-full border-2
            ${selected ? 'bg-blue-500 border-blue-300' : 'bg-gray-700 border-gray-500'}
            transition-all duration-200
          `}
        >
          {selected && (
            <svg
              className="w-4 h-4 text-white mt-1 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Image with caching */}
      <div className="aspect-square relative mb-3">
        <LazyImage
          src={getOptimizedImageUrl(item.icon_url)}
          alt={item.name}
          width={imageSize[size]}
          height={imageSize[size]}
          className="w-full h-full object-contain rounded-lg group-hover:brightness-110 transition-all duration-300"
          placeholder="Loading image..."
          fallback="https://via.placeholder.com/256"
          onLoad={() => console.log(`📦 Image loaded: ${item.name}`)}
          onError={() => console.error(`❌ Failed to load image: ${item.name}`)}
        />

        {/* Amount badge */}
        {item.amount > 1 && (
          <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-lg">
            {item.amount}
          </div>
        )}

        {/* Status badges */}
        <div className="absolute bottom-2 left-2 flex space-x-1">
          {item.tradable && (
            <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full">
              Tradeable
            </span>
          )}
          {item.marketable && (
            <span className="bg-blue-500/20 text-blue-400 text-xs px-2 py-1 rounded-full">
              Marketable
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        {/* Name */}
        <h3
          className={`
            font-semibold text-white truncate
            ${size === 'lg' ? 'text-lg' : size === 'md' ? 'text-base' : 'text-sm'}
          `}
          title={item.name}
        >
          {item.name}
        </h3>

        {/* Market Hash Name */}
        <p
          className={`
            text-gray-400 truncate
            ${size === 'lg' ? 'text-sm' : 'text-xs'}
          `}
          title={item.market_hash_name}
        >
          {item.market_hash_name}
        </p>

        {/* Meta Info */}
        <div className="flex items-center justify-between">
          <span
            className={`
              text-xs text-gray-500 truncate
              ${size === 'lg' ? 'text-sm' : 'text-xs'}
            `}
          >
            {formatMeta() || 'Item'}
          </span>

          {/* Rarity color indicator */}
          <div className="flex space-x-1">
            {item.tradable && (
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                T
              </span>
            )}
            {item.marketable && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                M
              </span>
            )}
          </div>
        </div>

        {/* Hover details */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="p-4 h-full flex flex-col justify-between">
            <div className="text-xs text-gray-300 space-y-1">
              <div>ClassID: {item.classid}</div>
              <div>InstanceID: {item.instanceid}</div>
              <div>Type: {item.type}</div>
            </div>
          </div>
          <div className="text-center flex gap-2 justify-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition">
              {selected ? 'Selected' : 'Select'}
            </button>
            {item.inspect_link && (
              <a
                href={`https://csgo.gallery/${item.inspect_link}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded transition"
                title="View Screenshot"
                onClick={(e) => e.stopPropagation()}
              >
                📸
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stickers Overlay */}
      {
        item.stickers && item.stickers.length > 0 && (
          <div className="absolute bottom-8 right-2 flex -space-x-2">
            {item.stickers.map((sticker, idx) => (
              <div key={idx} className="w-6 h-6 rounded-full bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden" title={sticker}>
                {/* Placeholder for sticker img */}
                <span className="text-[8px] text-gray-400">★</span>
              </div>
            ))}
          </div>
        )
      }

      {/* Float Bar (if available) */}
      {
        item.float_value !== undefined && (
          <div className="absolute top-2 left-2 bg-black/60 rounded px-1.5 py-0.5 backdrop-blur-md border border-gray-700">
            <span className="text-[10px] text-gray-300 font-mono">{item.float_value.toFixed(4)}</span>
          </div>
        )
      }

      {/* Hover glow effect */}
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div >
  );
}

/**
 * Hook for managing multiple selected items
 */
export function useSelectedItems() {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const selectItem = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) return prev;
      return [...prev, itemId];
    });
  };

  const deselectItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((id) => id !== itemId));
  };

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }
      return [...prev, itemId];
    });
  };

  const clearSelection = () => setSelectedItems([]);

  return {
    selectedItems,
    selectItem,
    deselectItem,
    toggleItem,
    clearSelection,
    isSelected: (itemId: string) => selectedItems.includes(itemId),
    count: selectedItems.length,
  };
}