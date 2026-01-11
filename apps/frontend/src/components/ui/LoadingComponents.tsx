'use client';

import React from 'react';

interface LoadingOverlayProps {
    message?: string;
    variant?: 'spinner' | 'dots' | 'progress';
}

export function LoadingOverlay({
    message = 'Loading...',
    variant = 'spinner'
}: LoadingOverlayProps) {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-900 rounded-2xl p-8 flex flex-col items-center gap-4 border border-gray-800 shadow-2xl">
                {variant === 'spinner' && (
                    <div className="loader-premium" />
                )}

                {variant === 'dots' && (
                    <div className="loader-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                )}

                {variant === 'progress' && (
                    <div className="w-48 progress-bar">
                        <div className="progress-bar-fill" />
                    </div>
                )}

                <p className="text-gray-300 font-medium">{message}</p>
            </div>
        </div>
    );
}

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    loading?: boolean;
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'success' | 'danger';
}

export function LoadingButton({
    loading = false,
    children,
    variant = 'primary',
    className = '',
    disabled,
    ...props
}: LoadingButtonProps) {
    const variantClass = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        success: 'btn-success',
        danger: 'btn-danger',
    };

    return (
        <button
            className={`btn btn-press ${variantClass[variant]} ${className}`}
            disabled={disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading...</span>
                </>
            ) : (
                children
            )}
        </button>
    );
}

interface PageLoaderProps {
    message?: string;
}

export function PageLoader({ message = 'Loading content...' }: PageLoaderProps) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
            <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full" />
                <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
            </div>
            <div className="text-center">
                <p className="text-gray-400 font-medium shimmer-text">{message}</p>
            </div>
        </div>
    );
}

// Inventory Grid Skeleton
export function InventoryGridSkeleton({ count = 8 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 grid-animate">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="card-item p-4 animate-card-enter"
                    style={{ animationDelay: `${i * 50}ms` }}
                >
                    {/* Image skeleton */}
                    <div className="aspect-square w-full rounded-lg skeleton mb-3" />

                    {/* Text skeletons */}
                    <div className="space-y-2">
                        <div className="h-4 skeleton rounded w-3/4" />
                        <div className="h-3 skeleton rounded w-1/2" />
                    </div>

                    {/* Price skeleton */}
                    <div className="mt-4 flex justify-between items-center">
                        <div className="h-5 skeleton rounded w-20" />
                        <div className="h-8 skeleton rounded w-16" />
                    </div>
                </div>
            ))}
        </div>
    );
}

// Success Checkmark Animation
export function SuccessAnimation() {
    return (
        <div className="flex items-center justify-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center animate-float">
                <svg
                    className="w-8 h-8 text-green-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                        className="animate-[draw_0.5s_ease-out_forwards]"
                        style={{
                            strokeDasharray: 24,
                            strokeDashoffset: 24,
                            animation: 'draw 0.5s ease-out forwards'
                        }}
                    />
                </svg>
            </div>
            <style jsx>{`
                @keyframes draw {
                    to {
                        stroke-dashoffset: 0;
                    }
                }
            `}</style>
        </div>
    );
}
