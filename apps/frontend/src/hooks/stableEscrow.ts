/**
 * stableEscrow.ts
 * Simplified, stable version of escrow hooks to fix runtime errors
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { apiClient } from '../lib/api';

export const escrowApi = {
    getListings: async (params?: any) => {
        return apiClient.escrow.getListings(params);
    },
    getListing: async (id: string | number) => {
        return apiClient['request'](`/escrow/listings/${id}`, { credentials: 'include' });
    },
    buyListing: async (listingId: string) => {
        return apiClient.escrow.buyListing(listingId);
    },
    getTrades: async (params?: any) => {
        const queryParams = new URLSearchParams(params);
        return apiClient['request'](`/escrow/trades?${queryParams}`, { credentials: 'include' });
    },
    getTrade: async (tradeUuid: string) => {
        return apiClient['request'](`/escrow/trades/${tradeUuid}`, { credentials: 'include' });
    },
    cancelTrade: async (tradeUuid: string, reason?: string) => {
        return apiClient.escrow.cancelTrade(tradeUuid);
    },
    payTrade: async (tradeUuid: string, paymentData: any) => {
        return apiClient['request'](`/escrow/trades/${tradeUuid}/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(paymentData),
        });
    }
};

// Hooks
export function useListings(params?: any) {
    return useQuery({
        queryKey: ['escrow', 'listings', params],
        queryFn: () => escrowApi.getListings(params),
    });
}

export function useListing(id: string | number) {
    return useQuery({
        queryKey: ['escrow', 'listing', id],
        queryFn: () => escrowApi.getListing(id),
        enabled: !!id,
    });
}

export function useTrades(params?: any) {
    return useQuery({
        queryKey: ['escrow', 'trades', params],
        queryFn: () => escrowApi.getTrades(params),
    });
}

export function useTrade(tradeUuid: string) {
    const queryClient = useQueryClient();
    useEffect(() => {
        if (!tradeUuid) return;
        // real-time logic stub
    }, [tradeUuid, queryClient]);

    return useQuery({
        queryKey: ['escrow', 'trade', tradeUuid],
        queryFn: () => escrowApi.getTrade(tradeUuid),
        enabled: !!tradeUuid,
        refetchInterval: 10000,
    });
}

export function useBuyListing() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: escrowApi.buyListing,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['escrow', 'listings'] });
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trades'] });
        },
    });
}

export function usePayTrade() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tradeUuid, paymentData }: any) => escrowApi.payTrade(tradeUuid, paymentData),
        onSuccess: (_, { tradeUuid }: any) => {
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trade', tradeUuid] });
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trades'] });
        },
    });
}

export function useCancelTrade() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ tradeUuid, reason }: any) => escrowApi.cancelTrade(tradeUuid, reason),
        onSuccess: (_, { tradeUuid }: any) => {
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trade', tradeUuid] });
            queryClient.invalidateQueries({ queryKey: ['escrow', 'trades'] });
        },
    });
}

// Status Helpers
export const TradeStatusLabels: Record<string, string> = {
    pending_payment: 'Ожидание оплаты',
    payment_received: 'Оплата получена',
    awaiting_seller: 'Ожидание продавца',
    seller_accepted: 'Продавец подтвердил',
    awaiting_buyer: 'Ожидание покупателя',
    buyer_accepted: 'Покупатель подтвердил',
    completed: 'Завершено',
    cancelled: 'Отменено',
    refunded: 'Возврат средств',
    disputed: 'Спор',
    expired: 'Истекло',
    'error_sending': 'Ошибка отправки'
};

export const TradeStatusColors: Record<string, string> = {
    pending_payment: 'bg-yellow-500',
    payment_received: 'bg-blue-500',
    awaiting_seller: 'bg-orange-500',
    seller_accepted: 'bg-cyan-500',
    awaiting_buyer: 'bg-purple-500',
    buyer_accepted: 'bg-indigo-500',
    completed: 'bg-green-500',
    cancelled: 'bg-gray-500',
    refunded: 'bg-red-500',
    disputed: 'bg-red-600',
    expired: 'bg-gray-400',
};

export function getTradeStatusInfo(status: string) {
    return {
        label: TradeStatusLabels[status] || status,
        color: TradeStatusColors[status] || 'bg-gray-500',
        isActive: !['completed', 'cancelled', 'refunded', 'expired'].includes(status),
        isSuccess: status === 'completed',
        isError: ['cancelled', 'refunded', 'disputed', 'expired'].includes(status),
    };
}
