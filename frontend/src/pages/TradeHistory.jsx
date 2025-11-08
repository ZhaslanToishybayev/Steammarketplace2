import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, tradeService } from '../services/api';
import { useAuth } from '../hooks/useAuth';

export function TradeHistory() {
  const { user } = useAuth();
  const [filter, setFilter] = useState('all'); // all, active, completed, declined

  const { data: historyData, isLoading, error, refetch } = useQuery({
    queryKey: ['tradeHistory', filter],
    queryFn: async () => {
      return await tradeService.getTradeHistory(filter);
    },
    enabled: !!user
  });

  const { data: activeOffers, isLoading: loadingActive } = useQuery({
    queryKey: ['activeOffers'],
    queryFn: async () => {
      return await tradeService.getActiveOffers();
    },
    enabled: !!user,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const getStatusColor = (status) => {
    const statusColors = {
      'sent': '#17a2b8',
      'active': '#ffc107',
      'pending': '#ffc107',
      'accepted': '#28a745',
      'completed': '#28a745',
      'declined': '#dc3545',
      'cancelled': '#6c757d',
      'timeout': '#6c757d',
      'escrow': '#ffc107',
      'failed': '#dc3545'
    };
    return statusColors[status] || '#6c757d';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading trade history...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error loading trade history</h2>
        <p style={{ color: 'red' }}>{error.message}</p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '20px' }}>Trade History</h1>

      {/* Filter Buttons */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        {['all', 'active', 'completed', 'declined'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType)}
            style={{
              padding: '8px 16px',
              backgroundColor: filter === filterType ? '#007bff' : '#f8f9fa',
              color: filter === filterType ? 'white' : '#007bff',
              border: '1px solid #007bff',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontWeight: filter === filterType ? 'bold' : 'normal'
            }}
          >
            {filterType}
          </button>
        ))}
      </div>

      {/* Active Offers Section */}
      {activeOffers && activeOffers.count > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ color: '#ffc107', marginBottom: '15px' }}>Active Trade Offers</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {activeOffers.offers.map((offer) => (
              <div
                key={offer.offerId}
                style={{
                  border: '2px solid #ffc107',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: '#fff3cd'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px 0' }}>Trade Offer #{offer.offerId}</h3>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Status:</strong>
                      <span style={{
                        color: getStatusColor(offer.status),
                        fontWeight: 'bold',
                        marginLeft: '8px',
                        textTransform: 'capitalize'
                      }}>
                        {offer.status}
                      </span>
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Created:</strong> {formatDate(offer.createdAt)}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Items to receive:</strong> {offer.myAssetIds.length}
                    </p>
                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Items to give:</strong> {offer.theirAssetIds.length}
                    </p>
                  </div>
                  <a
                    href={`https://steamcommunity.com/tradeoffer/${offer.offerId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '8px 16px',
                      backgroundColor: '#007bff',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  >
                    View on Steam
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trade History Section */}
      <div>
        <h2 style={{ marginBottom: '15px' }}>Transaction History</h2>
        {!historyData || historyData.count === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            color: '#6c757d'
          }}>
            <p>No trade history found</p>
            <p style={{ fontSize: '14px' }}>Your completed trades will appear here</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '15px' }}>
            {historyData.transactions.map((transaction) => (
              <div
                key={transaction._id}
                style={{
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  padding: '15px',
                  backgroundColor: transaction.type === 'sale' ? '#d4edda' : '#f8f9fa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0 }}>{transaction.type.toUpperCase()}</h3>
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: getStatusColor(transaction.status),
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '12px',
                        textTransform: 'capitalize'
                      }}>
                        {transaction.status}
                      </span>
                    </div>

                    {transaction.marketListing && (
                      <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '10px' }}>
                        <img
                          src={transaction.marketListing.item?.iconUrl}
                          alt={transaction.marketListing.item?.marketName}
                          style={{ width: '60px', height: '60px', objectFit: 'contain' }}
                        />
                        <div>
                          <p style={{ margin: '5px 0', fontWeight: 'bold' }}>
                            {transaction.marketListing.item?.marketName}
                          </p>
                          <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                            Price: ${transaction.marketListing.price?.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )}

                    <p style={{ margin: '5px 0', fontSize: '14px' }}>
                      <strong>Amount:</strong>
                      <span style={{
                        color: transaction.amount >= 0 ? '#28a745' : '#dc3545',
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>
                        ${Math.abs(transaction.amount).toFixed(2)}
                      </span>
                    </p>

                    <p style={{ margin: '5px 0', fontSize: '14px', color: '#666' }}>
                      {transaction.description}
                    </p>

                    <p style={{ margin: '5px 0', fontSize: '12px', color: '#999' }}>
                      {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Refresh Button */}
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <button
          onClick={() => refetch()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Refresh History
        </button>
      </div>
    </div>
  );
}
