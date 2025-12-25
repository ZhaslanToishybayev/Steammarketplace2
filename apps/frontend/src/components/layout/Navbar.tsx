'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../lib/useWallet';
import { Button } from '../ui';
import { CartButton, CartDrawer } from '../CartDrawer';
import { NotificationCenter } from '../NotificationCenter';

export function Navbar() {
    const { user, loginWithSteam, logout } = useAuth();
    const { balance } = useWallet();
    const [cartOpen, setCartOpen] = useState(false);

    const handleCheckout = async () => {
        setCartOpen(false);
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                                <span className="text-primary font-bold text-xl">S</span>
                            </div>
                            <span className="text-xl font-bold text-foreground font-inter">SteamMarket</span>
                        </Link>

                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <Link href="/marketplace" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                                Marketplace
                            </Link>
                            <Link href="/sell" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                                Sell Items
                            </Link>
                            <Link href="/my-trades" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
                                My Trades
                            </Link>
                        </nav>

                        {/* User Section */}
                        {user ? (
                            <div className="flex items-center gap-3">
                                <NotificationCenter steamId={user.steamId} />
                                <CartButton onClick={() => setCartOpen(true)} />
                                <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-md font-mono font-bold border border-green-500/20">
                                    ${balance.toFixed(2)}
                                </div>
                                <Link
                                    href="/profile"
                                    className="flex items-center gap-3 hover:bg-accent px-3 py-2 rounded-md transition-colors"
                                >
                                    <img
                                        src={user.avatar}
                                        alt={user.username}
                                        className="h-8 w-8 rounded-full ring-2 ring-border"
                                    />
                                    <span className="text-sm font-medium hidden sm:block">{user.username}</span>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={logout}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                </Button>
                            </div>
                        ) : (
                            <Button onClick={loginWithSteam}>
                                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
                                </svg>
                                Login with Steam
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />
        </>
    );
}
