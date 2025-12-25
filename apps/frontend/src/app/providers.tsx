'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ThemeProvider } from '../providers/ThemeProvider';
import { CustomToastProvider } from '../providers/ToastProvider';
import { CartProvider } from '../hooks/useCart';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            staleTime: 60 * 1000,
        },
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <CartProvider>
                    <CustomToastProvider>
                        {!mounted ? (
                            <div suppressHydrationWarning>
                                {children}
                            </div>
                        ) : (
                            children
                        )}
                    </CustomToastProvider>
                </CartProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
