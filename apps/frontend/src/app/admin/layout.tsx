'use client';

import { AdminAuthProvider, useAdminAuth } from '../../hooks/useAdminAuth';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

function AdminLayoutContent({ children }: { children: ReactNode }) {
    const { admin, isLoading, logout } = useAdminAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (!isLoading && !admin && pathname !== '/admin/login') {
            router.push('/admin/login');
        }
    }, [admin, isLoading, pathname, router]);

    // Show login page without layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!admin) {
        return null;
    }

    const navItems = [
        { href: '/admin', label: 'Dashboard', icon: '📊' },
        { href: '/admin/users', label: 'Users', icon: '👥' },
        { href: '/admin/listings', label: 'Listings', icon: '📦' },
        { href: '/admin/trades', label: 'Trades', icon: '🔄' },
        { href: '/admin/bots', label: 'Bots', icon: '🤖' },
        { href: '/admin/logs', label: 'Audit Logs', icon: '📋' },
    ];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-[var(--bg-secondary)] border-r border-[var(--border-default)] transition-all duration-300 flex flex-col`}>
                {/* Header */}
                <div className="p-4 border-b border-[var(--border-default)] flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-orange)] rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">A</span>
                    </div>
                    {sidebarOpen && <span className="font-bold text-white">Admin Panel</span>}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${isActive
                                        ? 'bg-[var(--accent-blue)] text-white'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-white'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {sidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-[var(--border-default)]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--accent-blue)] rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {admin.username[0].toUpperCase()}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{admin.username}</div>
                                <div className="text-xs text-[var(--text-muted)]">{admin.role}</div>
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-colors"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Toggle */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-20 -right-3 w-6 h-6 bg-[var(--bg-tertiary)] border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-white"
                >
                    {sidebarOpen ? '←' : '→'}
                </button>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-auto">
                {children}
            </main>
        </div>
    );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
    return (
        <AdminAuthProvider>
            <AdminLayoutContent>{children}</AdminLayoutContent>
        </AdminAuthProvider>
    );
}
