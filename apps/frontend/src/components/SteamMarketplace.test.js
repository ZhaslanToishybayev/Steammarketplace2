// Тестовый frontend компонент для Steam Marketplace API
// Файл: /home/zhaslan/Downloads/testsite/apps/frontend/src/components/SteamMarketplace.test.js

import { useState, useEffect } from 'react';

const SteamMarketplaceAPI = () => {
  const [listings, setListings] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:3012';

  // Получение списка лотов
  const fetchListings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/marketplace/listings`);
      if (!response.ok) throw new Error('Failed to fetch listings');
      const data = await response.json();
      setListings(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Получение инвентаря Steam
  const fetchInventory = async (steamId = '76561198012345678') => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/steam/inventory/${steamId}`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const data = await response.json();
      setInventory(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Получение торговых предложений
  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/trades`);
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      setTrades(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Создание нового лота
  const createListing = async (listingData) => {
    try {
      const response = await fetch(`${API_BASE}/api/marketplace/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(listingData),
      });
      if (!response.ok) throw new Error('Failed to create listing');
      const newListing = await response.json();
      setListings(prev => [...prev, newListing.data]);
      return newListing;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Создание торгового предложения
  const createTrade = async (tradeData) => {
    try {
      const response = await fetch(`${API_BASE}/api/trades`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });
      if (!response.ok) throw new Error('Failed to create trade');
      const newTrade = await response.json();
      setTrades(prev => [...prev, newTrade.data]);
      return newTrade;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Тестовые вызовы API
  const testAPI = async () => {
    console.log('🧪 Testing Steam Marketplace API integration...');

    // Тест 1: Получение лотов
    console.log('🔸 Testing marketplace listings...');
    await fetchListings();

    // Тест 2: Получение инвентаря
    console.log('🔸 Testing Steam inventory...');
    await fetchInventory();

    // Тест 3: Получение trades
    console.log('🔸 Testing trades...');
    await fetchTrades();

    // Тест 4: Создание лота
    console.log('🔸 Testing create listing...');
    try {
      await createListing({
        itemName: 'Test AK-47',
        itemDescription: 'Test item from frontend',
        price: 25.50,
        type: 'fixed_price'
      });
    } catch (err) {
      console.log('Note: Create listing test may fail due to CORS in browser');
    }

    console.log('✅ Steam Marketplace API integration test completed!');
  };

  useEffect(() => {
    // Автоматический тест при загрузке компонента
    testAPI();
  }, []);

  return {
    listings,
    inventory,
    trades,
    loading,
    error,
    fetchListings,
    fetchInventory,
    fetchTrades,
    createListing,
    createTrade,
    testAPI
  };
};

// Пример использования в React компоненте:
/*
import { useEffect } from 'react';
import { SteamMarketplaceAPI } from './SteamMarketplace.test';

function MarketplaceComponent() {
  const {
    listings,
    inventory,
    trades,
    loading,
    error,
    fetchListings,
    fetchInventory,
    fetchTrades
  } = SteamMarketplaceAPI();

  useEffect(() => {
    // Компонент автоматически тестирует API при монтировании
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Steam Marketplace</h2>

      <h3>Marketplace Listings</h3>
      {listings.map(listing => (
        <div key={listing.id}>
          {listing.itemName} - ${listing.price}
        </div>
      ))}

      <h3>Steam Inventory</h3>
      {inventory && (
        <div>
          <p>Steam ID: {inventory.steamId}</p>
          <p>Total Items: {inventory.totalItems}</p>
          {inventory.items.map(item => (
            <div key={item.id}>
              {item.name} - {item.description}
            </div>
          ))}
        </div>
      )}

      <h3>Trade Offers</h3>
      {trades.map(trade => (
        <div key={trade.id}>
          From: {trade.senderId} - Status: {trade.status}
        </div>
      ))}
    </div>
  );
}
*/

export default SteamMarketplaceAPI;