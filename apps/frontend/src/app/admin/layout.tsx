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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !admin && pathname !== '/admin/login') {
            router.push('/admin/login');
        }
    }, [admin, isLoading, pathname, router]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    // Show login page without layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
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
        { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
        { href: '/admin/settings', label: 'Settings', icon: '⚙️' },
        { href: '/admin/logs', label: 'Audit Logs', icon: '📋' },
    ];

    return (
        <div className="min-h-screen bg-gray-900 dark:bg-gray-900 light:bg-gray-100">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                        <span className="text-white font-bold text-sm">A</span>
                    </div>
                    <span className="font-bold text-white">Admin Panel</span>
                </div>
                <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                >
                    {mobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`
                lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-gray-800 border-r border-gray-700
                transform transition-transform duration-300 ease-in-out
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">A</span>
                        </div>
                        <span className="font-bold text-white">Admin Panel</span>
                    </div>
                    <button
                        onClick={() => setMobileMenuOpen(false)}
                        className="text-gray-400 hover:text-white"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                            >
                                <span className="text-lg">{item.icon}</span>
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {admin.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{admin.username}</div>
                            <div className="text-xs text-gray-500">{admin.role}</div>
                        </div>
                        <button
                            onClick={logout}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Desktop Sidebar - Fixed/Sticky */}
            <aside className={`
                hidden lg:flex fixed top-0 left-0 h-screen
                ${sidebarOpen ? 'w-64' : 'w-16'} 
                bg-gray-800 border-r border-gray-700 
                transition-all duration-300 flex-col z-40
            `}>
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center shrink-0">
                        <span className="text-white font-bold">A</span>
                    </div>
                    {sidebarOpen && <span className="font-bold text-white">Admin Panel</span>}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 overflow-y-auto">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                title={!sidebarOpen ? item.label : undefined}
                            >
                                <span className="text-lg">{item.icon}</span>
                                {sidebarOpen && <span>{item.label}</span>}
                            </Link>
                        );
                    })}
                </nav>

                {/* User */}
                <div className="p-4 border-t border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {admin.username[0].toUpperCase()}
                        </div>
                        {sidebarOpen && (
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{admin.username}</div>
                                <div className="text-xs text-gray-500">{admin.role}</div>
                            </div>
                        )}
                        <button
                            onClick={logout}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                            title="Logout"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Toggle Button */}
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="absolute top-20 -right-3 w-6 h-6 bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-600 transition-all"
                >
                    {sidebarOpen ? '←' : '→'}
                </button>
            </aside>

            {/* Main Content */}
            <main className={`
                min-h-screen pt-16 lg:pt-0
                transition-all duration-300
                ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}
            `}>
                <div className="p-4 lg:p-8 overflow-auto">
                    {children}
                </div>
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
