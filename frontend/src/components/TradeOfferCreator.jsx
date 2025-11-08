import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, tradeService } from '../services/api';

export function TradeOfferCreator({ botItems, onTradeCreated }) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [desiredItems, setDesiredItems] = useState([]);
  const [message, setMessage] = useState('');

  const createOfferMutation = useMutation({
    mutationFn: async (offerData) => {
      return await tradeService.createTradeOffer(offerData);
    },
    onSuccess: (data) => {
      alert(`Trade offer created! ID: ${data.offerId}`);
      if (onTradeCreated) {
        onTradeCreated(data);
      }
      setSelectedItems([]);
      setDesiredItems([]);
      setMessage('');
    },
    onError: (error) => {
      alert(`Error: ${error.message || 'Failed to create trade offer'}`);
    }
  });

  const handleCreateOffer = () => {
    if (selectedItems.length === 0) {
      alert('Please select items to trade');
      return;
    }

    createOfferMutation.mutate({
      myAssetIds: selectedItems.map(item => item.assetId),
      theirAssetIds: desiredItems.map(item => item.assetId),
      message: message
    });
  };

  const toggleItemSelection = (item, listType) => {
    if (listType === 'selected') {
      setSelectedItems(prev => {
        const exists = prev.find(i => i.assetId === item.assetId);
        if (exists) {
          return prev.filter(i => i.assetId !== item.assetId);
        } else {
          return [...prev, item];
        }
      });
    } else {
      setDesiredItems(prev => {
        const exists = prev.find(i => i.assetId === item.assetId);
        if (exists) {
          return prev.filter(i => i.assetId !== item.assetId);
        } else {
          return [...prev, item];
        }
      });
    }
  };

  return (
    <div className="trade-creator" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px' }}>Create Trade Offer</h2>

      <div className="trade-sections" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Bot Items Section */}
        <div className="trade-section" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
          <h3>Bot Items (Select what you want)</h3>
          <div className="items-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
            maxHeight: '400px',
            overflowY: 'auto',
            marginTop: '10px'
          }}>
            {botItems && botItems.length > 0 ? (
              botItems.map(item => (
                <div
                  key={item.assetId}
                  onClick={() => toggleItemSelection(item, 'selected')}
                  style={{
                    border: selectedItems.find(i => i.assetId === item.assetId) ? '2px solid #007bff' : '1px solid #ccc',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer',
                    backgroundColor: selectedItems.find(i => i.assetId === item.assetId) ? '#e7f3ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <img
                    src={item.iconUrl}
                    alt={item.marketName}
                    style={{ width: '100%', height: '100px', objectFit: 'contain' }}
                  />
                  <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>
                    {item.marketName}
                  </div>
                  {item.tradable !== undefined && (
                    <div style={{ fontSize: '10px', color: item.tradable ? 'green' : 'red' }}>
                      {item.tradable ? 'Tradable' : 'Not Tradable'}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div>No items available</div>
            )}
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            Selected: {selectedItems.length} items
          </div>
        </div>

        {/* User Items Section */}
        <div className="trade-section" style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px' }}>
          <h3>Your Items (Select what you offer)</h3>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '10px' }}>
            Add your Steam Trade URL in settings to enable trading
          </div>
          <div className="items-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
            maxHeight: '400px',
            overflowY: 'auto',
            marginTop: '10px',
            backgroundColor: '#f5f5f5',
            borderRadius: '4px',
            padding: '10px'
          }}>
            <div style={{ color: '#999', textAlign: 'center', padding: '20px' }}>
              Connect your Steam account and set trade URL to see your items
            </div>
          </div>
          <div style={{ marginTop: '10px', fontSize: '14px' }}>
            Selected: {desiredItems.length} items
          </div>
        </div>
      </div>

      {/* Message Section */}
      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Trade Message (optional):</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a message to your trade offer..."
          style={{
            width: '100%',
            minHeight: '80px',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Action Buttons */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
        <button
          onClick={handleCreateOffer}
          disabled={createOfferMutation.isLoading || selectedItems.length === 0}
          style={{
            padding: '12px 24px',
            backgroundColor: selectedItems.length > 0 ? '#007bff' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: selectedItems.length > 0 ? 'pointer' : 'not-allowed',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {createOfferMutation.isLoading ? 'Creating...' : 'Create Trade Offer'}
        </button>

        <button
          onClick={() => {
            setSelectedItems([]);
            setDesiredItems([]);
            setMessage('');
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Clear Selection
        </button>
      </div>

      {/* Selected Items Summary */}
      {(selectedItems.length > 0 || desiredItems.length > 0) && (
        <div style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <h4>Trade Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '10px' }}>
            <div>
              <strong>You will receive:</strong>
              <ul style={{ marginTop: '5px' }}>
                {selectedItems.map(item => (
                  <li key={item.assetId} style={{ fontSize: '14px' }}>
                    {item.marketName}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <strong>You will give:</strong>
              <ul style={{ marginTop: '5px' }}>
                {desiredItems.map(item => (
                  <li key={item.assetId} style={{ fontSize: '14px' }}>
                    {item.marketName}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
