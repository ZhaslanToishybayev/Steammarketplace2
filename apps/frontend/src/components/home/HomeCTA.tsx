'use client';

import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { Button, SteamLoginButton } from '../ui';
import { ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function HomeCTA() {
    const { user, loginWithSteam } = useAuth();

    return (
        <>
            {!user ? (
                <SteamLoginButton onClick={loginWithSteam} size="lg" />
            ) : (
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex justify-center"
                >
                    <Link href="/marketplace">
                        <Button
                            size="lg"
                            className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-[#FF8C00] to-[#E67E00] hover:from-[#FFA500] hover:to-[#FF8C00] text-white shadow-lg shadow-[#FF8C00]/30 flex items-center gap-3"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 256 259" fill="currentColor">
                                <path d="M127.779 0C59.034 0 3.093 50.633.155 116.014l68.573 28.352c5.827-3.987 12.854-6.327 20.434-6.327 1.078 0 2.141.046 3.189.136l30.566-44.288v-.621c0-26.957 21.924-48.889 48.874-48.889 26.949 0 48.869 21.932 48.869 48.889 0 26.958-21.92 48.898-48.87 48.898h-1.136l-43.551 31.104c.054.872.091 1.752.091 2.64 0 20.199-16.404 36.61-36.601 36.61-17.993 0-32.966-13.006-36.046-30.127L4.593 155.516C22.931 213.279 77.08 256.322 141.089 258.09l-13.31-58.953c17.993-.174 32.494-13.324 35.256-30.478l51.191-21.168C243.363 125.054 256.001 95.55 256.001 63.378c0-44.242-28.619-81.875-68.343-95.233L127.779 0z" />
                            </svg>
                            Go to Marketplace
                            <ArrowRight className="w-5 h-5" />
                        </Button>
                    </Link>
                </motion.div>
            )}
        </>
    );
}
