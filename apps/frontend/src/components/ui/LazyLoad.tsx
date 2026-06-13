'use client';

import React, { useEffect, useRef, useState, ReactNode } from 'react';

interface LazyLoadProps {
    children: ReactNode;
    placeholder?: ReactNode;
    rootMargin?: string;
    threshold?: number;
}

/**
 * Lazy Load Wrapper Component
 * Uses Intersection Observer to defer rendering until element is near viewport
 */
export function LazyLoad({
    children,
    placeholder = <div className="h-64 skeleton rounded-lg" />,
    rootMargin = '200px',
    threshold = 0.1
}: LazyLoadProps) {
    const [isVisible, setIsVisible] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin, threshold }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [rootMargin, threshold]);

    return (
        <div ref={containerRef}>
            {isVisible ? children : placeholder}
        </div>
    );
}

interface LazyGridProps {
    items: any[];
    renderItem: (item: any, index: number) => ReactNode;
    batchSize?: number;
    className?: string;
    placeholderCount?: number;
}

/**
 * Lazy Loading Grid
 * Renders items in batches as user scrolls
 */
export function LazyGrid({
    items,
    renderItem,
    batchSize = 12,
    className = 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4',
    placeholderCount = 8
}: LazyGridProps) {
    const [loadedCount, setLoadedCount] = useState(batchSize);
    const loaderRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && loadedCount < items.length) {
                    setLoadedCount(prev => Math.min(prev + batchSize, items.length));
                }
            },
            { rootMargin: '300px', threshold: 0.1 }
        );

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => observer.disconnect();
    }, [loadedCount, items.length, batchSize]);

    const visibleItems = items.slice(0, loadedCount);
    const hasMore = loadedCount < items.length;

    return (
        <>
            <div className={`${className} grid-animate`}>
                {visibleItems.map((item, index) => (
                    <div
                        key={item.id || index}
                        className="animate-card-enter"
                        style={{ animationDelay: `${(index % batchSize) * 30}ms` }}
                    >
                        {renderItem(item, index)}
                    </div>
                ))}
            </div>

            {hasMore && (
                <div
                    ref={loaderRef}
                    className="py-8 flex justify-center"
                >
                    <div className="loader-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            )}
        </>
    );
}

interface LazyImageProps {
    src: string;
    alt: string;
    className?: string;
    width?: number;
    height?: number;
}

/**
 * Lazy Loading Image with Blur Placeholder
 */
export function LazyImage({ src, alt, className = '', width, height }: LazyImageProps) {
    const [loaded, setLoaded] = useState(false);
    const [inView, setInView] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${className}`}
            style={{ width, height }}
        >
            {/* Skeleton placeholder */}
            <div
                className={`absolute inset-0 skeleton transition-opacity duration-300 ${loaded ? 'opacity-0' : 'opacity-100'}`}
            />

            {/* Actual image */}
            {inView && (
                <img
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    onLoad={() => setLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
                    loading="lazy"
                />
            )}
        </div>
    );
}
