'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info' | 'gray' | 'common' | 'uncommon' | 'rare' | 'mythical' | 'legendary' | 'ancient';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  glow?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

const baseClasses = ['inline-flex items-center rounded-full font-medium'];

const variants = {
  primary: [
    'bg-orange-100 text-orange-800',
    'dark:bg-orange-800 dark:text-orange-100',
  ],
  secondary: [
    'bg-blue-100 text-blue-800',
    'dark:bg-blue-800 dark:text-blue-100',
  ],
  success: [
    'bg-green-100 text-green-800',
    'dark:bg-green-800 dark:text-green-100',
  ],
  warning: [
    'bg-yellow-100 text-yellow-800',
    'dark:bg-yellow-800 dark:text-yellow-100',
  ],
  error: [
    'bg-red-100 text-red-800',
    'dark:bg-red-800 dark:text-red-100',
  ],
  info: [
    'bg-indigo-100 text-indigo-800',
    'dark:bg-indigo-800 dark:text-indigo-100',
  ],
  gray: [
    'bg-gray-100 text-gray-800',
    'dark:bg-gray-800 dark:text-gray-100',
  ],
  // Rarity variants
  common: [
    'bg-rarity-common-600 text-white',
    'shadow-glow-common hover:shadow-glow-common-lg',
  ],
  uncommon: [
    'bg-rarity-uncommon-600 text-white',
    'shadow-glow-uncommon hover:shadow-glow-uncommon-lg',
  ],
  rare: [
    'bg-rarity-rare-600 text-white',
    'shadow-glow-rare hover:shadow-glow-rare-lg',
  ],
  mythical: [
    'bg-rarity-mythical-600 text-white',
    'shadow-glow-mythical hover:shadow-glow-mythical-lg',
  ],
  legendary: [
    'bg-rarity-legendary-600 text-white',
    'shadow-glow-legendary hover:shadow-glow-legendary-lg',
  ],
  ancient: [
    'bg-rarity-ancient-600 text-white',
    'shadow-glow-ancient hover:shadow-glow-ancient-lg',
  ],
};

const sizes = {
  sm: ['text-xs px-2 py-0.5'],
  md: ['text-sm px-2.5 py-1'],
  lg: ['text-base px-3 py-1.5'],
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'primary', size = 'md', dot = false, glow = false, icon, className, children, ...props }, ref) => {
    // Ensure variant exists in the variants object, fallback to 'primary'
    const safeVariant = variants[variant] ? variant : 'primary';

    const badgeClasses = twMerge(
      ...baseClasses,
      ...variants[safeVariant],
      ...sizes[size],
      dot && 'p-1',
      glow && `shadow-glow-${safeVariant} hover:shadow-glow-${safeVariant}-lg`,
      className
    );

    const MotionBadge = motion.span;

    return (
      <MotionBadge
        ref={ref}
        className={badgeClasses}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: 'spring', stiffness: 300 }}
        {...props}
      >
        {dot && <span className="sr-only">Status indicator</span>}
        {!dot && icon && <span className="mr-1">{icon}</span>}
        {!dot && children}
      </MotionBadge>
    );
  }
);

Badge.displayName = 'Badge';

// Badge variants for common use cases
export const PrimaryBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="primary" {...props} />
);

export const SecondaryBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="secondary" {...props} />
);

export const SuccessBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="success" {...props} />
);

export const WarningBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="warning" {...props} />
);

export const ErrorBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="error" {...props} />
);

export const InfoBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="info" {...props} />
);

export const GrayBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="gray" {...props} />
);

// Rarity-specific badge components
export const CommonBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="common" {...props} />
);

export const UncommonBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="uncommon" {...props} />
);

export const RareBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="rare" {...props} />
);

export const MythicalBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="mythical" {...props} />
);

export const LegendaryBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="legendary" {...props} />
);

export const AncientBadge = (props: Omit<BadgeProps, 'variant'>) => (
  <Badge variant="ancient" {...props} />
);