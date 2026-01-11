import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TradeItem {
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
  quantity?: number;
}

interface TradeState {
  // State
  selectedItems: TradeItem[];
  activeTradeId: string | null;
  tradeStatus: 'idle' | 'creating' | 'pending' | 'sent' | 'accepted' | 'declined' | 'cancelled' | 'completed';
  tradeError: string | null;

  // Actions
  addItem: (item: TradeItem, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  clearSelection: () => void;
  setActiveTrade: (tradeId: string | null) => void;
  updateTradeStatus: (status: TradeState['tradeStatus'], error?: string) => void;
  setTradeError: (error: string | null) => void;
  toggleItem: (item: TradeItem) => void;
  setItems: (items: TradeItem[]) => void;
  getTotalValue: () => number;
  getItemCount: () => number;
  updateItemQuantity: (itemId: string, quantity: number) => void;
  getItemQuantity: (itemId: string) => number;
}

export const useTradeStore = create<TradeState>()(
  persist(
    (set, get) => ({
      // Initial state
      selectedItems: [],
      activeTradeId: null,
      tradeStatus: 'idle',
      tradeError: null,

      // Actions
      addItem: (item, quantity = 1) =>
        set((state) => {
          // Check if item is already in selection
          const existingItem = state.selectedItems.find(
            (selectedItem) => selectedItem.id === item.id
          );

          if (existingItem) {
            // Update quantity of existing item
            return {
              selectedItems: state.selectedItems.map((selectedItem) =>
                selectedItem.id === item.id
                  ? { ...selectedItem, quantity: (selectedItem.quantity || 1) + quantity }
                  : selectedItem
              ),
            };
          } else {
            // Add new item with quantity
            return {
              selectedItems: [...state.selectedItems, { ...item, quantity }],
            };
          }
        }),

      removeItem: (itemId) =>
        set((state) => ({
          selectedItems: state.selectedItems.filter((item) => item.id !== itemId),
        })),

      clearSelection: () =>
        set({
          selectedItems: [],
          activeTradeId: null,
          tradeStatus: 'idle',
          tradeError: null,
        }),

      setActiveTrade: (tradeId) => set({ activeTradeId: tradeId }),

      updateTradeStatus: (status, error) =>
        set({
          tradeStatus: status,
          tradeError: error || null,
        }),

      setTradeError: (error) => set({ tradeError: error }),

      toggleItem: (item) => {
        const state = get();
        const isAlreadySelected = state.selectedItems.some(
          (selectedItem) => selectedItem.id === item.id
        );

        if (isAlreadySelected) {
          set({
            selectedItems: state.selectedItems.filter((selectedItem) => selectedItem.id !== item.id),
          });
        } else {
          set({
            selectedItems: [...state.selectedItems, { ...item, quantity: 1 }],
          });
        }
      },

      setItems: (items) => set({ selectedItems: items }),

      getTotalValue: () => {
        const state = get();
        return state.selectedItems.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
      },

      getItemCount: () => {
        const state = get();
        return state.selectedItems.reduce((total, item) => total + (item.quantity || 1), 0);
      },

      updateItemQuantity: (itemId, quantity) =>
        set((state) => ({
          selectedItems: state.selectedItems.map((item) =>
            item.id === itemId
              ? { ...item, quantity }
              : item
          ),
        })),

      getItemQuantity: (itemId) => {
        const state = get();
        const item = state.selectedItems.find((item) => item.id === itemId);
        return item?.quantity || 0;
      },
    }),
    {
      name: 'trade-storage',
      // Only persist selected items and active trade, not status
      partialize: (state) => ({
        selectedItems: state.selectedItems,
        activeTradeId: state.activeTradeId,
      }),
    }
  )
);

// Selectors
export const useTradeCart = () => useTradeStore((state) => state.selectedItems);
export const useActiveTrade = () => useTradeStore((state) => state.activeTradeId);
export const useTradeStatus = () => useTradeStore((state) => state.tradeStatus);
export const useTradeError = () => useTradeStore((state) => state.tradeError);

// Computed values
export const useTradeCartValue = () => {
  const selectedItems = useTradeCart();
  return selectedItems.reduce((total, item) => total + item.price, 0);
};

export const useTradeCartCount = () => {
  const selectedItems = useTradeCart();
  return selectedItems.length;
};

export const useIsItemInCart = (itemId: string) => {
  const selectedItems = useTradeCart();
  return selectedItems.some((item) => item.id === itemId);
};