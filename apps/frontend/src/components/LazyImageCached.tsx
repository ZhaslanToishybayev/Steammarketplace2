'use client';

import { useEffect, useState, useRef } from 'react';
import { imageCache } from '@/lib/imageCache';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
}

/**
 * LazyImage component with caching support
 * - Lazy loading with Intersection Observer
 * - IndexedDB image caching
 * - Automatic fallback handling
 * - Loading states
 */
export function LazyImage({
  src,
  alt,
  className,
  placeholder,
  fallback,
  width,
  height,
  style,
  onLoad,
  onError,
  priority = false,
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check and load cached image
  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      if (!src) return;

      try {
        // Check if image is already cached
        const cachedImage = await imageCache.getImage(src);
        if (cachedImage) {
          if (!mounted) return;
          setImageSrc(cachedImage);
          setIsLoading(false);
          onLoad?.();
          return;
        }

        // If not cached, load from network
        await loadFromNetwork(src);
      } catch (error) {
        console.error('Image loading failed:', error);
        if (!mounted) return;
        setHasError(true);
        setIsLoading(false);
        onError?.();
      }
    };

    if (priority) {
      loadImage();
    } else {
      // Lazy loading with Intersection Observer
      const observer = new IntersectionObserver(
        async (entries) => {
          if (entries[0].isIntersecting) {
            loadImage();
            observer.disconnect();
          }
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01,
        }
      );

      if (containerRef.current) {
        observer.observe(containerRef.current);
      }

      return () => observer.disconnect();
    }

    return () => {
      mounted = false;
    };
  }, [src, priority, onLoad, onError]);

  // Load image from network and cache it
  const loadFromNetwork = async (url: string) => {
    if (!url) return;

    return new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = async () => {
        try {
          // Convert to base64 for caching
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0);

          const base64 = canvas.toDataURL('image/png');
          await imageCache.setImage(url, base64);

          setImageSrc(base64);
          setIsLoading(false);
          onLoad?.();
          resolve();
        } catch (error) {
          console.error('Failed to cache image:', error);
          reject(error);
        }
      };

      img.onerror = () => {
        console.error('Failed to load image:', url);
        setHasError(true);
        setIsLoading(false);
        onError?.();
        reject(new Error('Image loading failed'));
      };

      img.src = url;
    });
  };

  // Handle image error
  const handleImageError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  // Create image element
  const renderImage = () => {
    if (hasError && fallback) {
      return (
        <img
          ref={imgRef}
          src={fallback}
          alt={alt}
          className={className}
          width={width}
          height={height}
          style={style}
          onError={handleImageError}
        />
      );
    }

    if (imageSrc) {
      return (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={className}
          width={width}
          height={height}
          style={style}
          onLoad={() => setIsLoading(false)}
          onError={handleImageError}
        />
      );
    }

    return null;
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className || ''}`}
      style={style}
      aria-busy={isLoading}
    >
      {/* Loading placeholder */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 animate-pulse"
          style={{ width, height }}
        >
          {placeholder && (
            <div className="flex items-center justify-center h-full">
              <span className="text-gray-500 text-sm">{placeholder}</span>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {hasError && !fallback && (
        <div
          className="absolute inset-0 bg-gray-800 flex items-center justify-center"
          style={{ width, height }}
        >
          <span className="text-gray-400 text-sm">Failed to load</span>
        </div>
      )}

      {/* Image */}
      {renderImage()}

      {/* Loading indicator overlay */}
      {isLoading && (
        <div className="absolute top-2 right-2">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}

      {/* Cached badge */}
      {imageSrc && !isLoading && (
        <div className="absolute top-2 left-2">
          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
            📦 Cached
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for image caching management
 */
export function useImageCache() {
  const [stats, setStats] = useState({
    count: 0,
    totalSize: 0,
    oldestImage: 0,
    newestImage: 0,
  });

  // Refresh stats
  const refreshStats = async () => {
    const newStats = await imageCache.getStats();
    setStats(newStats);
  };

  // Clear cache
  const clearCache = async () => {
    await imageCache.clear();
    await refreshStats();
  };

  // Preload image
  const preloadImage = async (url: string) => {
    if (!url) return;

    try {
      const isCached = await imageCache.hasImage(url);
      if (isCached) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';

      return new Promise<void>((resolve, reject) => {
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);

            const base64 = canvas.toDataURL('image/png');
            await imageCache.setImage(url, base64);
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        img.onerror = () => reject(new Error('Failed to preload image'));
        img.src = url;
      });
    } catch (error) {
      console.error('Failed to preload image:', error);
    }
  };

  // Initialize stats
  useEffect(() => {
    refreshStats();

    const interval = setInterval(refreshStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    refreshStats,
    clearCache,
    preloadImage,
  };
}