'use client';

import { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

interface MainLayoutProps {
  children: ReactNode;
  variant?: 'default' | 'dashboard' | 'admin';
  showHeader?: boolean;
  showFooter?: boolean;
}

export function MainLayout({
  children,
  variant = 'default',
  showHeader = true,
  showFooter = true,
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-900">
      {showHeader && <Header />}

      <main className="flex-1">
        {variant === 'dashboard' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        )}
        {variant === 'admin' && (
          <div className="flex">
            {/* Admin sidebar would go here */}
            <div className="flex-1">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {children}
              </div>
            </div>
          </div>
        )}
        {variant === 'default' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        )}
      </main>

      {showFooter && <Footer />}
    </div>
  );
}

// Convenience variants
export const DashboardLayout = ({ children }: { children: ReactNode }) => (
  <MainLayout variant="dashboard">{children}</MainLayout>
);

export const AdminLayout = ({ children }: { children: ReactNode }) => (
  <MainLayout variant="admin">{children}</MainLayout>
);