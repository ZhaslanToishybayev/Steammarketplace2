'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'card' | 'avatar' | 'item';
  width?: string | number;
  height?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'fade' | 'none';
  count?: number; // For multiple skeleton elements
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const baseClasses = ['relative overflow-hidden bg-gray-700 rounded'];

const variants = {
  text: ['h-4', 'animate-pulse'],
  circular: ['rounded-full', 'animate-pulse'],
  rectangular: ['rounded', 'animate-pulse'],
  card: ['rounded-lg', 'animate-pulse'],
  avatar: ['rounded-full border-2 border-gray-600', 'animate-pulse'],
  item: ['rounded-lg aspect-[3/4] bg-gray-700', 'animate-pulse'],
};

const roundedVariants = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      variant = 'text',
      width,
      height,
      className,
      animation = 'wave',
      count = 1,
      rounded = 'md',
      style,
      ...props
    },
    ref
  ) => {
    const skeletonClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      roundedVariants[rounded] || roundedVariants.md,
      animation === 'pulse' && 'animate-pulse',
      animation === 'wave' && 'bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-size-200px animate-[shimmer_2s_infinite]',
      animation === 'fade' && 'animate-pulse opacity-50',
      animation === 'none' && 'bg-gray-700',
      className
    );

    const MotionSkeleton = motion.div;

    const skeletonStyle = {
      width: width || (variant === 'text' ? '100px' : undefined),
      height: height || (variant === 'text' ? '16px' : undefined),
      ...style,
    };

    // Add ARIA attributes for accessibility
    const skeletonProps = {
      'aria-busy': true as const,
      'role': 'status' as const,
      ...props,
    };

    // Handle multiple skeleton elements
    if (count > 1) {
      return (
        <div className="space-y-3" {...skeletonProps}>
          {Array.from({ length: count }, (_, index) => (
            <MotionSkeleton
              key={index}
              ref={index === 0 ? ref : undefined}
              className={skeletonClasses}
              style={skeletonStyle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            />
          ))}
        </div>
      );
    }

    return (
      <MotionSkeleton
        ref={ref}
        className={skeletonClasses}
        style={skeletonStyle}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        {...skeletonProps}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Convenience components for common use cases
export const SkeletonText = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="text" {...props} />
);

export const SkeletonCircular = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="circular" {...props} />
);

export const SkeletonRectangular = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="rectangular" {...props} />
);

export const SkeletonCard = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="card" {...props} />
);

export const SkeletonAvatar = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="avatar" {...props} />
);

export const SkeletonItem = (props: Omit<SkeletonProps, 'variant'>) => (
  <Skeleton variant="item" {...props} />
);

// Composite skeleton components
export const SkeletonTextBlock = ({
  lines = 3,
  className,
  ...props
}: { lines?: number } & Omit<SkeletonProps, 'variant'>) => (
  <div className={twMerge('space-y-2', className)} {...props}>
    {Array.from({ length: lines }, (_, index) => (
      <SkeletonText
        key={index}
        width={index === lines - 1 ? '60%' : undefined}
        {...props}
      />
    ))}
  </div>
);

export const SkeletonCardWithText = ({
  className,
  ...props
}: Omit<SkeletonProps, 'variant'>) => (
  <div className={twMerge('space-y-3', className)} {...props}>
    <SkeletonCard width="100%" height="200px" />
    <SkeletonTextBlock lines={2} />
  </div>
);

export const SkeletonProfile = ({
  className,
  ...props
}: Omit<SkeletonProps, 'variant'>) => (
  <div className={twMerge('flex space-x-3', className)} {...props}>
    <SkeletonAvatar width="60px" height="60px" />
    <div className="flex-1 space-y-2">
      <SkeletonText width="150px" />
      <SkeletonText width="100px" />
      <SkeletonTextBlock lines={3} />
    </div>
  </div>
);

export const SkeletonGrid = ({
  columns = 3,
  rows = 2,
  gap = '4',
  className,
  ...props
}: {
  columns?: number;
  rows?: number;
  gap?: string;
} & Omit<SkeletonProps, 'variant'>) => {
  // Explicit mappings for Tailwind classes
  const gapClasses = {
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '6': 'gap-6',
    '8': 'gap-8',
  };

  const colClasses = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
    5: 'sm:grid-cols-5',
    6: 'sm:grid-cols-6',
  };

  const gridClasses = twMerge(
    'grid',
    gapClasses[gap as keyof typeof gapClasses] || gapClasses['4'],
    colClasses[columns as keyof typeof colClasses] || colClasses[3],
    className
  );

  return (
    <div className={gridClasses} {...props}>
      {Array.from({ length: columns * rows }, (_, index) => (
        <SkeletonItem key={index} {...props} />
      ))}
    </div>
  );
};

// Enhanced skeleton components with better semantics
export const SkeletonPost = ({
  className,
  lines = 5,
  ...props
}: { lines?: number } & Omit<SkeletonProps, 'variant'>) => (
  <div className={twMerge('space-y-4', className)} {...props}>
    <div className="flex space-x-3">
      <SkeletonAvatar size="40px" height="40px" />
      <div className="flex-1 space-y-2">
        <SkeletonText width="150px" />
        <SkeletonText width="100px" />
      </div>
    </div>
    <SkeletonTextBlock lines={lines} {...props} />
    <div className="flex space-x-2">
      <SkeletonRectangular width="60px" height="30px" rounded="full" />
      <SkeletonRectangular width="80px" height="30px" rounded="full" />
    </div>
  </div>
);

export const SkeletonProductCard = ({
  className,
  ...props
}: Omit<SkeletonProps, 'variant'>) => (
  <div className={twMerge('space-y-3', className)} {...props}>
    <SkeletonCard width="100%" height="200px" />
    <div className="space-y-2">
      <SkeletonText width="150px" />
      <SkeletonText width="100px" />
      <SkeletonText width="80px" />
    </div>
    <SkeletonRectangular width="80px" height="30px" rounded="full" />
  </div>
);