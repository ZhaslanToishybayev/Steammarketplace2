'use client';

import { useState, useCallback } from 'react';
import { Modal } from '@/components/shared/Modal';
import { Button } from '@/components/shared/Button';
import { Input } from '@/components/shared/Input';
import { useInventory } from '@/hooks/useInventory';
import { useTradeStore } from '@/stores/tradeStore';
import { useAuth } from '@/hooks/useAuth';
import { usePriceUpdates } from '@/hooks/usePriceUpdates';
import { InventoryGrid } from '@/components/inventory/InventoryGrid';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Tooltip } from '@/components/shared/Tooltip';
import { formatCurrency } from '@/utils/formatters';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowPathIcon, UserIcon, ChatBubbleLeftRightIcon, CheckCircleIcon, TrashIcon, ArrowsUpDownIcon } from '@heroicons/react/24/outline';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from '@/components/shared/SortableItem';
import { useSocket } from '@/hooks/useSocket';

interface TradeCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tradeId: string) => void;
}

export function TradeCreationModal({ isOpen, onClose, onSuccess }: TradeCreationModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [tradeUrl, setTradeUrl] = useState('');
  const [message, setMessage] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { user, canTrade } = useAuth();
  const { selectedItems, clearSelection, removeItem, updateItemQuantity, setItems } = useTradeStore();
  const { socket, emit, isConnected: isSocketConnected } = useSocket();

  // Real-time price updates for selected items
  const selectedItemIds = selectedItems.map(item => item.id);
  const { prices, isConnected } = usePriceUpdates({
    itemIds: selectedItemIds,
    enabled: isOpen && selectedItemIds.length > 0,
  });

  // Setup drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Validation states
  const [tradeUrlError, setTradeUrlError] = useState('');
  const [itemsError, setItemsError] = useState('');

  const steps = [
    { id: 'items', name: 'Select Items', icon: '📦' },
    { id: 'recipient', name: 'Recipient', icon: '👤' },
    { id: 'message', name: 'Message', icon: '💬' },
    { id: 'review', name: 'Review', icon: '📋' },
    { id: 'confirm', name: 'Confirm', icon: '✅' },
  ];

  const currentStepData = steps[currentStep];

  // Enhanced validation functions
  const validateTradeUrl = useCallback((url: string) => {
    const steamTradeUrlRegex = /^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/;
    const isValid = steamTradeUrlRegex.test(url);
    setTradeUrlError(isValid ? '' : 'Please enter a valid Steam trade URL');
    return isValid;
  }, []);

  const validateItems = useCallback(() => {
    const isValid = selectedItems.length > 0;
    setItemsError(isValid ? '' : 'Please select at least one item');
    return isValid;
  }, [selectedItems.length]);

  // Drag and drop handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    // Handle drag over for dropping items from inventory
    // This would need to be implemented when we have proper drag sources from inventory
    console.log('Drag over event:', event);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = selectedItems.findIndex(item => item.id === active.id);
      const newIndex = selectedItems.findIndex(item => item.id === over?.id);

      if (newIndex !== -1) {
        // Reorder items
        const newItems = arrayMove(selectedItems, oldIndex, newIndex);
        // Update trade store with reordered items
        setItems(newItems);
      }
    }

    setActiveDragId(null);
    setIsDragging(false);
  }, [selectedItems, setItems]);

  // Remove item handler
  const handleRemoveItem = useCallback((itemId: string) => {
    removeItem(itemId);
    if (selectedItems.length <= 1) {
      setItemsError('');
    }
  }, [selectedItems.length, removeItem]);

  // Update item quantity handler
  const handleUpdateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity > 0) {
      updateItemQuantity(itemId, quantity);
    } else {
      handleRemoveItem(itemId);
    }
  }, [updateItemQuantity, handleRemoveItem]);

  // Enhanced step handlers
  const handleNext = useCallback(() => {
    if (currentStep === 0) {
      if (validateItems()) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      if (validateTradeUrl(tradeUrl)) {
        setCurrentStep(2);
      }
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      setCurrentStep(4);
    }
  }, [currentStep, validateItems, validateTradeUrl, tradeUrl]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  // Enhanced create trade handler
  const handleCreateTrade = useCallback(async () => {
    try {
      setIsCreating(true);

      // Validate before creating
      if (!validateItems() || !validateTradeUrl(tradeUrl)) {
        return;
      }

      // Create trade (this would call the API)
      console.log('Creating trade with:', {
        items: selectedItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
        tradeUrl,
        message,
        totalValue: getTotalValue(),
      });

      // Emit trade creation event via WebSocket
      emit?.('trade:create', {
        items: selectedItems.map(item => item.id),
        tradeUrl,
        message,
        totalValue: getTotalValue(),
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Clear selection and reset
      clearSelection();
      setCurrentStep(0);
      setTradeUrl('');
      setMessage('');
      onClose();

      // Call success callback
      onSuccess?.('trade-' + Date.now());

    } catch (error) {
      console.error('Trade creation failed:', error);
    } finally {
      setIsCreating(false);
    }
  }, [
    validateItems,
    validateTradeUrl,
    tradeUrl,
    message,
    selectedItems,
    clearSelection,
    onClose,
    onSuccess,
    getTotalValue,
    emit
  ]);

  const handleClose = useCallback(() => {
    if (!isCreating) {
      clearSelection();
      setCurrentStep(0);
      setTradeUrl('');
      setMessage('');
      onClose();
    }
  }, [isCreating, clearSelection, onClose]);

  // Enhanced total value calculation with real-time updates
  const getTotalValue = useCallback(() => {
    return selectedItems.reduce((total, item) => {
      const priceUpdate = prices[item.id];
      const currentPrice = priceUpdate ? priceUpdate.currentPrice : item.price;
      return total + (currentPrice * item.quantity);
    }, 0);
  }, [selectedItems, prices]);

  // Get item display info with price updates
  const getItemDisplayInfo = useCallback((item: any) => {
    const priceUpdate = prices[item.id];
    const currentPrice = priceUpdate ? priceUpdate.currentPrice : item.price;
    const change = priceUpdate ? priceUpdate.change : 0;

    return {
      currentPrice,
      change,
      displayPrice: currentPrice * item.quantity,
      displayChange: change,
    };
  }, [prices]);

  if (!canTrade) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Trade Access Required"
        size="md"
      >
        <div className="text-center py-4">
          <div className="mb-4 text-6xl">🔒</div>
          <p className="text-gray-300 mb-4">
            You need to set up your Steam trade URL to create trades.
          </p>
          <Button
            variant="primary"
            onClick={() => {
              handleClose();
              window.location.href = '/profile';
            }}
          >
            Set Up Trade URL
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Trade Offer"
      size={currentStep === 0 ? 'full' : 'lg'}
      showCloseButton={!isCreating}
    >
      <div className="space-y-6">
        {/* Connection Status Indicator */}
        {currentStep === 0 && (
          <div className="flex items-center justify-center space-x-2 text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected && isSocketConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-gray-400">
              {isConnected && isSocketConnected ? 'Live prices enabled' : 'Prices may be outdated'}
            </span>
          </div>
        )}

        {/* Progress Steps */}
        <div className="border-t border-gray-700 pt-4">
          <nav className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center space-x-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    index < currentStep
                      ? 'bg-green-500 text-white'
                      : index === currentStep
                      ? 'bg-orange-500 text-white ring-2 ring-orange-500/30'
                      : 'bg-gray-600 text-gray-400'
                  }`}
                >
                  {index < currentStep ? <CheckCircleIcon className="w-4 h-4" /> : step.icon}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-8 h-0.5 transition-colors ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                )}
              </div>
            ))}
          </nav>
          <div className="mt-2 text-center">
            <h3 className="text-lg font-semibold text-white">{currentStepData.name}</h3>
            <p className="text-gray-400">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {currentStep === 0 && (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                <p className="text-gray-300 text-center">
                  Select the items you want to trade. Drag and drop items to reorder them in your trade offer.
                </p>

                {/* Selected Items Summary with Drag & Drop */}
                <div
                id="selected-items"
                className="space-y-4"
              >
                  {selectedItems.length > 0 && (
                    <Card className="bg-gray-800/50 border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-gray-300 font-medium">
                            Selected Items ({selectedItems.length})
                          </span>
                          <Badge variant="glass" size="sm">
                            <div className="flex items-center space-x-1">
                              <ArrowsUpDownIcon className="w-3 h-3" />
                              <span>Drag to reorder</span>
                            </div>
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-orange-500 font-semibold text-lg">
                            {formatCurrency(getTotalValue(), 'USD')}
                          </div>
                          <div className="text-gray-400 text-xs">Total Value</div>
                        </div>
                      </div>

                      {/* Draggable Items List */}
                      <SortableContext
                        items={selectedItems.map(item => item.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2">
                          <AnimatePresence>
                            {selectedItems.map((item, index) => {
                              const { currentPrice, change, displayPrice } = getItemDisplayInfo(item);
                              const isPriceUp = change > 0;
                              const isPriceDown = change < 0;

                              return (
                                <SortableItem
                                  key={item.id}
                                  id={item.id}
                                  className="relative group"
                                >
                                  <motion.div
                                    className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-all"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.2 }}
                                  >
                                    {/* Item Image */}
                                    <div className="relative flex-shrink-0">
                                      <div className="w-12 h-12 bg-gray-600 rounded-lg overflow-hidden flex items-center justify-center">
                                        <img
                                          src={item.image}
                                          alt={item.name}
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    </div>

                                    {/* Item Info */}
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-white text-sm line-clamp-1">
                                          {item.name}
                                        </h4>
                                        <div className="flex items-center space-x-1">
                                          <Badge variant="glass" size="sm">
                                            x{item.quantity}
                                          </Badge>
                                          {item.rarity && (
                                            <Badge variant={item.rarity.toLowerCase() as any} size="sm" glow>
                                              {item.rarity}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-gray-300 text-xs">Unit:</span>
                                          <Tooltip
                                            content={`Current: $${currentPrice.toFixed(2)} ${change !== 0 ? `(${change > 0 ? '+' : ''}${change.toFixed(1)}%)` : ''}`}
                                            placement="top"
                                          >
                                            <span className={`font-medium text-sm ${
                                              isPriceUp ? 'text-green-400' :
                                              isPriceDown ? 'text-red-400' : 'text-orange-500'
                                            }`}>
                                              ${currentPrice.toFixed(2)}
                                            </span>
                                          </Tooltip>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-gray-300 text-xs">Total:</span>
                                          <span className={`font-semibold ${
                                            isPriceUp ? 'text-green-400' :
                                            isPriceDown ? 'text-red-400' : 'text-orange-500'
                                          }`}>
                                            ${displayPrice.toFixed(2)}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                      {/* Quantity Controls */}
                                      <div className="flex items-center border border-gray-600 rounded-lg overflow-hidden">
                                        <button
                                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                                          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                                        >
                                          <span className="text-sm">−</span>
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium text-white">
                                          {item.quantity}
                                        </span>
                                        <button
                                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                                          className="w-6 h-6 bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
                                        >
                                          <span className="text-sm">+</span>
                                        </button>
                                      </div>

                                      {/* Remove Button */}
                                      <button
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="p-1 text-gray-400 hover:text-red-400 transition-colors rounded hover:bg-red-500/10"
                                        title="Remove item"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </motion.div>
                                </SortableItem>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </SortableContext>
                    </Card>
                  )}

                  {/* Inventory Grid with Drag Source */}
                  <Card className="bg-gray-800/50 border-gray-700">
                    <div className="p-4">
                      <InventoryGrid
                        selectionMode={true}
                        onSelectionChange={(selectedItems) => {
                          // Clear error when items are selected
                          if (selectedItems.length > 0) {
                            setItemsError('');
                          }
                          // Note: The actual selection is handled by the trade store via ItemCard's toggleItem
                          // This callback is mainly for clearing errors and could be used for additional logic
                        }}
                      />
                    </div>
                  </Card>

                  {itemsError && (
                    <div className="text-red-400 text-sm">{itemsError}</div>
                  )}
                </div>
              </div>
            </DndContext>
          )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Enter the Steam trade URL of the person you want to trade with. You can get this URL from their Steam profile.
              </p>
              <div className="space-y-2">
                <Input
                  label="Steam Trade URL"
                  placeholder="https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=abc123"
                  value={tradeUrl}
                  onChange={(e) => setTradeUrl(e.target.value)}
                  onBlur={() => validateTradeUrl(tradeUrl)}
                  error={tradeUrlError}
                  leftIcon={<UserIcon className="w-4 h-4" />}
                  disabled={isCreating}
                />
                <p className="text-xs text-gray-400">
                  Need help?{' '}
                  <a
                    href="https://support.steampowered.com/kb_article.php?ref=2299-QQCK-7786#TradeURL"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-400"
                  >
                    How to find a trade URL
                  </a>
                </p>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Add an optional message to your trade offer. This will be visible to the recipient.
              </p>
              <Input
                label="Message (Optional)"
                placeholder="Hi! I'd like to trade these items for..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rightIcon={<ChatBubbleLeftRightIcon className="w-4 h-4" />}
                multiline={true}
                rows={3}
                disabled={isCreating}
              />
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-gray-300 text-center mb-4">
                Please review your trade offer before sending. Items with price changes are highlighted.
              </p>

              {/* Side-by-side comparison layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Your Items */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Your Items</h3>
                    <div className="text-right">
                      <span className="text-orange-500 font-semibold">
                        {formatCurrency(getTotalValue(), 'USD')}
                      </span>
                      <div className="text-gray-400 text-xs">
                        {isConnected ? 'Live pricing' : 'Estimated'}
                      </div>
                    </div>
                  </div>

                  {/* Itemized breakdown */}
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedItems.map((item) => {
                      const { currentPrice, change, displayPrice } = getItemDisplayInfo(item);
                      const isPriceUp = change > 0;
                      const isPriceDown = change < 0;

                      return (
                        <div key={item.id} className="flex items-center justify-between p-2 bg-gray-700/30 rounded">
                          <div className="flex items-center space-x-2">
                            <img src={item.image} alt={item.name} className="w-8 h-8 object-cover rounded" />
                            <div>
                              <span className="text-white text-sm">{item.name}</span>
                              <div className="text-xs text-gray-400">x{item.quantity}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-medium ${
                              isPriceUp ? 'text-green-400' :
                              isPriceDown ? 'text-red-400' : 'text-orange-500'
                            }`}>
                              ${displayPrice.toFixed(2)}
                              {change !== 0 && (
                                <span className="text-xs ml-1">
                                  ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* Profit Calculator */}
                <Card className="bg-gray-800/50 border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-white">Profit Analysis</h3>
                    <Badge variant="glass" size="sm" className="text-xs">
                      Fee-adjusted
                    </Badge>
                  </div>

                  {selectedItems.length > 0 && (() => {
                    const totalValue = getTotalValue();
                    const steamFee = 0.05; // 5% Steam fee
                    const platformFee = 0.02; // 2% platform fee
                    const totalFees = steamFee + platformFee;
                    const feesAmount = totalValue * totalFees;
                    const netValue = totalValue - feesAmount;

                    // Mock market reference value (in real implementation, this would come from API)
                    const marketReferenceValue = totalValue * 1.1; // 10% higher than current value
                    const potentialProfit = marketReferenceValue - totalValue;
                    const potentialProfitPercentage = (potentialProfit / totalValue) * 100;

                    return (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Gross Value</span>
                            <span className="text-orange-500 font-medium">
                              {formatCurrency(totalValue, 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Steam Fee (5%)</span>
                            <span className="text-red-400">
                              -{formatCurrency(feesAmount * (steamFee/totalFees), 'USD')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">Platform Fee (2%)</span>
                            <span className="text-red-400">
                              -{formatCurrency(feesAmount * (platformFee/totalFees), 'USD')}
                            </span>
                          </div>
                          <div className="border-t border-gray-700 pt-2">
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-gray-300">Net Value</span>
                              <span className="text-green-400">
                                {formatCurrency(netValue, 'USD')}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t border-gray-700 pt-3">
                          <div className="text-sm font-medium text-gray-300 mb-2">Market Comparison</div>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">Market Reference</span>
                              <span className="text-blue-400">
                                {formatCurrency(marketReferenceValue, 'USD')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-300">Potential Profit</span>
                              <span className={`font-medium ${
                                potentialProfit > 0 ? 'text-green-400' : 'text-red-400'
                              }`}>
                                {potentialProfit > 0 ? '+' : ''}{formatCurrency(potentialProfit, 'USD')}
                                ({potentialProfitPercentage > 0 ? '+' : ''}{potentialProfitPercentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>

                        {potentialProfit > 0 && (
                          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <div className="text-green-400 text-sm font-medium">Good Deal</div>
                            <div className="text-green-300 text-xs mt-1">
                              Potential {potentialProfitPercentage.toFixed(1)}% profit above market value
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </Card>
              </div>

              {/* Trade Details */}
              <Card className="bg-gray-800/30 border-gray-700">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Recipient</span>
                    <span className="text-gray-100 text-sm font-mono">
                      {tradeUrl.split('partner=')[1]?.split('&')[0] || 'Unknown'}
                    </span>
                  </div>
                  {message && (
                    <div>
                      <span className="text-gray-300">Message</span>
                      <p className="text-gray-100 text-sm mt-1 bg-gray-700/30 p-2 rounded">{message}</p>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-2 mt-2">
                    <div className="flex items-center justify-between font-semibold">
                      <span className="text-gray-300">Total Value</span>
                      <div className="text-right">
                        <span className="text-orange-500">
                          {formatCurrency(getTotalValue(), 'USD')}
                        </span>
                        <div className="text-xs text-gray-400">
                          {isConnected ? 'Live pricing' : 'Estimated'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {currentStep === 4 && (
            <div className="text-center space-y-4 py-8">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Ready to Send Trade?
              </h3>
              <p className="text-gray-300">
                Your trade offer will be sent to the recipient. They will receive a notification
                and can accept or decline the offer.
              </p>

              {/* Summary with final pricing */}
              <Card className="bg-gray-800/50 border-gray-700 max-w-md mx-auto">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Items</span>
                    <span className="text-orange-500 font-semibold">
                      {selectedItems.length}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Total Value</span>
                    <span className="text-orange-500 font-semibold">
                      {formatCurrency(getTotalValue(), 'USD')}
                    </span>
                  </div>
                </div>
              </Card>

              <div className="bg-gray-800 rounded-lg p-4 mt-4">
                <p className="text-sm text-gray-400 mb-2">Important notes:</p>
                <ul className="text-xs text-gray-500 space-y-1 text-left">
                  <li>• Make sure the trade URL is correct</li>
                  <li>• You can only cancel the trade before it's accepted</li>
                  <li>• Steam may require trade confirmations</li>
                  <li>• Prices are locked at current market rates</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-700">
          <Button
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 0 || isCreating}
          >
            Back
          </Button>

          <div className="space-x-3 flex items-center">
            {currentStep < steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={isCreating}
              >
                Next
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleCreateTrade}
                isLoading={isCreating}
                disabled={isCreating}
              >
                Create Trade Offer
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}