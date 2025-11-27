import { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { useQueryClient } from '@tanstack/react-query';

export interface PriceUpdate {
  itemId: string;
  currentPrice: number;
  previousPrice: number;
  change: number; // percentage change
  trend: 'up' | 'down' | 'stable';
  timestamp: number;
}

interface UsePriceUpdatesProps {
  itemIds: string[];
  enabled?: boolean;
  updateInterval?: number; // fallback polling interval in ms
}

export const usePriceUpdates = ({ itemIds, enabled = true, updateInterval = 5000 }: UsePriceUpdatesProps) => {
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});
  const [isConnected, setIsConnected] = useState(false);
  const priceHistory = useRef<Record<string, number[]>>({});
  const queryClient = useQueryClient();

  const socket = useSocket();

  // Initialize price history for new items
  useEffect(() => {
    itemIds.forEach(itemId => {
      if (!priceHistory.current[itemId]) {
        priceHistory.current[itemId] = [];
      }
    });
  }, [itemIds]);

  // Handle WebSocket price updates
  useEffect(() => {
    if (!enabled || !socket || itemIds.length === 0) {
      return;
    }

    const handlePriceUpdate = (data: {
      itemId: string;
      price: number;
      timestamp: number;
    }) => {
      const { itemId, price, timestamp } = data;

      // Only update if this item is in our watch list
      if (!itemIds.includes(itemId)) {
        return;
      }

      setPrices(prev => {
        const previous = prev[itemId];
        const previousPrice = previous?.currentPrice || price;
        const change = previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (change > 0.1) trend = 'up';
        else if (change < -0.1) trend = 'down';

        const update: PriceUpdate = {
          itemId,
          currentPrice: price,
          previousPrice,
          change,
          trend,
          timestamp,
        };

        // Update price history (keep last 10 values)
        if (!priceHistory.current[itemId]) {
          priceHistory.current[itemId] = [];
        }
        priceHistory.current[itemId].push(price);
        if (priceHistory.current[itemId].length > 10) {
          priceHistory.current[itemId].shift();
        }

        return {
          ...prev,
          [itemId]: update,
        };
      });

      // Invalidate related queries to trigger UI updates
      queryClient.invalidateQueries({ queryKey: ['market', 'items', itemId] });
      queryClient.invalidateQueries({ queryKey: ['inventory', 'items', itemId] });
    };

    const handleConnectionState = (connected: boolean) => {
      setIsConnected(connected);
    };

    socket.on('price:update', handlePriceUpdate);
    socket.on('connect', () => handleConnectionState(true));
    socket.on('disconnect', () => handleConnectionState(false));

    // Subscribe to price updates for our items
    socket.emit('subscribe:prices', itemIds);

    return () => {
      socket.off('price:update', handlePriceUpdate);
      socket.off('connect');
      socket.off('disconnect');
      socket.emit('unsubscribe:prices', itemIds);
    };
  }, [socket, itemIds, enabled, queryClient]);

  // Fallback polling mechanism
  useEffect(() => {
    if (!enabled || !itemIds.length || isConnected) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        // Fetch updated prices for all watched items
        const responses = await Promise.allSettled(
          itemIds.map(itemId =>
            fetch(`/api/market/price/${itemId}`).then(res => res.json())
          )
        );

        responses.forEach((response, index) => {
          if (response.status === 'fulfilled' && response.value) {
            const itemId = itemIds[index];
            const { price } = response.value;

            setPrices(prev => {
              const previous = prev[itemId];
              const previousPrice = previous?.currentPrice || price;
              const change = previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;

              let trend: 'up' | 'down' | 'stable' = 'stable';
              if (change > 0.1) trend = 'up';
              else if (change < -0.1) trend = 'down';

              const update: PriceUpdate = {
                itemId,
                currentPrice: price,
                previousPrice,
                change,
                trend,
                timestamp: Date.now(),
              };

              return {
                ...prev,
                [itemId]: update,
              };
            });
          }
        });
      } catch (error) {
        console.error('Error fetching price updates:', error);
      }
    }, updateInterval);

    return () => clearInterval(interval);
  }, [itemIds, enabled, updateInterval, isConnected]);

  // Helper function to get price change formatted
  const formatPriceChange = (change: number): string => {
    if (Math.abs(change) < 0.01) return '0.00%';
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  };

  // Helper function to get price color based on trend
  const getPriceColor = (trend: string): string => {
    switch (trend) {
      case 'up':
        return 'text-green-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Helper function to animate price change
  const animatePriceChange = (element: HTMLElement, trend: string): void => {
    if (!element) return;

    const animationClass = trend === 'up'
      ? 'animate-[price-up_0.3s_ease-out_0s_1_normal_forwards]'
      : 'animate-[price-down_0.3s_ease-out_0s_1_normal_forwards]';

    element.classList.add(animationClass);

    setTimeout(() => {
      element.classList.remove(animationClass);
    }, 300);
  };

  // Get price update for a specific item
  const getPriceUpdate = (itemId: string): PriceUpdate | undefined => {
    return prices[itemId];
  };

  // Get price history for an item
  const getPriceHistory = (itemId: string): number[] => {
    return priceHistory.current[itemId] || [];
  };

  // Manually refresh prices
  const refreshPrices = async (): Promise<void> => {
    if (!itemIds.length) return;

    try {
      const responses = await Promise.allSettled(
        itemIds.map(itemId =>
          fetch(`/api/market/price/${itemId}`).then(res => res.json())
        )
      );

      const updates: Record<string, PriceUpdate> = {};

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value) {
          const itemId = itemIds[index];
          const { price } = response.value;

          const previous = prices[itemId];
          const previousPrice = previous?.currentPrice || price;
          const change = previousPrice > 0 ? ((price - previousPrice) / previousPrice) * 100 : 0;

          let trend: 'up' | 'down' | 'stable' = 'stable';
          if (change > 0.1) trend = 'up';
          else if (change < -0.1) trend = 'down';

          updates[itemId] = {
            itemId,
            currentPrice: price,
            previousPrice,
            change,
            trend,
            timestamp: Date.now(),
          };
        }
      });

      setPrices(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error refreshing prices:', error);
    }
  };

  return {
    prices,
    isConnected,
    formatPriceChange,
    getPriceColor,
    animatePriceChange,
    getPriceUpdate,
    getPriceHistory,
    refreshPrices,
  };
};