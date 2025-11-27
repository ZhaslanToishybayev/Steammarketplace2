'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/shared/Button';
import { useGesture } from '@use-gesture/react';
import { twMerge } from 'tailwind-merge';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'default' | 'filter' | 'menu' | 'modal';
  height?: 'auto' | 'min' | 'mid' | 'max' | 'full';
  snapPoints?: ('min' | 'mid' | 'max' | number)[];
  initialSnap?: number;
  className?: string;
  showHandle?: boolean;
  closeOnOutsideClick?: boolean;
  closeOnSwipeDown?: boolean;
  preventScroll?: boolean;
  enableMomentum?: boolean;
  enableDrag?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'default',
  height = 'auto',
  snapPoints = ['min', 'mid', 'max'],
  initialSnap = 1,
  className,
  showHandle = true,
  closeOnOutsideClick = true,
  closeOnSwipeDown = true,
  preventScroll = true,
  enableMomentum = true,
  enableDrag = true,
}) => {
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [currentSnap, setCurrentSnap] = React.useState(initialSnap);
  const [isDragging, setIsDragging] = React.useState(false);
  const [contentScrollTop, setContentScrollTop] = React.useState(0);

  // Define snap point heights
  const getSnapPointHeight = (point: 'min' | 'mid' | 'max' | number) => {
    switch (point) {
      case 'min':
        return 200;
      case 'mid':
        return 400;
      case 'max':
        return 600;
      default:
        return point;
    }
  };

  // Calculate sheet height based on props
  const getSheetHeight = () => {
    if (height === 'full') return '100vh';
    if (height === 'min') return '200px';
    if (height === 'mid') return '400px';
    if (height === 'max') return '600px';
    if (height === 'auto' && snapPoints.length > 0) {
      const point = snapPoints[currentSnap];
      return `${getSnapPointHeight(point)}px`;
    }
    return '400px';
  };

  // Handle drag gestures with improved momentum
  const bind = useGesture({
    onDrag: ({
      down,
      delta: [, y],
      velocity: [, vy],
      direction: [, dy],
      distance,
      cancel,
      offset: [, offset],
    }) => {
      if (!sheetRef.current || !enableDrag) return;

      setIsDragging(down);

      if (down) {
        // Calculate new position with momentum
        const targetHeight = getSnapPointHeight(snapPoints[currentSnap] || 'mid');
        const newPosition = targetHeight + offset;

        // Apply resistance when dragging beyond bounds
        const minBound = 50; // Minimum height in pixels
        const maxBound = window.innerHeight * 0.9; // 90% of viewport height

        if (newPosition < minBound || newPosition > maxBound) {
          cancel();
        }

        // Update sheet position during drag
        sheetRef.current.style.transform = `translateY(${offset}px)`;
        sheetRef.current.style.transition = 'none';
      } else {
        // Reset transform
        sheetRef.current.style.transform = '';
        sheetRef.current.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';

        // Check for swipe-to-dismiss
        if (closeOnSwipeDown && vy > 300 && dy > 0) {
          // Swipe down with sufficient velocity - close the sheet
          onClose();
          return;
        }

        // Determine snap point based on velocity and position
        const currentPoint = snapPoints[currentSnap];
        const currentHeight = getSnapPointHeight(currentPoint);

        if (vy > 300 && dy > 0 && currentSnap < snapPoints.length - 1) {
          setCurrentSnap(currentSnap + 1);
        } else if (vy > 300 && dy < 0 && currentSnap > 0) {
          setCurrentSnap(currentSnap - 1);
        }
        // Otherwise stay at current snap point
      }
    },
    onScroll: ({ deltaY, offset: [sx, sy] }) => {
      if (!contentRef.current || !enableMomentum) return;

      const content = contentRef.current;
      const maxScroll = content.scrollHeight - content.clientHeight;

      // Allow scrolling only when at scroll boundaries
      if ((sy === 0 && deltaY < 0) || (sy >= maxScroll - 1 && deltaY > 0)) {
        // Let the scroll pass through to parent
        return false;
      }

      // Prevent default to enable momentum scrolling
      content.scrollTop = sy;
      return true;
    },
  }, {
    drag: {
      filterTaps: true,
      threshold: 10,
      axis: 'y',
      from: () => [0, currentSnap],
      pointer: { touch: true },
    },
    scroll: {
      trigger: contentRef,
      from: () => [0, contentScrollTop],
      axis: 'y',
      preventDefault: true,
    },
  });

  // Handle escape key and iOS safe areas
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      if (preventScroll) {
        document.body.style.overflow = 'hidden';
        document.body.style.paddingBottom = 'env(safe-area-inset-bottom)';
      }

      // Add iOS-specific styles
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (isIOS) {
        document.body.style.webkitTouchScrolling = 'touch';
      }
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (preventScroll) {
        document.body.style.overflow = '';
        document.body.style.paddingBottom = '';
      }
    };
  }, [isOpen, onClose, preventScroll]);

  // Handle outside click
  const handleOutsideClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget && closeOnOutsideClick) {
      onClose();
    }
  };

  // Handle content scroll for momentum
  const handleContentScroll = (event: React.UIEvent<HTMLDivElement>) => {
    setContentScrollTop(event.currentTarget.scrollTop);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleOutsideClick}
            transition={{ duration: 0.3 }}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            className={twMerge(
              'fixed bottom-0 left-0 right-0 border-t border-gray-700/50 z-50 overflow-hidden',
              variant === 'default' && 'bg-gray-800/95 backdrop-blur-xl rounded-t-2xl',
              variant === 'filter' && 'bg-gray-900/98 backdrop-blur-2xl rounded-t-2xl',
              variant === 'menu' && 'bg-black/95 backdrop-blur-lg rounded-t-xl',
              variant === 'modal' && 'bg-gray-800/90 backdrop-blur-md rounded-t-xl',
              className
            )}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 30,
            }}
            style={{
              height: getSheetHeight(),
              maxHeight: '90vh',
              paddingBottom: 'env(safe-area-inset-bottom, 20px)',
            }}
            {...(enableDrag ? bind() : {})}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center py-3">
                <motion.div
                  className="w-12 h-1 bg-gray-600/70 rounded-full backdrop-blur-sm"
                  animate={{ opacity: isDragging ? 0.5 : 1 }}
                  transition={{ duration: 0.2 }}
                />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="px-4 pb-3 border-b border-gray-700/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">{title}</h2>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    ✕
                  </Button>
                </div>

                {/* Snap points indicator */}
                {snapPoints.length > 1 && variant === 'default' && (
                  <div className="flex justify-center mt-2 space-x-1">
                    {snapPoints.map((_, index) => (
                      <button
                        key={index}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === currentSnap
                            ? 'bg-orange-500 scale-110'
                            : 'bg-gray-500 hover:bg-gray-400 scale-100'
                        }`}
                        onClick={() => setCurrentSnap(index)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filter variant actions */}
            {variant === 'filter' && (
              <div className="px-4 py-3 border-b border-gray-700/30 flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Reset filters
                    onClose();
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  Reset
                </Button>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Apply filters
                      onClose();
                    }}
                    className="text-gray-400 hover:text-white"
                  >
                    Apply
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={onClose}
                  >
                    Done
                  </Button>
                </div>
              </div>
            )}

            {/* Content */}
            <div
              ref={contentRef}
              className="px-4 pb-4 overflow-y-auto scroll-smooth"
              style={{
                maxHeight: 'calc(90vh - 80px)',
                WebkitOverflowScrolling: enableMomentum ? 'touch' : 'auto',
              }}
              onScroll={handleContentScroll}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Convenience components for common use cases
interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: ('min' | 'mid' | 'max' | number)[];
  onApply?: () => void;
  onReset?: () => void;
}

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = ['min', 'mid', 'max'],
  onApply,
  onReset,
}) => (
  <BottomSheet
    isOpen={isOpen}
    onClose={onClose}
    title="Filters"
    variant="filter"
    height="auto"
    snapPoints={snapPoints}
    showHandle={true}
    className="pb-safe"
    enableMomentum={true}
    enableDrag={true}
  >
    {children}
  </BottomSheet>
);

interface ItemDetailsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  snapPoints?: ('min' | 'mid' | 'max' | number)[];
}

export const ItemDetailsBottomSheet: React.FC<ItemDetailsBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  snapPoints = ['mid', 'max'],
}) => (
  <BottomSheet
    isOpen={isOpen}
    onClose={onClose}
    title="Item Details"
    variant="modal"
    height="auto"
    snapPoints={snapPoints}
    showHandle={true}
    className="pb-safe"
    enableMomentum={true}
  >
    {children}
  </BottomSheet>
);

interface ActionsBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const ActionsBottomSheet: React.FC<ActionsBottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  title = "Actions",
}) => (
  <BottomSheet
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    variant="menu"
    height="min"
    showHandle={true}
    closeOnSwipeDown={true}
    className="pb-safe"
    enableDrag={true}
  >
    <div className="space-y-2">
      {children}
    </div>
  </BottomSheet>
);

// Hook for managing bottom sheet state
export const useBottomSheet = (initialState = false) => {
  const [isOpen, setIsOpen] = React.useState(initialState);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);
  const toggle = React.useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
};