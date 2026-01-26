'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useWallet } from '../../lib/useWallet';
import { Button } from '../ui';
import { CartButton, CartDrawer } from '../CartDrawer';
import { NotificationCenter } from '../NotificationCenter';
import { Menu, X, LogOut, Store, Tag, ArrowLeftRight, BarChart3 } from 'lucide-react';

const navLinks = [
    { href: '/marketplace', label: 'Marketplace', icon: Store },
    { href: '/sell', label: 'Sell Items', icon: Tag },
    { href: '/my-trades', label: 'My Trades', icon: ArrowLeftRight },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

export function Navbar() {
    const { user, loginWithSteam, logout } = useAuth();
    const { balance } = useWallet();
    const [cartOpen, setCartOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleCheckout = async () => {
        setCartOpen(false);
    };

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-50 bg-[#0D0D12]/90 backdrop-blur-xl border-b border-[#FF8C00]/10">
                <div className="container mx-auto px-4 md:px-6">
                    <div className="flex justify-between items-center h-16">
                        {/* Logo */}
                        <Link href="/" className="flex items-center gap-3 group">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shadow-[#FF8C00]/20 group-hover:shadow-[#FF8C00]/40 transition-all duration-300 group-hover:scale-105">
                                <img
                                    src="/logo.png"
                                    alt="SGOMarket"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <span className="text-xl font-bold text-foreground hidden sm:block">
                                SGO<span className="text-[#FF8C00]">Market</span>
                            </span>
                        </Link>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-muted-foreground hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 transition-all duration-200 font-medium"
                                    >
                                        <Icon className="w-4 h-4" />
                                        {link.label}
                                    </Link>
                                );
                            })}
                        </nav>

                        {/* User Section */}
                        <div className="flex items-center gap-2 md:gap-3">
                            {user ? (
                                <>
                                    <NotificationCenter steamId={user.steamId} />
                                    <CartButton onClick={() => setCartOpen(true)} />

                                    {/* Balance - Visible on all devices, clickable */}
                                    <Link href="/wallet" className="flex items-center gap-1 bg-[#4CAF50]/10 hover:bg-[#4CAF50]/20 transition-colors text-[#4CAF50] px-3 py-1.5 rounded-lg font-mono font-bold border border-[#4CAF50]/20 text-sm">
                                        <span className="text-[#4CAF50]/60">$</span>
                                        {balance.toFixed(2)}
                                        <span className="ml-1 text-[10px] bg-[#4CAF50] text-[#0D0D12] px-1 rounded-sm">+</span>
                                    </Link>

                                    {/* User Avatar - Desktop */}
                                    <Link
                                        href="/profile"
                                        className="hidden md:flex items-center gap-3 hover:bg-[#FF8C00]/10 px-3 py-2 rounded-lg transition-colors"
                                    >
                                        <img
                                            src={user.avatar}
                                            alt={user.username}
                                            className="h-8 w-8 rounded-lg ring-2 ring-[#FF8C00]/30"
                                        />
                                        <span className="text-sm font-medium">{user.username}</span>
                                    </Link>

                                    {/* Logout - Desktop */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={logout}
                                        className="hidden md:flex text-muted-foreground hover:text-[#EF4444] hover:bg-[#EF4444]/10"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </Button>
                                </>
                            ) : (
                                <div className="relative group">
                                    {/* Animated glow background */}
                                    <div className="absolute -inset-1 bg-gradient-to-r from-[#FF8C00] via-[#FFA500] to-[#E67E00] rounded-lg blur-md opacity-50 group-hover:opacity-75 animate-pulse-glow"></div>
                                    <Button
                                        onClick={loginWithSteam}
                                        className="relative hidden md:flex bg-gradient-to-r from-[#FF8C00] to-[#E67E00] hover:from-[#FFA500] hover:to-[#FF8C00] text-white font-semibold overflow-hidden"
                                    >
                                        {/* Shimmer effect */}
                                        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                                        <svg className="w-5 h-5 mr-2" viewBox="0 0 256 259" fill="currentColor">
                                            <path d="M127.779 0C59.034 0 3.093 50.633.155 116.014l68.573 28.352c5.827-3.987 12.854-6.327 20.434-6.327 1.078 0 2.141.046 3.189.136l30.566-44.288v-.621c0-26.957 21.924-48.889 48.874-48.889 26.949 0 48.869 21.932 48.869 48.889 0 26.958-21.92 48.898-48.87 48.898h-1.136l-43.551 31.104c.054.872.091 1.752.091 2.64 0 20.199-16.404 36.61-36.601 36.61-17.993 0-32.966-13.006-36.046-30.127L4.593 155.516C22.931 213.279 77.08 256.322 141.089 258.09l-13.31-58.953c17.993-.174 32.494-13.324 35.256-30.478l51.191-21.168C243.363 125.054 256.001 95.55 256.001 63.378c0-44.242-28.619-81.875-68.343-95.233L127.779 0z" />
                                        </svg>
                                        Login with Steam
                                    </Button>
                                </div>
                            )}

                            {/* Mobile Menu Button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden text-muted-foreground hover:text-[#FF8C00] hover:bg-[#FF8C00]/10"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-[#FF8C00]/10 bg-[#0D0D12]/95 backdrop-blur-xl">
                        <div className="container mx-auto px-4 py-4">
                            <nav className="flex flex-col gap-1">
                                {navLinks.map((link) => {
                                    const Icon = link.icon;
                                    return (
                                        <Link
                                            key={link.href}
                                            href={link.href}
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:text-[#FF8C00] hover:bg-[#FF8C00]/10 transition-all duration-200 font-medium"
                                        >
                                            <Icon className="w-5 h-5" />
                                            {link.label}
                                        </Link>
                                    );
                                })}

                                {/* Mobile User Section */}
                                {user ? (
                                    <>
                                        <div className="h-px bg-[#FF8C00]/10 my-2" />
                                        <Link
                                            href="/profile"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#FF8C00]/10 transition-colors"
                                        >
                                            <img
                                                src={user.avatar}
                                                alt={user.username}
                                                className="h-10 w-10 rounded-lg ring-2 ring-[#FF8C00]/30"
                                            />
                                            <div>
                                                <div className="font-medium">{user.username}</div>
                                                <div className="text-sm text-[#22C55E] font-mono">${balance.toFixed(2)}</div>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors font-medium w-full text-left"
                                        >
                                            <LogOut className="w-5 h-5" />
                                            Logout
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-px bg-[#FF8C00]/10 my-2" />
                                        <Button
                                            onClick={() => {
                                                loginWithSteam();
                                                setMobileMenuOpen(false);
                                            }}
                                            className="w-full bg-gradient-to-r from-[#FF8C00] to-[#E67E00] hover:from-[#FFA500] hover:to-[#FF8C00] text-white font-semibold"
                                        >
                                            <svg className="w-5 h-5 mr-2" viewBox="0 0 256 259" fill="currentColor">
                                                <path d="M127.779 0C59.034 0 3.093 50.633.155 116.014l68.573 28.352c5.827-3.987 12.854-6.327 20.434-6.327 1.078 0 2.141.046 3.189.136l30.566-44.288v-.621c0-26.957 21.924-48.889 48.874-48.889 26.949 0 48.869 21.932 48.869 48.889 0 26.958-21.92 48.898-48.87 48.898h-1.136l-43.551 31.104c.054.872.091 1.752.091 2.64 0 20.199-16.404 36.61-36.601 36.61-17.993 0-32.966-13.006-36.046-30.127L4.593 155.516C22.931 213.279 77.08 256.322 141.089 258.09l-13.31-58.953c17.993-.174 32.494-13.324 35.256-30.478l51.191-21.168C243.363 125.054 256.001 95.55 256.001 63.378c0-44.242-28.619-81.875-68.343-95.233L127.779 0z" />
                                            </svg>
                                            Login with Steam
                                        </Button>
                                    </>
                                )}
                            </nav>
                        </div>
                    </div>
                )}
            </header>

            <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} onCheckout={handleCheckout} />
        </>
    );
}
