import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';

export function useP2P() {
    const qc = useQueryClient();

    // Register API Key
    const registerKey = useMutation({
        mutationFn: async (apiKey: string) => {
            // Use fetch directly since there's no public method for register-key yet
            const res = await fetch('/api/p2p/register-key', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ apiKey }),
            });
            if (!res.ok) throw new Error('Failed to register key');
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['p2p', 'hasKey'] });
        },
    });

    // Check Key Status
    const { data: hasKeyData, refetch: refetchKeyHeader } = useQuery({
        queryKey: ['p2p', 'hasKey'],
        queryFn: () => apiClient.p2p.hasKey(),
    });

    const hasApiKey = hasKeyData?.hasKey || false;

    return {
        registerKey,
        hasApiKey,
        refetchKeyHeader,
    };
}
