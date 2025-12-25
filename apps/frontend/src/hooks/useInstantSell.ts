import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const API_BASE = '';

export interface InstantSellItem {
    assetId: string;
    appId: number;
    marketHashName: string;
    contextId?: string;
    stickers?: string[];
    float?: number;
}

export interface PriceCheckResult {
    items: Array<{
        marketHashName: string;
        appId: number;
        price?: {
            instantSellPrice: number;
            steam: number;
            suggested: number;
        };
        error?: string;
    }>;
    summary: {
        totalItems: number;
        validItems: number;
        totalPayout: number;
        currency: string;
    };
}

export interface SellResult {
    tradeUuid: string;
    status: string;
    itemCount: number;
    estimatedPayout: number;
    message: string;
}

export function useInstantSell() {
    // Price Check Mutation
    const priceCheckMutation = useMutation({
        mutationFn: async (items: InstantSellItem[]) => {
            const response = await axios.post<{ success: boolean; data: PriceCheckResult }>(
                `${API_BASE}/api/instant/price-check`,
                { items },
                { withCredentials: true }
            );

            if (!response.data.success) {
                throw new Error('Price check failed');
            }

            return response.data.data;
        },
        onError: (error: any) => {
            console.error('Price check error:', error);
            toast.error('Failed to get prices');
        }
    });

    // Sell Mutation
    const sellMutation = useMutation({
        mutationFn: async (payload: { items: InstantSellItem[], tradeUrl?: string }) => {
            const response = await axios.post<{ success: boolean; data: SellResult }>(
                `${API_BASE}/api/instant/sell`,
                payload,
                { withCredentials: true }
            );

            if (!response.data.success) {
                throw new Error((response.data as any).error || 'Sell failed');
            }

            return response.data.data;
        },
        onSuccess: (data) => {
            toast.success('Instant sell offer created! Check your trades.');
        },
        onError: (error: any) => {
            console.error('Sell error:', error);
            toast.error(error.response?.data?.error || 'Failed to create sell offer');
        }
    });

    return {
        checkPrices: priceCheckMutation.mutateAsync,
        sellItems: sellMutation.mutateAsync,
        isChecking: priceCheckMutation.isPending,
        isSelling: sellMutation.isPending,
        priceData: priceCheckMutation.data,
        sellData: sellMutation.data,
    };
}
