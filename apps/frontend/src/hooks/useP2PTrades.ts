import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useP2PTrades(params?: Record<string, string>) {
    return useQuery({
        queryKey: ['p2p', 'trades', params],
        queryFn: () => apiClient.p2p.getTrades(params),
    });
}

export function useP2PTrade(tradeUuid: string) {
    return useQuery({
        queryKey: ['p2p', 'trade', tradeUuid],
        queryFn: () => apiClient.p2p.getTrade(tradeUuid),
        enabled: !!tradeUuid,
        refetchInterval: 10000, // auto-poll every 10s
    });
}

export function useCancelP2PTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ tradeUuid, reason }: { tradeUuid: string; reason?: string }) =>
            apiClient.p2p.cancelTrade(tradeUuid, reason),
        onSuccess: (_, { tradeUuid }) => {
            qc.invalidateQueries({ queryKey: ['p2p', 'trade', tradeUuid] });
            qc.invalidateQueries({ queryKey: ['p2p', 'trades'] });
        },
    });
}

export function useSyncP2PTrade() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (tradeUuid: string) => apiClient.p2p.syncTrade(tradeUuid),
        onSuccess: (_, tradeUuid) => {
            qc.invalidateQueries({ queryKey: ['p2p', 'trade', tradeUuid] });
        },
    });
}

export function useMarkSellerSent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ tradeUuid, tradeOfferId }: { tradeUuid: string; tradeOfferId?: string }) =>
            apiClient.p2p.markSellerSent(tradeUuid, tradeOfferId),
        onSuccess: (_, { tradeUuid }) => {
            qc.invalidateQueries({ queryKey: ['p2p', 'trade', tradeUuid] });
            qc.invalidateQueries({ queryKey: ['p2p', 'trades'] });
        },
    });
}
