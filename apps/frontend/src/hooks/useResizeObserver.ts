'use client';

import { useEffect, useState, RefObject } from 'react';

export interface ResizeObserverOptions {
  box?: 'content-box' | 'border-box' | 'device-pixel-content-box';
}

export interface ResizeDimensions {
  width: number;
  height: number;
  top: number;
  left: number;
  right: number;
  bottom: number;
}

/**
 * Hook for observing element resize using ResizeObserver API
 */
export const useResizeObserver = (
  elementRef: RefObject<HTMLElement>,
  options: ResizeObserverOptions = {}
): ResizeDimensions => {
  const { box = 'border-box' } = options;

  const [dimensions, setDimensions] = useState<ResizeDimensions>({
    width: 0,
    height: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Check if ResizeObserver is supported
    if (typeof ResizeObserver === 'undefined') {
      // Fallback for older browsers
      const updateDimensions = () => {
        const rect = element.getBoundingClientRect();
        setDimensions({
          width: element.offsetWidth,
          height: element.offsetHeight,
          top: rect.top,
          left: rect.left,
          right: rect.right,
          bottom: rect.bottom,
        });
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const rect = entry.target.getBoundingClientRect();

        if (box === 'content-box' && entry.contentBoxSize) {
          const contentBoxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;

          setDimensions({
            width: contentBoxSize.inlineSize,
            height: contentBoxSize.blockSize,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          });
        } else if (box === 'border-box' && entry.borderBoxSize) {
          const borderBoxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;

          setDimensions({
            width: borderBoxSize.inlineSize,
            height: borderBoxSize.blockSize,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          });
        } else {
          // Fallback to bounding client rect
          setDimensions({
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          });
        }
      }
    });

    resizeObserver.observe(element, { box });

    // Initial measurement
    const rect = element.getBoundingClientRect();
    setDimensions({
      width: rect.width,
      height: rect.height,
      top: rect.top,
      left: rect.left,
      right: rect.right,
      bottom: rect.bottom,
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRef, box]);

  return dimensions;
};

/**
 * Hook for observing multiple elements resize
 */
export const useMultipleResizeObserver = (
  elementRefs: RefObject<HTMLElement>[],
  options: ResizeObserverOptions = {}
): ResizeDimensions[] => {
  const { box = 'border-box' } = options;

  const [dimensionsList, setDimensionsList] = useState<ResizeDimensions[]>(
    elementRefs.map(() => ({
      width: 0,
      height: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }))
  );

  useEffect(() => {
    const elements = elementRefs.map(ref => ref.current).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    // Check if ResizeObserver is supported
    if (typeof ResizeObserver === 'undefined') {
      // Fallback for older browsers
      const updateDimensions = () => {
        const newDimensionsList = elementRefs.map((ref) => {
          const element = ref.current;
          if (!element) {
            return {
              width: 0,
              height: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            };
          }

          const rect = element.getBoundingClientRect();
          return {
            width: element.offsetWidth,
            height: element.offsetHeight,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          };
        });

        setDimensionsList(newDimensionsList);
      };

      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      return () => window.removeEventListener('resize', updateDimensions);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const newDimensionsList = [...dimensionsList];

      for (const entry of entries) {
        const elementIndex = elements.indexOf(entry.target);
        if (elementIndex === -1) continue;

        const rect = entry.target.getBoundingClientRect();

        if (box === 'content-box' && entry.contentBoxSize) {
          const contentBoxSize = Array.isArray(entry.contentBoxSize)
            ? entry.contentBoxSize[0]
            : entry.contentBoxSize;

          newDimensionsList[elementIndex] = {
            width: contentBoxSize.inlineSize,
            height: contentBoxSize.blockSize,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          };
        } else if (box === 'border-box' && entry.borderBoxSize) {
          const borderBoxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;

          newDimensionsList[elementIndex] = {
            width: borderBoxSize.inlineSize,
            height: borderBoxSize.blockSize,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          };
        } else {
          // Fallback to bounding client rect
          newDimensionsList[elementIndex] = {
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left,
            right: rect.right,
            bottom: rect.bottom,
          };
        }
      }

      setDimensionsList(newDimensionsList);
    });

    elements.forEach((element) => {
      resizeObserver.observe(element, { box });
    });

    // Initial measurement
    const initialDimensions = elementRefs.map((ref) => {
      const element = ref.current;
      if (!element) {
        return {
          width: 0,
          height: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        };
      }

      const rect = element.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
      };
    });

    setDimensionsList(initialDimensions);

    return () => {
      resizeObserver.disconnect();
    };
  }, [elementRefs, dimensionsList, box]);

  return dimensionsList;
};

/**
 * Hook for observing viewport resize
 */
export const useViewportResize = (): ResizeDimensions => {
  const [viewportDimensions, setViewportDimensions] = useState<ResizeDimensions>({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateDimensions = () => {
      setViewportDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
        top: 0,
        left: 0,
        right: window.innerWidth,
        bottom: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);

  return viewportDimensions;
};