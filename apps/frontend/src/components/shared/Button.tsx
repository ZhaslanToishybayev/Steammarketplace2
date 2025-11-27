'use client';

import React from 'react';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost' | 'link' | 'gradient' | 'neon' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  progress?: number; // 0-100 for progress indicator
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  rippleEffect?: boolean;
  soundFeedback?: boolean;
  shortcut?: string;
  className?: string;
  children: React.ReactNode;
}

const baseClasses = [
  'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
];

const variants = {
  primary: [
    'bg-orange-600 text-white shadow-orange-200',
    'hover:bg-orange-700 hover:shadow-orange-200/50 hover:shadow-glow-orange',
    'focus:ring-orange-500 focus:ring-offset-gray-900 focus:ring-glow-orange',
    'active:bg-orange-800 active:shadow-orange-200/25',
  ],
  secondary: [
    'bg-gray-700 text-gray-100 shadow-gray-200',
    'hover:bg-gray-600 hover:shadow-gray-200/50',
    'focus:ring-gray-500 focus:ring-offset-gray-900',
    'active:bg-gray-800 active:shadow-gray-200/25',
  ],
  success: [
    'bg-green-600 text-white shadow-green-200',
    'hover:bg-green-700 hover:shadow-green-200/50 hover:shadow-glow-green',
    'focus:ring-green-500 focus:ring-offset-gray-900 focus:ring-glow-green',
    'active:bg-green-800 active:shadow-green-200/25',
  ],
  warning: [
    'bg-yellow-600 text-white shadow-yellow-200',
    'hover:bg-yellow-700 hover:shadow-yellow-200/50',
    'focus:ring-yellow-500 focus:ring-offset-gray-900',
    'active:bg-yellow-800 active:shadow-yellow-200/25',
  ],
  error: [
    'bg-red-600 text-white shadow-red-200',
    'hover:bg-red-700 hover:shadow-red-200/50 hover:shadow-glow-red',
    'focus:ring-red-500 focus:ring-offset-gray-900 focus:ring-glow-red',
    'active:bg-red-800 active:shadow-red-200/25',
  ],
  ghost: [
    'bg-transparent text-gray-300 shadow-none',
    'hover:bg-gray-700 hover:text-white hover:shadow-gray-200/25',
    'focus:ring-gray-500 focus:ring-offset-gray-900',
    'active:bg-gray-800',
  ],
  link: [
    'bg-transparent text-orange-500 shadow-none underline',
    'hover:text-orange-400 hover:no-underline',
    'focus:ring-orange-500 focus:ring-offset-gray-900',
    'active:text-orange-600',
  ],
  gradient: [
    'bg-gradient-to-r from-orange-500 via-red-500 to-purple-500 bg-clip-text text-transparent',
    'hover:from-orange-600 hover:via-red-600 hover:to-purple-600',
    'animate-gradient-x',
  ],
  neon: [
    'bg-transparent text-white border-2 border-white/20',
    'hover:text-orange-400 hover:border-orange-400',
    'shadow-glow-blue hover:shadow-glow-blue-lg',
  ],
  glass: [
    'bg-white/10 backdrop-blur-sm border border-white/20 text-white',
    'hover:bg-white/20 hover:border-white/30 hover:shadow-lg',
    'focus:ring-2 focus:ring-white/50',
  ],
};

