'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Marketplace Error:', error);
    }, [error]);

    return (
        <div className="container mx-auto px-6 py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <p className="text-muted-foreground mb-8">{error.message}</p>
            <button
                onClick={() => reset()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
            >
                Try again
            </button>
        </div>
    );
}
