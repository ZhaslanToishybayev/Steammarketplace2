'use client';

import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover' | 'clickable' | 'glow' | 'bordered' | 'glass' | 'glass-hover' | 'elevated' | 'neon';
  size?: 'sm' | 'md' | 'lg';
  glowColor?: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  rarityGlow?: 'common' | 'uncommon' | 'rare' | 'mythical' | 'legendary' | 'ancient';
  layoutId?: string;
  isLoading?: boolean;
  className?: string;
  children: React.ReactNode;
}

const baseClasses = [
  'relative rounded-lg border bg-gray-800/50 shadow-sm transition-all duration-200',
];

const variants = {
  default: ['border-gray-700'],
  hover: [
    'border-gray-700 hover:border-gray-600 hover:shadow-lg hover:-translate-y-1',
  ],
  clickable: [
    'border-gray-700 cursor-pointer hover:border-orange-500 hover:shadow-orange-500/20 hover:-translate-y-1',
  ],
  glow: ['border-gray-600'],
  bordered: ['border-2 border-gray-600'],
  glass: [
    'bg-gray-800/30 backdrop-blur-md border-gray-700/50 hover:bg-gray-800/40 hover:backdrop-blur-lg',
  ],
  'glass-hover': [
    'bg-gray-800/30 backdrop-blur-md border-gray-700/50 hover:bg-gray-800/40 hover:backdrop-blur-lg hover:-translate-y-2',
  ],
  elevated: [
    'border-gray-700 shadow-xl hover:shadow-2xl hover:-translate-y-2',
  ],
  neon: [
    'border-gray-700 hover:shadow-glow-blue hover:border-blue-500',
  ],
};

const sizes = {
  sm: ['p-3'],
  md: ['p-4'],
  lg: ['p-6'],
};

const glowColors = {
  blue: 'shadow-blue-500/25',
  orange: 'shadow-orange-500/25',
  green: 'shadow-green-500/25',
  purple: 'shadow-purple-500/25',
  red: 'shadow-red-500/25',
};

const rarityGlowColors = {
  common: 'shadow-glow-common',
  uncommon: 'shadow-glow-uncommon',
  rare: 'shadow-glow-rare',
  mythical: 'shadow-glow-mythical',
  legendary: 'shadow-glow-legendary',
  ancient: 'shadow-glow-ancient',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      size = 'md',
      glowColor,
      rarityGlow,
      layoutId,
      isLoading = false,
      className,
      children,
      onClick,
      ...props
    },
    ref
  ) => {
    const cardClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      ...sizes[size],
      glowColor && glowColors[glowColor],
      rarityGlow && rarityGlowColors[rarityGlow],
      isLoading && 'animate-pulse bg-gray-700/50',
      className
    );

    const Component = onClick ? motion.button : motion.div;

    return (
      <Component
        ref={ref}
        layoutId={layoutId}
        className={cardClasses}
        onClick={onClick}
        whileHover={
          (variant === 'hover' || variant === 'clickable' || variant === 'glass-hover' || variant === 'elevated')
            ? {
                scale: variant === 'elevated' ? 1.03 : 1.02,
                translateY: variant === 'elevated' ? -6 : -4
              }
            : undefined
        }
        whileTap={onClick ? { scale: 0.98 } : undefined}
        animate={
          rarityGlow ? {
            scale: [1, 1.02, 1],
            transition: {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }
          } : undefined
        }
        transition={{
          type: 'spring',
          stiffness: variant === 'elevated' ? 300 : 400,
          damping: 17,
        }}
        disabled={isLoading}
        {...(onClick && { type: 'button' })}
        {...props}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="skeleton rounded-full w-8 h-8"></div>
          </div>
        )}
        {!isLoading && children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

// Card sub-components
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex flex-col space-y-1.5 p-4 pb-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={twMerge(
        'text-lg font-semibold leading-none tracking-tight text-white',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  )
);

CardTitle.displayName = 'CardTitle';

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children: React.ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={twMerge('text-sm text-gray-400', className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('p-4 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('flex items-center p-4 pt-0', className)}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';

interface CardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  className?: string;
  src: string;
  alt: string;
}

export const CardImage = forwardRef<HTMLImageElement, CardImageProps>(
  ({ className, ...props }, ref) => (
    <img
      ref={ref}
      className={twMerge('rounded-t-lg', className)}
      {...props}
    />
  )
);

CardImage.displayName = 'CardImage';

// Card variants for common use cases
export const HoverCard = (props: Omit<CardProps, 'variant'>) => (
  <Card variant="hover" {...props} />
);

export const ClickableCard = (props: Omit<CardProps, 'variant'>) => (
  <Card variant="clickable" {...props} />
);

export const GlowingCard = (props: Omit<CardProps, 'variant'> & { glowColor?: NonNullable<CardProps['glowColor']> }) => (
  <Card variant="glow" glowColor={props.glowColor || 'orange'} {...props} />
);