
import { useState, useEffect } from 'react';
import { apiClient as api } from './api';

export interface WalletState {
    balance: number;
    currency: string;
    loading: boolean;
    error: string | null;
}

export function useWallet() {
    const [state, setState] = useState<WalletState>({
        balance: 0,
        currency: 'USD',
        loading: true,
        error: null,
    });

    const fetchBalance = async () => {
        try {
            setState(prev => ({ ...prev, loading: true }));
            // Fix: Use specific method
            const res = await api.getWalletBalance();
            if (res.success) {
                setState({
                    balance: res.balance,
                    currency: res.currency,
                    loading: false,
                    error: null,
                });
            } else {
                setState(prev => ({ ...prev, balance: 0, loading: false }));
            }
        } catch (err: any) {
            setState(prev => ({ ...prev, loading: false, balance: 0 }));
        }
    };

    /**
     * Debug only: Deposit fake money
     */
    const debugDeposit = async (amount: number) => {
        try {
            await api.debugDeposit(amount);
            await fetchBalance();
            return true;
        } catch (err) {
            console.error('Deposit failed', err);
            return false;
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    return {
        ...state,
        refreshBalance: fetchBalance,
        debugDeposit,
    };
}
