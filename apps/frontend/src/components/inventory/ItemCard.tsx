'use client';

import Image from 'next/image';
import { useTradeStore } from '@/stores/tradeStore';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Button } from '@/components/shared/Button';
import { Skeleton } from '@/components/shared/Skeleton';
import { Tooltip } from '@/components/shared/Tooltip';
import { formatCurrency } from '@/utils/formatters';
import { formatFloat } from '@/utils/formatters';
import { motion } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { twMerge } from 'tailwind-merge';

// Custom hook for 3D tilt effect
const useTiltEffect = () => {
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const rotateY = ((event.clientX - centerX) / width) * 10; // Max 10deg
    const rotateX = ((centerY - event.clientY) / height) * 10; // Max 10deg

    setTilt({
      rotateX,
      rotateY,
      scale: 1.05,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  }, []);

  return {
    tilt,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
    },
  };
};

interface ItemCardProps {
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
    stickers?: Array<{
      name: string;
      image: string;
      price: number;
    }>;
    pattern?: string;
    isTradeable?: boolean;
    tradableAfter?: string;
  };
  selected?: boolean;
  selectionMode?: boolean;
  onSelect?: (item: any, selected: boolean) => void;
  onClick?: (item: any) => void;
  priceUpdates?: Record<string, {
    currentPrice: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }>;
  isLoading?: boolean;
  className?: string;
}

const rarityColors = {
  common: 'common',
  uncommon: 'uncommon',
  rare: 'rare',
  mythical: 'mythical',
  legendary: 'legendary',
  ancient: 'ancient',
};

const gameIcons = {
  '730': 'CS2',
  '570': 'Dota 2',
  '440': 'TF2',
  '252490': 'Rust',
};

const wearAbbreviations = {
  'factory new': 'FN',
  'minimal wear': 'MW',
  'field-tested': 'FT',
  'well-worn': 'WW',
  'battle-scarred': 'BS',
};

