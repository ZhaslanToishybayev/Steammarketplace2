'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'white' | 'orange' | 'green' | 'blue' | 'red';
  fullPage?: boolean;
  text?: string;
  className?: string;
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const variants = {
  default: 'text-orange-500',
  white: 'text-white',
  orange: 'text-orange-500',
  green: 'text-green-500',
  blue: 'text-blue-500',
  red: 'text-red-500',
};

export const LoadingSpinner = forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', variant = 'default', fullPage = false, text, className, ...props }, ref) => {
    const spinnerClasses = twMerge(
      'animate-spin rounded-full border-2 border-gray-300 border-t-transparent',
      sizes[size],
      variants[variant],
      className
    );

    const content = (
      <div ref={ref} className="flex flex-col items-center justify-center" {...props}>
        <div className={spinnerClasses} />
        {text && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{text}</p>}
      </div>
    );

    if (fullPage) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-50 backdrop-blur-sm">
          {content}
        </div>
      );
    }

    return content;
  }
);

LoadingSpinner.displayName = 'LoadingSpinner';

// Convenience components
export const SmallSpinner = (props: Omit<LoadingSpinnerProps, 'size'>) => (
  <LoadingSpinner size="sm" {...props} />
);

export const MediumSpinner = (props: Omit<LoadingSpinnerProps, 'size'>) => (
  <LoadingSpinner size="md" {...props} />
);

export const LargeSpinner = (props: Omit<LoadingSpinnerProps, 'size'>) => (
  <LoadingSpinner size="lg" {...props} />
);

export const XLSpinner = (props: Omit<LoadingSpinnerProps, 'size'>) => (
  <LoadingSpinner size="xl" {...props} />
);

export const FullPageSpinner = (props: Omit<LoadingSpinnerProps, 'fullPage'>) => (
  <LoadingSpinner fullPage {...props} />
);