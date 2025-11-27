'use client';

import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { twMerge } from 'tailwind-merge';

interface EmptyStateProps {
  icon?: 'inventory' | 'trades' | 'market' | 'search' | 'error' | 'success' | string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const icons = {
  inventory: (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4h-2v4m0 0h-2m-4-4v4m-2-4v.01" />
    </svg>
  ),
  trades: (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  market: (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  search: (
    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  error: (
    <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 13l4 4L19 7" />
    </svg>
  ),
};

export function EmptyState({
  icon = 'inventory',
  title,
  description,
  action,
  children,
  className,
}: EmptyStateProps) {
  const selectedIcon = typeof icon === 'string' && icons[icon as keyof typeof icons] ? icons[icon as keyof typeof icons] : icon;

  return (
    <div className={twMerge('text-center py-12 px-4', className)}>
      {/* Icon */}
      <div className="flex justify-center mb-4">
        {typeof selectedIcon === 'string' ? (
          <div className="w-12 h-12 text-gray-400 flex items-center justify-center text-4xl">
            {selectedIcon}
          </div>
        ) : (
          selectedIcon
        )}
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-gray-400 mb-6 max-w-md mx-auto">{description}</p>
      )}

      {/* Custom Content */}
      {children}

      {/* Action */}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  );
}