'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';

export function HomeCTA() {
    const { user, loginWithSteam } = useAuth();

    return (
        <>
            {!user ? (
                <Button onClick={loginWithSteam} size="lg" className="h-12 px-8 text-lg">
                    Login with Steam to Get Started
                </Button>
            ) : (
                <Link href="/marketplace">
                    <Button size="lg" className="h-12 px-8 text-lg">
                        Go to Marketplace
                    </Button>
                </Link>
            )}
        </>
    );
}
