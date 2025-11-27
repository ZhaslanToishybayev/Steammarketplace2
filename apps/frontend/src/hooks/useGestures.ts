'use client';

import { useCallback, useRef, useEffect } from 'react';

export interface GestureOptions {
  threshold?: number;
  velocityThreshold?: number;
  preventDefault?: boolean;
  enabled?: boolean;
}

export interface SwipeGesture {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  deltaX: number;
  deltaY: number;
}

export interface LongPressGesture {
  duration: number;
  isLongPress: boolean;
}

export interface TapGesture {
  x: number;
  y: number;
  timestamp: number;
}

/**
 * Hook for swipe gesture detection
 */
export const useSwipeGesture = (
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions & {
    onSwipe?: (gesture: SwipeGesture) => void;
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onSwipeUp?: () => void;
    onSwipeDown?: () => void;
  } = {}
) => {
  const {
    threshold = 50,
    velocityThreshold = 0.3,
    preventDefault = true,
    enabled = true,
    onSwipe,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } = options;

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;

      if (preventDefault) {
        event.preventDefault();
      }

      const touch = event.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
    },
    [enabled, preventDefault]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !touchStartRef.current) return;

      const touch = event.changedTouches[0];
      const touchEnd = { x: touch.clientX, y: touch.clientY };
      const touchStart = touchStartRef.current;
      const timeDiff = Date.now() - touchStart.time;

      const deltaX = touchEnd.x - touchStart.x;
      const deltaY = touchEnd.y - touchStart.y;
      const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2);

      if (distance < threshold) return;

      const velocity = distance / timeDiff;
      if (velocity < velocityThreshold) return;

      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      let direction: 'left' | 'right' | 'up' | 'down';
      let swipe: SwipeGesture;

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        direction = deltaX > 0 ? 'right' : 'left';
        swipe = {
          direction,
          distance: absDeltaX,
          velocity: Math.abs(deltaX) / timeDiff,
          deltaX,
          deltaY,
        };
      } else {
        // Vertical swipe
        direction = deltaY > 0 ? 'down' : 'up';
        swipe = {
          direction,
          distance: absDeltaY,
          velocity: Math.abs(deltaY) / timeDiff,
          deltaX,
          deltaY,
        };
      }

      onSwipe?.(swipe);

      switch (direction) {
        case 'left':
          onSwipeLeft?.();
          break;
        case 'right':
          onSwipeRight?.();
          break;
        case 'up':
          onSwipeUp?.();
          break;
        case 'down':
          onSwipeDown?.();
          break;
      }

      touchStartRef.current = null;
    },
    [
      enabled,
      threshold,
      velocityThreshold,
      onSwipe,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
    ]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, enabled, preventDefault, handleTouchStart, handleTouchEnd]);

  return {
    isActive: enabled,
  };
};

/**
 * Hook for long press gesture detection
 */
export const useLongPress = (
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions & {
    duration?: number;
    onLongPress?: (gesture: LongPressGesture) => void;
    onPressStart?: () => void;
    onPressEnd?: () => void;
  } = {}
) => {
  const {
    duration = 500,
    preventDefault = true,
    enabled = true,
    onLongPress,
    onPressStart,
    onPressEnd,
  } = options;

  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      if (preventDefault) {
        event.preventDefault();
      }

      startTimeRef.current = Date.now();
      onPressStart?.();

      timeoutRef.current = window.setTimeout(() => {
        const durationElapsed = Date.now() - startTimeRef.current;
        onLongPress?.({
          duration: durationElapsed,
          isLongPress: true,
        });
      }, duration);
    },
    [enabled, preventDefault, duration, onLongPress, onPressStart]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !timeoutRef.current) return;

      const pressDuration = Date.now() - startTimeRef.current;

      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      if (pressDuration < duration) {
        onPressEnd?.();
      }
    },
    [enabled, duration, onPressEnd]
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;

      if (preventDefault) {
        event.preventDefault();
      }

      startTimeRef.current = Date.now();
      onPressStart?.();

      timeoutRef.current = window.setTimeout(() => {
        const durationElapsed = Date.now() - startTimeRef.current;
        onLongPress?.({
          duration: durationElapsed,
          isLongPress: true,
        });
      }, duration);
    },
    [enabled, preventDefault, duration, onLongPress, onPressStart]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !timeoutRef.current) return;

      const pressDuration = Date.now() - startTimeRef.current;

      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;

      if (pressDuration < duration) {
        onPressEnd?.();
      }
    },
    [enabled, duration, onPressEnd]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('mousedown', handleMouseDown, { passive: !preventDefault });
    element.addEventListener('mouseup', handleMouseUp, { passive: !preventDefault });
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    elementRef,
    enabled,
    preventDefault,
    handleMouseDown,
    handleMouseUp,
    handleTouchStart,
    handleTouchEnd,
  ]);

  return {
    isActive: enabled,
  };
};

