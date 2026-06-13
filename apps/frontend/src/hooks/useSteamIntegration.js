// Steam Integration Hook for Frontend
// Provides access to Steam Marketplace API functionality

import { useState, useEffect, useCallback } from 'react';

const useSteamIntegration = () => {
  const [inventory, setInventory] = useState(null);
  const [listings, setListings] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = process.env.NEXT_PUBLIC_STEAM_MARKETPLACE_URL || 'http://localhost:3012';

  // Fetch Steam inventory
  const fetchInventory = useCallback(async (steamId = '76561198012345678') => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/steam/inventory/${steamId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setInventory(data.data);
      } else {
        throw new Error('Failed to fetch inventory');
      }
    } catch (err) {
      setError(err.message);
      console.error('Steam inventory fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Fetch marketplace listings
  const fetchListings = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await fetch(`${API_BASE}/api/marketplace/listings?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch listings: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setListings(data.data);
      } else {
        throw new Error('Failed to fetch listings');
      }
    } catch (err) {
      setError(err.message);
      console.error('Steam listings fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Fetch trade offers
  const fetchTrades = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/trades`);
      if (!response.ok) {
        throw new Error(`Failed to fetch trades: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setTrades(data.data);
      } else {
        throw new Error('Failed to fetch trades');
      }
    } catch (err) {
      setError(err.message);
      console.error('Steam trades fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Create a new listing
  const createListing = useCallback(async (listingData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/marketplace/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create listing: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Add new listing to the list
        setListings(prev => [...prev, data.data]);
        return data.data;
      } else {
        throw new Error('Failed to create listing');
      }
    } catch (err) {
      setError(err.message);
      console.error('Steam listing creation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Create a trade offer
  const createTrade = useCallback(async (tradeData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/api/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });

      if (!response.ok) {
        throw new Error(`Failed to create trade: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // Add new trade to the list
        setTrades(prev => [...prev, data.data]);
        return data.data;
      } else {
        throw new Error('Failed to create trade');
      }
    } catch (err) {
      setError(err.message);
      console.error('Steam trade creation error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Health check
  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) {
        throw new Error('Steam API is not healthy');
      }

      const data = await response.json();
      return data.status === 'healthy';
    } catch (err) {
      console.error('Steam API health check failed:', err);
      return false;
    }
  }, [API_BASE]);

  // Test all Steam integration functionality
  const testIntegration = useCallback(async () => {
    console.log('🧪 Testing Steam Integration from Frontend...');

    // Test 1: Health check
    const isHealthy = await checkHealth();
    console.log('🔸 Health Check:', isHealthy ? '✅ SUCCESS' : '❌ FAILED');

    if (!isHealthy) {
      setError('Steam API is not healthy');
      return false;
    }

    // Test 2: Fetch inventory
    await fetchInventory();
    console.log('🔸 Inventory Test:', inventory ? '✅ SUCCESS' : '❌ FAILED');

    // Test 3: Fetch listings
    await fetchListings();
    console.log('🔸 Listings Test:', listings.length > 0 ? '✅ SUCCESS' : '❌ FAILED');

    // Test 4: Fetch trades
    await fetchTrades();
    console.log('🔸 Trades Test:', trades.length > 0 ? '✅ SUCCESS' : '❌ FAILED');

    console.log('✅ Steam Integration Test Completed!');
    return true;
  }, [checkHealth, fetchInventory, inventory, fetchListings, listings.length, fetchTrades, trades.length]);

  // Auto-test on mount
  useEffect(() => {
    testIntegration();
  }, [testIntegration]);

  return {
    // Data
    inventory,
    listings,
    trades,

    // State
    loading,
    error,

    // Actions
    fetchInventory,
    fetchListings,
    fetchTrades,
    createListing,
    createTrade,
    checkHealth,
    testIntegration,
  };
};

export default useSteamIntegration;