export function ItemCard({
  item,
  selected = false,
  selectionMode = false,
  onSelect,
  onClick,
  priceUpdates,
  isLoading = false,
  className,
}: ItemCardProps) {
  const { canTrade } = useAuth();
  const { toggleItem, isItemInCart } = useTradeStore();
  const [imageError, setImageError] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 3D Tilt effect
  const { tilt, handlers } = useTiltEffect();

  const isInCart = isItemInCart(item.id);
  const isSelected = selected || isInCart;
  const priceUpdate = priceUpdates?.[item.id];

  // Animate price changes
  useEffect(() => {
    if (priceUpdate) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [priceUpdate]);

  const handleSelect = () => {
    if (selectionMode && onSelect && !isLoading) {
      onSelect(item, !isSelected);
    } else {
      onClick?.(item);
    }
  };

  const handleToggle = () => {
    if (canTrade && item.isTradeable && !isLoading) {
      toggleItem(item);
    }
  };

  const rarityColor = rarityColors[item.rarity.toLowerCase() as keyof typeof rarityColors] || 'common';
  const gameIcon = gameIcons[item.game as keyof typeof gameIcons] || 'Unknown';

  // Get price with real-time updates
  const displayPrice = priceUpdate ? priceUpdate.currentPrice : item.price;
  const priceChange = priceUpdate?.change || 0;

  return (
    <Card
      ref={cardRef}
      variant={isSelected ? 'clickable' : 'hover'}
      rarityGlow={rarityColor as any}
      className={twMerge(
        'group relative overflow-hidden transition-all duration-300',
        isSelected && 'ring-2 ring-orange-500 bg-gray-800',
        selectionMode && 'cursor-pointer',
        isAnimating && 'animate-pulse',
        className
      )}
      onClick={handleSelect}
      isLoading={isLoading}
      style={{
        transform: `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) scale(${tilt.scale})`,
        transition: 'transform 0.1s ease-out',
      }}
      {...handlers}
    >
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="text-center">
            <Skeleton className="rounded-full w-10 h-10 mx-auto mb-2" />
            <Skeleton className="h-4 w-20 mx-auto" />
          </div>
        </div>
      )}

      {/* Selection Checkbox */}
      {selectionMode && canTrade && item.isTradeable && !isLoading && (
        <div className="absolute top-2 left-2 z-10">
          <motion.button
            type="button"
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
              isSelected
                ? 'bg-rarity-legendary-500 border-rarity-legendary-500'
                : 'bg-gray-800 border-gray-600 hover:border-rarity-legendary-400'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            whileTap={{ scale: 0.9 }}
          >
            {isSelected && (
              <motion.svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </motion.svg>
            )}
          </motion.button>
        </div>
      )}

      {/* Item Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-700">
        {!imageError && item.image && !isLoading ? (
          <Tooltip
            content={
              <div className="text-center">
                <span className="font-medium">{item.name}</span>
                {item.description && <p className="text-xs mt-1">{item.description}</p>}
              </div>
            }
            placement="top"
          >
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110 group-hover:rotate-1"
              onError={() => setImageError(true)}
            />
          </Tooltip>
        ) : (
          <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-700 to-gray-800">
            <div className="text-center">
              <div className="text-gray-500 mb-1">🖼️</div>
              <span className="text-gray-400 text-xs">No image</span>
            </div>
          </div>
        )}

        {/* Sticker Overlays on Image */}
        {item.stickers && item.stickers.length > 0 && (
          <div className="absolute inset-0 pointer-events-none z-5">
            {item.stickers.slice(0, 4).map((sticker, index) => {
              // Position stickers in different corners/positions
              const positions = [
                'top-1 left-1 w-6 h-6', // Top-left
                'top-1 right-1 w-6 h-6', // Top-right
                'bottom-1 left-1 w-6 h-6', // Bottom-left
                'bottom-1 right-1 w-6 h-6', // Bottom-right
              ];

              return (
                <Tooltip key={index} content={sticker.name} placement="top">
                  <div
                    className={`absolute ${positions[index]} opacity-80 hover:opacity-100 transition-opacity duration-200`}
                  >
                    <Image
                      src={sticker.image}
                      alt={sticker.name}
                      fill
                      className="object-cover rounded shadow-lg"
                      onError={(e) => {
                        // Fallback to generic sticker if image fails
                        (e.target as HTMLImageElement).style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="w-full h-full bg-gradient-to-br from-yellow-400 to-red-500 rounded flex items-center justify-center text-xs font-bold text-white shadow-lg">S</div>';
                        }
                      }}
                    />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* Game Badge */}
        <div className="absolute top-2 right-2 z-10">
          <Badge variant="glass" size="sm">
            {gameIcon}
          </Badge>
        </div>

        {/* Rarity Badge */}
        <div className="absolute bottom-2 left-2 z-10">
          <Badge variant={rarityColor as any} size="sm" glow>
            {item.rarity}
          </Badge>
        </div>

        {/* Price Update Indicator */}
        {priceUpdate && priceUpdate.trend !== 'stable' && !isLoading && (
          <div
            className={`absolute top-2 left-1/2 -translate-x-1/2 -top-2 z-10 px-2 py-1 rounded text-xs font-semibold ${
              priceUpdate.trend === 'up'
                ? 'bg-green-500/90 text-green-100'
                : 'bg-red-500/90 text-red-100'
            }`}
          >
            {priceUpdate.trend === 'up' ? '↑' : '↓'} {Math.abs(priceChange).toFixed(2)}%
          </div>
        )}

        {/* Float Display */}
        {item.float !== undefined && !isLoading && (
          <div className="absolute bottom-2 right-2 z-10">
            <Tooltip content={`Float Value: ${item.float.toFixed(6)}`} placement="left">
              <div className="relative">
                <div
                  className={`px-2 py-1 rounded text-xs font-mono ${
                    item.float < 0.07 ? 'bg-green-500/80 text-green-100' : 'bg-red-500/80 text-red-100'
                  }`}
                >
                  {item.float.toFixed(3)}
                </div>
                {/* Wear Gradient Bar */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full opacity-60" style={{
                  background: `linear-gradient(to right,
                    ${item.float < 0.07 ? '#22c55e' : '#a3e635'} 0%,
                    ${item.float >= 0.07 && item.float < 0.15 ? '#eab308' : '#fef08a'} 50%,
                    ${item.float >= 0.15 ? '#ef4444' : '#fca5a5'} 100%)`,
                  backgroundSize: `${item.float * 100}% 100%`,
                }} />
              </div>
            </Tooltip>
          </div>
        )}

        {/* Hover Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 100 }}
        />

        {/* Quick Actions Overlay */}
        {!selectionMode && canTrade && item.isTradeable && !isLoading && (
          <motion.div
            className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 100 }}
          >
            <div className="w-full p-2 space-y-1 pointer-events-auto">
              <Button
                size="sm"
                variant="glass"
                fullWidth
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
                className="backdrop-blur-sm"
              >
                {isInCart ? 'Remove' : 'Add to Trade'}
              </Button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Item Details */}
      <div className="mt-3 min-h-[80px]">
        {/* Item Name */}
        <Tooltip content={item.name} placement="top">
          <h3 className="font-semibold text-white text-sm line-clamp-2 mb-1 cursor-help">
            {item.name}
          </h3>
        </Tooltip>

        {/* Item Stats */}
        <div className="space-y-1">
          {/* Rarity and Price */}
          <div className="flex items-center justify-between">
            <Badge variant={rarityColor as any} size="sm" glow>
              <span className="capitalize">{item.rarity}</span>
            </Badge>
            <div className="text-right">
              <Tooltip
                content={`Base Price: ${formatCurrency(item.price, 'USD')}${
                  priceUpdate
                    ? `\nCurrent Price: ${formatCurrency(displayPrice, 'USD')}\nChange: ${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)}%`
                    : ''
                }`}
                placement="left"
              >
                <motion.span
                  className={`font-semibold text-sm font-mono ${
                    isAnimating
                      ? 'text-green-400'
                      : priceChange > 0
                      ? 'text-green-400'
                      : priceChange < 0
                      ? 'text-red-400'
                      : 'text-orange-500'
                  }`}
                  animate={isAnimating ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {formatCurrency(displayPrice, 'USD')}
                </motion.span>
              </Tooltip>
            </div>
          </div>

          {/* Wear and Float */}
          {item.wear && (
            <div className="flex items-center justify-between text-xs text-gray-400">
              <Tooltip content={item.wear} placement="top">
                <span className="cursor-help">{item.wear}</span>
              </Tooltip>
              <span className="font-mono">{formatFloat(item.float || 0)}</span>
            </div>
          )}

          {/* Pattern */}
          {item.pattern && (
            <div className="text-xs text-gray-400 text-center">
              <Tooltip content={`Pattern: ${item.pattern}`} placement="top">
                <span className="cursor-help">Pattern: {item.pattern}</span>
              </Tooltip>
            </div>
          )}

          {/* Stickers */}
          {item.stickers && item.stickers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <Tooltip content="Applied Stickers" placement="top">
                  <span className="cursor-help flex items-center space-x-1">
                    <span>🏷️</span>
                    <span>Stickers: {item.stickers.length}</span>
                  </span>
                </Tooltip>
                <div className="flex space-x-1">
                  {item.stickers.slice(0, 3).map((sticker, index) => (
                    <Tooltip key={index} content={sticker.name} placement="top">
                      <div className="cursor-help relative w-5 h-5 group">
                        <Image
                          src={sticker.image}
                          alt={sticker.name}
                          fill
                          className="object-cover rounded shadow-sm group-hover:shadow-md transition-shadow duration-200"
                          onError={(e) => {
                            // Fallback to gradient sticker if image fails
                            const target = e.target as HTMLImageElement;
                            target.style.background = 'linear-gradient(135deg, #fbbf24, #f59e0b)';
                            target.style.opacity = '0.8';
                            target.style.display = 'block';
                            target.innerHTML = '<div class="w-full h-full flex items-center justify-center text-[6px] font-bold text-white">S</div>';
                          }}
                        />
                      </div>
                    </Tooltip>
                  ))}
                  {item.stickers.length > 3 && (
                    <span className="text-xs text-gray-500 bg-gray-700 px-1 rounded">
                      +{item.stickers.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Sticker Values */}
              <div className="text-xs text-gray-500 text-center">
                <Tooltip
                  content={
                    <div className="space-y-1">
                      {item.stickers.map((sticker, index) => (
                        <div key={index} className="flex justify-between">
                          <span>{sticker.name}</span>
                          <span className="font-medium">${sticker.price?.toFixed(2) || 'N/A'}</span>
                        </div>
                      ))}
                    </div>
                  }
                  placement="top"
                >
                  <span className="cursor-help">
                    Total Sticker Value: ${item.stickers.reduce((sum, s) => sum + (s.price || 0), 0).toFixed(2)}
                  </span>
                </Tooltip>
              </div>
            </div>
          )}

          {/* Trade Status */}
          {!item.isTradeable && (
            <div className="text-xs text-red-400 text-center">
              Not tradeable {item.tradableAfter && `until ${item.tradableAfter}`}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}