'use client';

import React, { useRef, useEffect, useState } from 'react';

interface SkinViewerProps {
    inspectLink?: string;
    imageUrl?: string;
    itemName: string;
    float?: number;
    className?: string;
}

/**
 * 3D-like skin viewer component
 * Uses mouse tracking for pseudo-3D effect
 */
export function SkinViewer({
    inspectLink,
    imageUrl,
    itemName,
    float,
    className = '',
}: SkinViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const [hdImage, setHdImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Fetch HD screenshot from CSFloat if we have inspect link
    useEffect(() => {
        if (inspectLink && !hdImage) {
            fetchHDScreenshot();
        }
    }, [inspectLink]);

    const fetchHDScreenshot = async () => {
        if (!inspectLink) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/pricing/inspect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inspectLink }),
            });
            const data = await res.json();
            if (data.success && data.data?.imageUrl) {
                setHdImage(data.data.imageUrl);
            }
        } catch (err) {
            console.error('Failed to fetch HD screenshot:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        // Map to rotation range (-15 to 15 degrees)
        setRotation({
            x: (0.5 - y) * 30,
            y: (x - 0.5) * 30,
        });
    };

    const handleMouseLeave = () => {
        setIsHovering(false);
        setRotation({ x: 0, y: 0 });
    };

    const displayImage = hdImage || imageUrl;

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={handleMouseLeave}
            style={{ perspective: '1000px' }}
        >
            {/* Image container with 3D transform */}
            <div
                className="w-full h-full transition-transform duration-100 ease-out"
                style={{
                    transform: isHovering
                        ? `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(1.05)`
                        : 'rotateX(0deg) rotateY(0deg) scale(1)',
                    transformStyle: 'preserve-3d',
                }}
            >
                {loading ? (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)]">
                        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-blue)] border-t-transparent rounded-full" />
                    </div>
                ) : displayImage ? (
                    <img
                        src={displayImage}
                        alt={itemName}
                        className="w-full h-full object-contain"
                        style={{
                            filter: isHovering ? 'brightness(1.1)' : 'brightness(1)',
                            transition: 'filter 0.2s ease',
                        }}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                        No Image
                    </div>
                )}
            </div>

            {/* Shine effect */}
            {isHovering && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at ${50 + rotation.y}% ${50 - rotation.x}%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
                    }}
                />
            )}

            {/* Float badge */}
            {float !== undefined && (
                <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs font-mono">
                    {float.toFixed(4)}
                </div>
            )}

            {/* HD indicator */}
            {hdImage && (
                <div className="absolute top-2 left-2 bg-[var(--accent-blue)]/80 px-2 py-0.5 rounded text-xs font-bold">
                    HD
                </div>
            )}
        </div>
    );
}

// Sticker display component
interface StickerDisplayProps {
    stickers: Array<{ name: string; img?: string; wear?: number }>;
    size?: 'sm' | 'md' | 'lg';
    showPrices?: boolean;
}

export function StickerDisplay({ stickers, size = 'md', showPrices = false }: StickerDisplayProps) {
    const sizes = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    if (!stickers || stickers.length === 0) return null;

    return (
        <div className="flex gap-1">
            {stickers.map((sticker, i) => (
                <div
                    key={i}
                    className={`${sizes[size]} bg-black/50 rounded-full flex items-center justify-center relative group`}
                    title={sticker.name}
                >
                    {sticker.img ? (
                        <img
                            src={sticker.img}
                            alt={sticker.name}
                            className="w-full h-full object-contain"
                            style={{ opacity: sticker.wear ? 1 - sticker.wear * 0.5 : 1 }}
                        />
                    ) : (
                        <span className="text-xs">🏷️</span>
                    )}

                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded px-2 py-1 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                        {sticker.name}
                    </div>
                </div>
            ))}
        </div>
    );
}
