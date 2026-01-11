'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export interface CartItem {
    listingId: number;
    name: string;
    price: number;
    image: string;
    float?: number;
    stickers?: any[];
    addedAt: number;
}

export interface CartContextType {
    items: CartItem[];
    itemCount: number;
    totalPrice: number;
    isLoading: boolean;
    addToCart: (item: any) => Promise<boolean>;
    removeFromCart: (listingId: number) => Promise<void>;
    clearCart: () => Promise<void>;
    isInCart: (listingId: number) => boolean;
    refreshCart: () => Promise<void>;
    checkout: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | null>(null);

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        return {
            items: [],
            itemCount: 0,
            totalPrice: 0,
            isLoading: false,
            addToCart: async () => true,
            removeFromCart: async () => { },
            clearCart: async () => { },
            isInCart: () => false,
            refreshCart: async () => { },
            checkout: async () => true,
        };
    }
    return context;
}

export function CartProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const user = useAuthStore(state => state.user);

    const refreshCart = useCallback(async () => {
        if (!user) {
            setItems([]);
            return;
        }
        setIsLoading(true);
        try {
            const res = await fetch('/api/cart', { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
            }
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            refreshCart();
        }
    }, [user, refreshCart]);

    const addToCart = async (item: any) => {
        if (!user) {
            toast.error('Please login to add items to cart');
            return false;
        }
        try {
            const res = await fetch('/api/cart/add', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ listingId: item.listingId || item.id })
            });
            if (res.ok) {
                toast.success('Added to cart');
                refreshCart();
                return true;
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to add to cart');
                return false;
            }
        } catch (error) {
            toast.error('Failed to add to cart');
            return false;
        }
    };

    const removeFromCart = async (listingId: number) => {
        try {
            const res = await fetch(`/api/cart/${listingId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                refreshCart();
            }
        } catch (error) {
            console.error('Failed to remove from cart:', error);
        }
    };

    const clearCart = async () => {
        try {
            const res = await fetch('/api/cart', {
                method: 'DELETE',
                credentials: 'include'
            });
            if (res.ok) {
                setItems([]);
            }
        } catch (error) {
            console.error('Failed to clear cart:', error);
        }
    };

    const isInCart = (listingId: number) => items.some(i => i.listingId === listingId);

    const checkout = async () => true;

    return (
        <CartContext.Provider value={{
            items,
            itemCount: items.length,
            totalPrice: items.reduce((sum, item) => sum + item.price, 0),
            isLoading,
            addToCart,
            removeFromCart,
            clearCart,
            isInCart,
            refreshCart,
            checkout,
        }}>
            {children}
        </CartContext.Provider>
    );
}
