'use client';

import Image, { ImageProps } from 'next/image';
import { useState } from 'react';
import { twMerge } from 'tailwind-merge';

/**
 * Generates optimized Steam CDN image URLs with proper sizing and fallbacks
 */
export const getSteamImageUrl = (
  imageUrl: string,
  size: 'small' | 'medium' | 'large' | 'original' = 'medium'
): string => {
  if (!imageUrl || imageUrl === '') {
    return '/images/placeholder-item.png';
  }

  // Handle Steam CDN URLs
  if (imageUrl.includes('steamcdn-a.akamaihd.net')) {
    const baseUrl = imageUrl.replace(/\/(\d+)x(\d+)\//, '/');

    switch (size) {
      case 'small':
        return `${baseUrl}/62x62`;
      case 'medium':
        return `${baseUrl}/124x124`;
      case 'large':
        return `${baseUrl}/256x256`;
      case 'original':
      default:
        return baseUrl;
    }
  }

  // Handle Steam User Content (UGC) URLs
  if (imageUrl.includes('steamuserimages-a.akamaihd.net')) {
    switch (size) {
      case 'small':
        return imageUrl.replace(/\/(\d+)x(\d+)\//, '/62x62/');
      case 'medium':
        return imageUrl.replace(/\/(\d+)x(\d+)\//, '/124x124/');
      case 'large':
        return imageUrl.replace(/\/(\d+)x(\d+)\//, '/256x256/');
      case 'original':
      default:
        return imageUrl;
    }
  }

  // Handle other URLs - return as-is with potential size modification
  return imageUrl;
};

/**
 * Image component with fallback support and blur placeholder
 */
export interface ImageWithFallbackProps extends Omit<ImageProps, 'src'> {
  src: string;
  fallbackSrc?: string;
  blurDataURL?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

export const ImageWithFallback = ({
  src,
  fallbackSrc = '/images/placeholder-item.png',
  blurDataURL,
  alt,
  className,
  containerClassName,
  ...props
}: ImageWithFallbackProps) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setImageError(true);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  const displaySrc = imageError ? fallbackSrc : src;

  // Generate optimized Steam CDN URL
  const optimizedSrc = getSteamImageUrl(displaySrc);

  return (
    <div className={twMerge('relative overflow-hidden rounded', containerClassName)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        className={twMerge('object-cover transition-opacity duration-300', className)}
        style={{
          opacity: isLoading ? 0 : 1,
        }}
        onLoad={handleLoad}
        onError={handleError}
        blurDataURL={blurDataURL || '/images/placeholder-blur.png'}
        placeholder={blurDataURL ? 'blur' : 'empty'}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        quality={85}
        {...props}
      />
    </div>
  );
};

/**
 * Hook for image optimization with lazy loading and intersection observer
 */
export const useImageOptimization = (src: string, options?: {
  threshold?: number;
  rootMargin?: string;
  fallbackSrc?: string;
}) => {
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);

  const optimizedSrc = getSteamImageUrl(src);
  const fallbackSrc = options?.fallbackSrc || '/images/placeholder-item.png';

  return {
    src: hasError ? fallbackSrc : optimizedSrc,
    isLoading: !isInView,
    isError: hasError,
    onLoad: () => {},
    onError: () => setHasError(true),
    onIntersection: (entry: IntersectionObserverEntry) => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    },
  };
};

/**
 * Preload images for better performance
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = getSteamImageUrl(src);
  });
};

/**
 * Generate multiple image sizes for responsive images
 */
export const generateResponsiveImages = (src: string) => {
  return {
    small: getSteamImageUrl(src, 'small'),
    medium: getSteamImageUrl(src, 'medium'),
    large: getSteamImageUrl(src, 'large'),
    original: getSteamImageUrl(src, 'original'),
  };
};