'use client';

import React, { useId } from 'react';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  delay?: number;
  className?: string;
  arrow?: boolean;
  maxWidth?: string;
  disabled?: boolean;
  variant?: 'default' | 'light' | 'info' | 'warning' | 'error';
  touchFriendly?: boolean;
}

export const Tooltip = ({
  content,
  children,
  placement = 'auto',
  delay = 200,
  className,
  arrow = true,
  maxWidth = '250px',
  disabled = false,
  variant = 'default',
  touchFriendly = false,
}: TooltipProps) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [autoPlacement, setAutoPlacement] = React.useState(placement);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const tooltipRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const touchTimeoutRef = React.useRef<NodeJS.Timeout>();
  const tooltipId = useId();

  const showTooltip = () => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      calculatePosition();
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (touchTimeoutRef.current) {
      clearTimeout(touchTimeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleTouch = () => {
    if (disabled || !touchFriendly) return;

    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
      // Auto-hide after 3 seconds for touch devices
      touchTimeoutRef.current = setTimeout(() => {
        hideTooltip();
      }, 3000);
    }
  };

  const calculatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;
    let finalPlacement = placement === 'auto' ? 'top' : placement;

    // Calculate positions for all placements to find the best one
    const placements = {
      top: {
        top: triggerRect.top - tooltipRect.height - 8,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      bottom: {
        top: triggerRect.bottom + 8,
        left: triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2,
      },
      left: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.left - tooltipRect.width - 8,
      },
      right: {
        top: triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2,
        left: triggerRect.right + 8,
      },
    };

    // If auto placement, find the best position
    if (placement === 'auto') {
      for (const [pos, calc] of Object.entries(placements)) {
        const adjustedLeft = Math.max(8, Math.min(calc.left, viewportWidth - tooltipRect.width - 8));
        const adjustedTop = Math.max(8, Math.min(calc.top, viewportHeight - tooltipRect.height - 8));

        if (adjustedLeft === calc.left && adjustedTop === calc.top) {
          finalPlacement = pos as 'top' | 'bottom' | 'left' | 'right';
          top = calc.top;
          left = calc.left;
          break;
        }
      }
    } else {
      top = placements[finalPlacement].top;
      left = placements[finalPlacement].left;
    }

    setAutoPlacement(finalPlacement);

    // Adjust position to prevent overflow
    left = Math.max(8, Math.min(left, viewportWidth - tooltipRect.width - 8));
    top = Math.max(8, Math.min(top, viewportHeight - tooltipRect.height - 8));

    setPosition({ top, left });
  };

  // Handle keyboard focus
  const handleFocus = () => {
    if (disabled) return;
    showTooltip();
  };

  const handleBlur = () => {
    hideTooltip();
  };

  // Clone child to add event handlers
  const clonedChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        ref: triggerRef,
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: handleFocus,
        onBlur: handleBlur,
        onTouchStart: touchFriendly ? handleTouch : undefined,
        'aria-describedby': isVisible ? tooltipId : undefined,
      })
    : children;

  // Tooltip variant styles
  const getVariantClasses = () => {
    switch (variant) {
      case 'light':
        return 'bg-white text-gray-900 shadow-lg border border-gray-200';
      case 'info':
        return 'bg-blue-600 text-white shadow-lg';
      case 'warning':
        return 'bg-yellow-600 text-white shadow-lg';
      case 'error':
        return 'bg-red-600 text-white shadow-lg';
      case 'default':
      default:
        return 'bg-gray-800/90 backdrop-blur-md text-white';
    }
  };

  // Arrow positioning
  const getArrowClasses = () => {
    const baseClasses = `absolute w-2 h-2 ${variant === 'light' ? 'bg-white' : 'bg-gray-800/90'} backdrop-blur-sm rotate-45`;
    switch (autoPlacement) {
      case 'top':
        return `${baseClasses} bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2`;
      case 'bottom':
        return `${baseClasses} top-0 left-1/2 -translate-x-1/2 -translate-y-1/2`;
      case 'left':
        return `${baseClasses} right-0 top-1/2 -translate-y-1/2 translate-x-1/2`;
      case 'right':
        return `${baseClasses} left-0 top-1/2 -translate-y-1/2 -translate-x-1/2`;
      default:
        return baseClasses;
    }
  };

  // Animation variants with slide effect
  const getAnimationVariants = () => {
    switch (autoPlacement) {
      case 'top':
        return {
          initial: { opacity: 0, y: 8, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: 8, scale: 0.95 },
        };
      case 'bottom':
        return {
          initial: { opacity: 0, y: -8, scale: 0.95 },
          animate: { opacity: 1, y: 0, scale: 1 },
          exit: { opacity: 0, y: -8, scale: 0.95 },
        };
      case 'left':
        return {
          initial: { opacity: 0, x: 8, scale: 0.95 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: 8, scale: 0.95 },
        };
      case 'right':
        return {
          initial: { opacity: 0, x: -8, scale: 0.95 },
          animate: { opacity: 1, x: 0, scale: 1 },
          exit: { opacity: 0, x: -8, scale: 0.95 },
        };
      default:
        return {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          exit: { opacity: 0, scale: 0.95 },
        };
    }
  };

  if (disabled) {
    return <>{clonedChild}</>;
  }

  return (
    <>
      {clonedChild}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className={twMerge(
              'fixed z-50 rounded-lg px-3 py-2',
              getVariantClasses(),
              className
            )}
            style={{
              top: position.top,
              left: position.left,
              maxWidth,
            }}
            variants={getAnimationVariants()}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {content}
            {arrow && <div className={getArrowClasses()} />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// Specialized tooltip variants
export const InfoTooltip = ({
  content,
  children,
  className,
  ...props
}: Omit<TooltipProps, 'content'> & { content: string }) => (
  <Tooltip
    content={
      <div className="flex items-center space-x-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{content}</span>
      </div>
    }
    className={twMerge('max-w-xs', className)}
    {...props}
  />
);

export const PriceTooltip = ({
  price,
  change,
  children,
  className,
  ...props
}: Omit<TooltipProps, 'content'> & {
  price: string;
  change?: { value: number; percentage: number };
}) => (
  <Tooltip
    content={
      <div className="text-right">
        <div className="font-semibold">{price}</div>
        {change && (
          <div
            className={`text-sm ${
              change.value >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {change.value >= 0 ? '+' : ''}
            {change.value.toFixed(2)} ({change.value >= 0 ? '+' : ''}
            {change.percentage.toFixed(1)}%)
          </div>
        )}
      </div>
    }
    className={twMerge('font-mono', className)}
    {...props}
  />
);

export const ItemTooltip = ({
  item,
  children,
  className,
  ...props
}: Omit<TooltipProps, 'content'> & {
  item: {
    name: string;
    image: string;
    price: string;
    rarity: string;
    float?: number;
    stickers?: any[];
  };
}) => (
  <Tooltip
    content={
      <div className="w-64 space-y-2">
        <div className="flex items-center space-x-3">
          <img
            src={item.image}
            alt={item.name}
            className="w-16 h-16 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{item.name}</div>
            <div className="text-sm text-gray-300 capitalize">{item.rarity}</div>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-bold text-green-400">{item.price}</span>
          {item.float && (
            <span className="text-sm text-gray-300">
              Float: {item.float.toFixed(4)}
            </span>
          )}
        </div>
        {item.stickers && item.stickers.length > 0 && (
          <div className="flex space-x-1">
            {item.stickers.slice(0, 3).map((sticker, index) => (
              <img
                key={index}
                src={sticker.image}
                alt={sticker.name}
                className="w-6 h-6 object-cover rounded"
              />
            ))}
            {item.stickers.length > 3 && (
              <span className="text-xs text-gray-400">
                +{item.stickers.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    }
    className={twMerge('p-0', className)}
    {...props}
  />
);