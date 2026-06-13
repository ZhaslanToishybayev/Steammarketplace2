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
    },
};

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

export const TradeStatusLabels: Record<string, string> = {
    pending_payment: 'Pending payment',
    payment_received: 'Payment received',
    awaiting_seller: 'Waiting for seller',
    seller_accepted: 'Seller accepted',
    awaiting_buyer: 'Waiting for buyer',
    buyer_accepted: 'Buyer accepted',
    processing: 'Processing',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded',
    disputed: 'Disputed',
    expired: 'Expired',
    error_sending: 'Sending error',
    PAYMENT_RESERVED: 'Payment reserved',
    WAITING_SELLER: 'Waiting for seller',
    TRADE_SENT: 'Trade offer sent',
    TRADE_ACCEPTED: 'Trade accepted',
    SETTLEMENT_PENDING: 'Settlement hold',
    TRADE_COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    REFUNDED: 'Refunded',
    DISPUTED: 'Disputed',
};

export const TradeStatusColors: Record<string, string> = {
    pending_payment: 'bg-yellow-500',
    payment_received: 'bg-blue-500',
    awaiting_seller: 'bg-orange-500',
    seller_accepted: 'bg-cyan-500',
    awaiting_buyer: 'bg-purple-500',
    buyer_accepted: 'bg-indigo-500',
    processing: 'bg-blue-500',
    completed: 'bg-green-500',
    cancelled: 'bg-gray-500',
    refunded: 'bg-red-500',
    disputed: 'bg-red-600',
    expired: 'bg-gray-400',
    error_sending: 'bg-red-500',
    PAYMENT_RESERVED: 'bg-blue-500',
    WAITING_SELLER: 'bg-orange-500',
    TRADE_SENT: 'bg-cyan-500',
    TRADE_ACCEPTED: 'bg-indigo-500',
    SETTLEMENT_PENDING: 'bg-purple-500',
    TRADE_COMPLETED: 'bg-green-500',
    CANCELLED: 'bg-gray-500',
    REFUNDED: 'bg-red-500',
    DISPUTED: 'bg-red-600',
};

export function getTradeStatusInfo(status: string) {
    const finalStatuses = ['completed', 'cancelled', 'refunded', 'expired', 'TRADE_COMPLETED', 'CANCELLED', 'REFUNDED'];
    const errorStatuses = ['cancelled', 'refunded', 'disputed', 'expired', 'CANCELLED', 'REFUNDED', 'DISPUTED', 'error_sending'];

    return {
        label: TradeStatusLabels[status] || status,
        color: TradeStatusColors[status] || 'bg-gray-500',
        isActive: !finalStatuses.includes(status),
        isSuccess: status === 'completed' || status === 'TRADE_COMPLETED',
        isError: errorStatuses.includes(status),
    };
}
