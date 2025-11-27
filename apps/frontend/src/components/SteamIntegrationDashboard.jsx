'use client';

import { useState, useEffect } from 'react';
import useSteamIntegration from '../hooks/useSteamIntegration';

const SteamIntegrationDashboard = () => {
  const {
    inventory,
    listings,
    trades,
    loading,
    error,
    fetchInventory,
    fetchListings,
    fetchTrades
  } = useSteamIntegration();

  const [activeTab, setActiveTab] = useState('inventory');

  if (loading && !inventory && !listings.length && !trades.length) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white">Initializing Steam Integration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-blue-400">🎮 Steam Marketplace Integration</h1>
          <p className="text-gray-400 mt-2">Real-time Steam inventory and trading system</p>
          {error && (
            <div className="mt-4 p-4 bg-red-900 border border-red-600 rounded-lg">
              <p className="text-red-300">⚠️ {error}</p>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto flex space-x-8 px-6">
          {[
            { id: 'inventory', label: '📦 Inventory', count: inventory?.totalItems || 0 },
            { id: 'listings', label: '🏪 Marketplace', count: listings.length },
            { id: 'trades', label: '🔄 Trades', count: trades.length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto p-6">
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">📦 Steam Inventory</h2>
              <button
                onClick={() => fetchInventory()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {inventory ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {inventory.items.map((item) => (
                  <div key={item.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-32 object-cover rounded-md mb-4"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjMzMzIj48L3JlY3Q+CjxwYXRoIGQ9Ik0xMDAgMTAwTDEwMCAxMDBaIiBzdHJva2U9IiM2NjYiIHN0cm9rZS13aWR0aD0iMiI+PC9wYXRoPgo8L3N2Zz4K';
                      }}
                    />
                    <h3 className="font-semibold text-lg mb-2">{item.name}</h3>
                    <p className="text-gray-400 text-sm mb-2">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-bold">${item.price}</span>
                      <div className="space-x-2">
                        {item.tradable && <span className="text-blue-400 text-xs"> Tradable</span>}
                        {item.marketable && <span className="text-purple-400 text-xs"> Marketable</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No inventory data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">🏪 Marketplace Listings</h2>
              <button
                onClick={() => fetchListings()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {listings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((listing) => (
                  <div key={listing.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                    <h3 className="font-semibold text-lg mb-2">{listing.itemName}</h3>
                    <p className="text-gray-400 text-sm mb-4">{listing.itemDescription}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-bold">${listing.price}</span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        listing.type === 'fixed_price'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-yellow-900 text-yellow-300'
                      }`}>
                        {listing.type}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Seller: {listing.sellerId}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No marketplace listings available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">🔄 Trade Offers</h2>
              <button
                onClick={() => fetchTrades()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Refresh
              </button>
            </div>

            {trades.length > 0 ? (
              <div className="space-y-4">
                {trades.map((trade) => (
                  <div key={trade.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Trade Offer #{trade.id}</h3>
                        <p className="text-gray-400">From: {trade.senderId}</p>
                        <p className="text-gray-400">To: {trade.targetSteamId}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm font-semibold ${
                        trade.status === 'pending'
                          ? 'bg-yellow-900 text-yellow-300'
                          : trade.status === 'accepted'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {trade.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-medium mb-2">Items Offered:</h4>
                        <ul className="space-y-1">
                          {trade.itemsOffered.map((item, index) => (
                            <li key={index} className="text-gray-300">• {item}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Items Requested:</h4>
                        <ul className="space-y-1">
                          {trade.itemsRequested.map((item, index) => (
                            <li key={index} className="text-gray-300">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      Created: {new Date(trade.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No trade offers available</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default SteamIntegrationDashboard;