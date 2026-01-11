
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '';

export function useP2P() {

    // Register API Key
    const registerKey = useMutation({
        mutationFn: async (apiKey: string) => {
            await axios.post(`${API_BASE}/api/p2p/register-key`, { apiKey }, { withCredentials: true });
        }
    });

    // Create P2P Listing (Using Escrow Listing endpoint but with different type)
    // NOTE: We need to update backend escrow route to accept 'p2p_direct' type if not already supported.
    // For now assuming we can pass listing details.

    // Check Key Status
    const { data: hasKeyData, refetch: refetchKeyHeader } = useQuery({
        queryKey: ['p2p', 'hasKey'],
        queryFn: async () => {
            const res = await axios.get(`${API_BASE}/api/p2p/has-key`, { withCredentials: true });
            return res.data;
        }
    });

    const hasApiKey = hasKeyData?.hasKey || false;

    return {
        registerKey,
        hasApiKey,
        refetchKeyHeader
    };
}