/**
 * Hook for tap/click gesture detection
 */
export const useTapGesture = (
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions & {
    maxDelay?: number;
    onTap?: (gesture: TapGesture) => void;
    onDoubleTap?: () => void;
  } = {}
) => {
  const {
    maxDelay = 300,
    preventDefault = true,
    enabled = true,
    onTap,
    onDoubleTap,
  } = options;

  const lastTapRef = useRef<TapGesture | null>(null);

  const handleTap = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!enabled) return;

      if (preventDefault) {
        event.preventDefault();
      }

      const now = Date.now();
      const currentTap: TapGesture = {
        x: 'touches' in event ? event.touches[0].clientX : (event as MouseEvent).clientX,
        y: 'touches' in event ? event.touches[0].clientY : (event as MouseEvent).clientY,
        timestamp: now,
      };

      // Check for double tap
      if (lastTapRef.current && now - lastTapRef.current.timestamp < maxDelay) {
        onDoubleTap?.();
        lastTapRef.current = null;
      } else {
        // Single tap
        setTimeout(() => {
          if (lastTapRef.current === currentTap) {
            onTap?.(currentTap);
          }
        }, maxDelay);

        lastTapRef.current = currentTap;
      }
    },
    [enabled, preventDefault, maxDelay, onTap, onDoubleTap]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    const handleMouseDown = (event: MouseEvent) => handleTap(event);
    const handleTouchStart = (event: TouchEvent) => handleTap(event);

    element.addEventListener('mousedown', handleMouseDown, { passive: !preventDefault });
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('touchstart', handleTouchStart);
    };
  }, [elementRef, enabled, preventDefault, handleTap]);

  return {
    isActive: enabled,
  };
};

/**
 * Hook for pinch gesture detection
 */
export const usePinchGesture = (
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions & {
    threshold?: number;
    onPinch?: (scale: number, center: { x: number; y: number }) => void;
    onPinchStart?: () => void;
    onPinchEnd?: () => void;
  } = {}
) => {
  const {
    threshold = 10,
    preventDefault = true,
    enabled = true,
    onPinch,
    onPinchStart,
    onPinchEnd,
  } = options;

  const initialDistanceRef = useRef<number | null>(null);
  const isPinchingRef = useRef(false);

  const getDistance = (touch1: Touch, touch2: Touch) => {
    return Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2)
    );
  };

  const getCenter = (touch1: Touch, touch2: Touch) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2,
    };
  };

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;

      if (event.touches.length === 2) {
        isPinchingRef.current = true;
        initialDistanceRef.current = getDistance(event.touches[0], event.touches[1]);
        onPinchStart?.();
      }
    },
    [enabled, onPinchStart]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !isPinchingRef.current || event.touches.length !== 2) return;

      if (preventDefault) {
        event.preventDefault();
      }

      const currentDistance = getDistance(event.touches[0], event.touches[1]);

      if (initialDistanceRef.current && currentDistance - initialDistanceRef.current > threshold) {
        const scale = currentDistance / initialDistanceRef.current;
        const center = getCenter(event.touches[0], event.touches[1]);
        onPinch?.(scale, center);
      }
    },
    [enabled, threshold, preventDefault, onPinch]
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !isPinchingRef.current) return;

      if (event.touches.length < 2) {
        isPinchingRef.current = false;
        initialDistanceRef.current = null;
        onPinchEnd?.();
      }
    },
    [enabled, onPinchEnd]
  );

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    elementRef,
    enabled,
    preventDefault,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return {
    isActive: enabled,
  };
};

