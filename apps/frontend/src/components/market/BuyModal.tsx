'use client';

import { useState } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { useAuth } from '@/hooks/useAuth';
import { useWallet } from '@/hooks/useWallet';
import { useBuyItem } from '@/hooks/useMarket';
import { formatCurrency } from '@/utils/formatters';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

interface BuyModalProps {
  isOpen: boolean;
  onClose: () => void;
  listing: {
    id: string;
    item: {
      id: string;
      name: string;
      image: string;
      game: string;
      rarity: string;
      wear?: string;
      float?: number;
    };
    seller: {
      id: string;
      username: string;
      avatar: string;
    };
    price: number;
    quantity: number;
    isActive: boolean;
  };
  onSuccess?: (purchaseData: any) => void;
}

export function BuyModal({ isOpen, onClose, listing, onSuccess }: BuyModalProps) {
  const { user } = useAuth();
  const { balance } = useWallet();
  const { buyItem, isLoading } = useBuyItem();

  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('balance');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const totalPrice = listing.price * quantity;
  const canAfford = balance >= totalPrice;
  const canBuy = listing.isActive && canAfford && agreeToTerms && quantity > 0;

  const paymentMethods = [
    { id: 'balance', name: 'Wallet Balance', icon: '💰' },
    { id: 'steam', name: 'Steam Wallet', icon: '🎮' },
    { id: 'crypto', name: 'Cryptocurrency', icon: '💎' },
  ];

  const handleBuy = async () => {
    if (!canBuy) return;

    try {
      await buyItem({
        listingId: listing.id,
        quantity,
        paymentMethod,
        useBalance: paymentMethod === 'balance',
      });

      // Call success callback
      onSuccess?.({
        listingId: listing.id,
        quantity,
        totalPrice,
        paymentMethod,
      });

      // Close modal and reset state
      onClose();
      setQuantity(1);
      setPaymentMethod('balance');
      setAgreeToTerms(false);

    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
      setQuantity(1);
      setPaymentMethod('balance');
      setAgreeToTerms(false);
    }
  };

  if (!listing.isActive) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Item Unavailable"
        size="md"
      >
        <div className="text-center py-6">
          <div className="text-6xl mb-4">❌</div>
          <p className="text-gray-300 mb-4">
            This item is no longer available for purchase.
          </p>
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Purchase Item"
      size="md"
      showCloseButton={!isLoading}
    >
      <div className="space-y-6">
        {/* Item Details */}
        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20 bg-gray-700 rounded-lg overflow-hidden">
            <img
              src={listing.item.image}
              alt={listing.item.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">
              {listing.item.name}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <span>{listing.seller.username}</span>
              <span>•</span>
              <span>{listing.quantity} available</span>
            </div>
            <div className="flex items-center space-x-2 mt-1">
              <Badge variant="blue" size="sm">
                {listing.item.game}
              </Badge>
              <Badge variant="orange" size="sm">
                {listing.item.rarity}
              </Badge>
              {listing.item.wear && (
                <Badge variant="gray" size="sm">
                  {listing.item.wear}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Quantity Selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Quantity
          </label>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={isLoading}
              className="w-10 h-10"
            >
              -
            </Button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 1;
                setQuantity(Math.max(1, Math.min(listing.quantity, value)));
              }}
              className="w-20 text-center bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white focus:outline-none focus:ring-1 focus:ring-orange-500"
              disabled={isLoading}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setQuantity(Math.min(listing.quantity, quantity + 1))}
              disabled={isLoading}
              className="w-10 h-10"
            >
              +
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Max quantity: {listing.quantity}
          </p>
        </div>

        {/* Payment Method */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Payment Method
          </label>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <label
                key={method.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  paymentMethod === method.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-600 hover:border-gray-500'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="radio"
                  value={method.id}
                  checked={paymentMethod === method.id}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isLoading}
                  className="text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-300">{method.icon} {method.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Breakdown */}
        <Card className="bg-gray-800/50 border-gray-700">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Unit Price</span>
              <span className="text-gray-100">${listing.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Quantity</span>
              <span className="text-gray-100">x{quantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Platform Fee</span>
              <span className="text-gray-100">-${(listing.price * quantity * 0.05).toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-700 pt-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-300">Total</span>
                <span className="text-orange-500 text-lg">
                  {formatCurrency(totalPrice, 'USD')}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Balance Info */}
        {paymentMethod === 'balance' && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Wallet Balance</span>
              <span className={`font-semibold ${
                canAfford ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(balance, 'USD')}
              </span>
            </div>
            {!canAfford && (
              <p className="text-red-400 text-xs mt-1">
                Insufficient balance. Please deposit funds or choose another payment method.
              </p>
            )}
          </div>
        )}

        {/* Terms Agreement */}
        <div className="flex items-start space-x-2">
          <input
            type="checkbox"
            id="terms"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
            disabled={isLoading}
            className="mt-1 text-orange-500 focus:ring-orange-500"
          />
          <label htmlFor="terms" className="text-sm text-gray-300">
            I agree to the{' '}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-orange-500 hover:text-orange-400">
              Terms of Service
            </a>{' '}
            and understand that this is a final sale. Items cannot be refunded once purchased.
          </label>
        </div>

        {/* Purchase Summary */}
        <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <div className="flex items-center space-x-2 text-orange-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">
              After purchase, the item will be transferred to your Steam inventory within 24 hours.
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleBuy}
            disabled={!canBuy}
            isLoading={isLoading}
          >
            {isLoading ? 'Processing...' : `Buy for ${formatCurrency(totalPrice, 'USD')}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}