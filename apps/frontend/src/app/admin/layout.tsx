'use client';

import { ReactNode, useEffect } from 'react';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Get active item from current path
  const getActiveItem = () => {
    const pathParts = pathname.split('/').filter(part => part);
    if (pathParts.length >= 2 && pathParts[0] === 'admin') {
      return pathParts[1];
    }
    return 'dashboard';
  };

  const activeItem = getActiveItem();

  // Handle authentication and authorization in useEffect
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/auth/login?redirect=/admin');
      } else if (user.role !== 'admin') {
        router.push('/dashboard');
      }
    }
  }, [user, isLoading, router]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render anything until redirect decision is made
  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <AdminSidebar activeItem={activeItem} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
              <p className="text-gray-400 text-sm">Welcome back, {user.username}</p>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Menu */}
              <div className="relative">
                <button className="flex items-center space-x-2 text-gray-300 hover:text-white transition-colors">
                  <img
                    src={user.avatar || '/api/placeholder/32/32'}
                    alt={user.username}
                    className="w-8 h-8 rounded-full"
                  />
                  <span className="text-sm font-medium">{user.username}</span>
                </button>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => {
                  // Handle logout
                  router.push('/auth/logout');
                }}
                className="px-3 py-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}