/**
 * Hook for drag gesture detection
 */
export const useDragGesture = (
  elementRef: React.RefObject<HTMLElement>,
  options: GestureOptions & {
    threshold?: number;
    onDrag?: (delta: { x: number; y: number }, velocity: { x: number; y: number }) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  } = {}
) => {
  const {
    threshold = 5,
    preventDefault = true,
    enabled = true,
    onDrag,
    onDragStart,
    onDragEnd,
  } = options;

  const isDraggingRef = useRef(false);
  const startPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastPositionRef = useRef<{ x: number; y: number } | null>(null);
  const lastTimeRef = useRef<number>(0);

  const handleMouseDown = useCallback(
    (event: MouseEvent) => {
      if (!enabled) return;

      isDraggingRef.current = true;
      startPositionRef.current = { x: event.clientX, y: event.clientY };
      lastPositionRef.current = startPositionRef.current;
      lastTimeRef.current = Date.now();
      onDragStart?.();
    },
    [enabled, onDragStart]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!enabled || !isDraggingRef.current) return;

      if (preventDefault) {
        event.preventDefault();
      }

      const currentPosition = { x: event.clientX, y: event.clientY };

      if (!startPositionRef.current) return;

      const deltaX = currentPosition.x - startPositionRef.current.x;
      const deltaY = currentPosition.y - startPositionRef.current.y;

      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) < threshold) return;

      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime < 16) return; // ~60fps

      const velocity = {
        x: (currentPosition.x - lastPositionRef.current!.x) / deltaTime,
        y: (currentPosition.y - lastPositionRef.current!.y) / deltaTime,
      };

      onDrag?.({ x: deltaX, y: deltaY }, velocity);

      lastPositionRef.current = currentPosition;
      lastTimeRef.current = currentTime;
    },
    [enabled, threshold, preventDefault, onDrag]
  );

  const handleMouseUp = useCallback(() => {
    if (!enabled || !isDraggingRef.current) return;

    isDraggingRef.current = false;
    startPositionRef.current = null;
    lastPositionRef.current = null;
    onDragEnd?.();
  }, [enabled, onDragEnd]);

  const handleTouchStart = useCallback(
    (event: TouchEvent) => {
      if (!enabled) return;

      isDraggingRef.current = true;
      startPositionRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      lastPositionRef.current = startPositionRef.current;
      lastTimeRef.current = Date.now();
      onDragStart?.();
    },
    [enabled, onDragStart]
  );

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      if (!enabled || !isDraggingRef.current) return;

      if (preventDefault) {
        event.preventDefault();
      }

      const currentPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };

      if (!startPositionRef.current) return;

      const deltaX = currentPosition.x - startPositionRef.current.x;
      const deltaY = currentPosition.y - startPositionRef.current.y;

      if (Math.sqrt(deltaX ** 2 + deltaY ** 2) < threshold) return;

      const currentTime = Date.now();
      const deltaTime = currentTime - lastTimeRef.current;

      if (deltaTime < 16) return; // ~60fps

      const velocity = {
        x: (currentPosition.x - lastPositionRef.current!.x) / deltaTime,
        y: (currentPosition.y - lastPositionRef.current!.y) / deltaTime,
      };

      onDrag?.({ x: deltaX, y: deltaY }, velocity);

      lastPositionRef.current = currentPosition;
      lastTimeRef.current = currentTime;
    },
    [enabled, threshold, preventDefault, onDrag]
  );

  const handleTouchEnd = useCallback(() => {
    if (!enabled || !isDraggingRef.current) return;

    isDraggingRef.current = false;
    startPositionRef.current = null;
    lastPositionRef.current = null;
    onDragEnd?.();
  }, [enabled, onDragEnd]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !enabled) return;

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('touchstart', handleTouchStart, { passive: !preventDefault });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventDefault });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    elementRef,
    enabled,
    preventDefault,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  ]);

  return {
    isActive: enabled,
  };
};