const sizes = {
  sm: ['text-sm px-3 py-1.5 leading-4'],
  md: ['text-base px-4 py-2'],
  lg: ['text-lg px-6 py-3'],
  xl: ['text-xl px-8 py-4'],
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      isLoading = false,
      loadingText,
      progress,
      leftIcon,
      rightIcon,
      fullWidth = false,
      rippleEffect = true,
      soundFeedback = false,
      shortcut,
      className,
      children,
      disabled,
      onClick,
      onMouseDown,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
    const buttonRef = React.useRef<HTMLButtonElement>(null);
    const rippleIdRef = React.useRef(0);

    const shouldShowLoading = (loading || isLoading) && !disabled;

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (rippleEffect && !disabled && !shouldShowLoading) {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          setRipples(prev => [...prev, { id: rippleIdRef.current++, x, y }]);
        }
      }

      if (soundFeedback && !disabled && !shouldShowLoading) {
        const audio = new Audio();
        audio.volume = 0.1;
        audio.play();
      }

      onClick?.(event);
    };

    const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (rippleEffect && !disabled && !shouldShowLoading) {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (rect) {
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          setRipples(prev => [...prev, { id: rippleIdRef.current++, x, y }]);
        }
      }
      onMouseDown?.(event);
    };

    const removeRipple = (id: number) => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    };

    const buttonClasses = twMerge(
      ...baseClasses,
      ...variants[variant],
      ...sizes[size],
      fullWidth && 'w-full',
      className
    );

    return (
      <motion.button
        ref={ref}
        disabled={disabled || shouldShowLoading}
        className={buttonClasses}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        aria-busy={shouldShowLoading}
        {...props}
      >
        {/* Ripple Effect */}
        <div className="absolute inset-0 overflow-hidden rounded-md">
          {ripples.map(({ id, x, y }) => (
            <motion.span
              key={id}
              className="absolute bg-white/30 rounded-full pointer-events-none"
              style={{
                left: x - 5,
                top: y - 5,
                width: 10,
                height: 10,
              }}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 20, opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              onAnimationComplete={() => removeRipple(id)}
            />
          ))}
        </div>

        {/* Progress Bar Overlay */}
        {progress !== undefined && !shouldShowLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600 rounded-b-md overflow-hidden">
            <motion.div
              className="h-full bg-green-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <AnimatePresence mode="wait" initial={false}>
          {shouldShowLoading ? (
            <motion.div
              key="loading"
              className="flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Enhanced Loading Spinner */}
              <motion.svg
                className={`mr-2 h-4 w-4 ${
                  variant === 'ghost' || variant === 'link' || variant === 'gradient' ? 'text-gray-400' : 'text-white'
                }`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </motion.svg>
              {loadingText || 'Loading...'}
            </motion.div>
          ) : (
            <motion.div
              key="content"
              className="flex items-center justify-center relative z-10"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {leftIcon && (
                <motion.span
                  className="mr-2"
                  animate={{ x: [-5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  {leftIcon}
                </motion.span>
              )}
              <span className="relative">
                {children}
                {shortcut && (
                  <span className="absolute -top-1 -right-1 text-xs bg-black/50 px-1 rounded text-gray-400">
                    {shortcut}
                  </span>
                )}
              </span>
              {rightIcon && (
                <motion.span
                  className="ml-2"
                  animate={{ x: [5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  {rightIcon}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

// Button Group component for grouped buttons
interface ButtonGroupProps {
  children: React.ReactNode;
  size?: ButtonProps['size'];
  className?: string;
}

export const ButtonGroup = ({ children, size = 'md', className }: ButtonGroupProps) => {
  const buttons = React.Children.toArray(children).filter(
    (child) => React.isValidElement(child)
  );

  return (
    <div className={twMerge('inline-flex rounded-md shadow-sm', className)}>
      {buttons.map((child, index) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            size,
            className: twMerge(
              'rounded-none',
              index === 0 && 'rounded-l-md',
              index === buttons.length - 1 && 'rounded-r-md',
              index > 0 && 'border-l-0',
              child.props.className
            ),
          });
        }
        return child;
      })}
    </div>
  );
};

// Button variants for common use cases
export const PrimaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="secondary" {...props} />
);

export const SuccessButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="success" {...props} />
);

export const WarningButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="warning" {...props} />
);

export const ErrorButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="error" {...props} />
);

export const GhostButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="ghost" {...props} />
);

export const LinkButton = (props: Omit<ButtonProps, 'variant'>) => (
  <Button variant="link" {...props} />
);