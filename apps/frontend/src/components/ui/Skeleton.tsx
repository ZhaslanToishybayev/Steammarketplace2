'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    rounded?: 'sm' | 'md' | 'lg' | 'full';
}

export function Skeleton({
    className = '',
    width,
    height,
    rounded = 'md',
}: SkeletonProps) {
    const roundedClass = {
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        full: 'rounded-full',
    };

    return (
        <div
            className={`skeleton ${roundedClass[rounded]} ${className}`}
            style={{
                width: typeof width === 'number' ? `${width}px` : width,
                height: typeof height === 'number' ? `${height}px` : height,
            }}
        />
    );
}

// Item Card Skeleton
// Item Card Skeleton
export function ItemCardSkeleton() {
    return (
        <div className="card-item p-4 flex flex-col gap-3 h-full">
            {/* Image placeholder */}
            <div className="aspect-square w-full rounded-lg overflow-hidden bg-[var(--bg-tertiary)] flex items-center justify-center">
                <Skeleton width="60%" height="60%" />
            </div>

            {/* Text placeholders */}
            <div className="space-y-2 mt-2">
                <Skeleton height={20} width="80%" rounded="sm" />
                <Skeleton height={14} width="40%" rounded="sm" />
            </div>

            {/* Price and Button placeholder */}
            <div className="mt-auto flex justify-between items-center pt-2">
                <Skeleton height={24} width="30%" rounded="sm" />
                <Skeleton height={36} width={90} rounded="md" />
            </div>
        </div>
    );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <tr>
            {Array.from({ length: columns }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <Skeleton height={16} width={i === 0 ? '80%' : '60%'} />
                </td>
            ))}
        </tr>
    );
}

// Profile Card Skeleton
export function ProfileSkeleton() {
    return (
        <div className="flex items-center gap-4">
            <Skeleton width={64} height={64} rounded="full" />
            <div className="flex-1">
                <Skeleton width="60%" height={20} className="mb-2" />
                <Skeleton width="40%" height={14} />
            </div>
        </div>
    );
}

// Stats Card Skeleton
export function StatsSkeleton() {
    return (
        <div className="card p-4">
            <Skeleton width="40%" height={14} className="mb-2" />
            <Skeleton width="60%" height={28} />
        </div>
    );
}
