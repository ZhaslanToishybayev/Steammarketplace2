'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { Card, Badge, Button, FloatBar, Modal, ModalContent, DialogHeader, DialogTitle } from './ui';

interface Sticker {
    name: string;
    img?: string;
}

interface ItemCardProps {
    id: number;
    name: string;
    price: number;
    image: string;
    float?: number;
    stickers?: (Sticker | string)[];
    rarity?: string;
    exterior?: string;
    sellerName?: string;
    onBuy?: (id: number) => void;
    onAddToCart?: (item: { listingId: number; name: string; price: number; image: string; float?: number }) => void;
    isInCart?: boolean;
    onSelect?: (id: number) => void;
    selected?: boolean;
    buyLoading?: boolean;
    balance?: number;
}

// Rarity colors - outside component to prevent recreation
const rarityColors: Record<string, string> = {
    consumer: 'var(--rarity-consumer)',
    industrial: 'var(--rarity-industrial)',
    milspec: 'var(--rarity-milspec)',
    restricted: 'var(--rarity-restricted)',
    classified: 'var(--rarity-classified)',
    covert: 'var(--rarity-covert)',
    gold: 'var(--rarity-gold)',
};

export const ItemCard = React.memo(function ItemCard({
    id,
    name,
    price,
    image,
    float,
    stickers = [],
    rarity = 'milspec',
    exterior,
    sellerName,
    onBuy,
    onAddToCart,
    isInCart = false,
    onSelect,
    selected = false,
    buyLoading = false,
    balance = 0,
}: ItemCardProps) {
    const [showDetails, setShowDetails] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    const rarityColor = rarityColors[rarity.toLowerCase()] || rarityColors.milspec;
    const canAfford = balance >= price;

    // Memoize card style to prevent re-renders
    const cardStyle = useMemo(() => ({
        borderBottomColor: rarityColor,
        borderBottomWidth: '3px',
    }), [rarityColor]);

    // Memoize cart item to prevent object recreation
    const cartItem = useMemo(() => ({
        listingId: id,
        name,
        price,
        image,
        float
    }), [id, name, price, image, float]);

    // Stable callbacks
    const handleSelect = useCallback(() => onSelect?.(id), [onSelect, id]);
    const handleBuy = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onBuy?.(id);
    }, [onBuy, id]);
    const handleAddToCart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onAddToCart?.(cartItem);
    }, [onAddToCart, cartItem]);
    const handleOpenDetails = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setShowDetails(true);
    }, []);
    const handleCloseDetails = useCallback(() => setShowDetails(false), []);

    // Keyboard handlers for accessibility
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.(id);
        }
    }, [onSelect, id]);

    return (
        <>
            <Card
                className={`item-card cursor-pointer group transition-all duration-300 border border-[#FF8C00]/10 bg-[#141419] overflow-hidden hover:-translate-y-1 hover:shadow-xl hover:shadow-[#FF8C00]/10 ${selected ? 'ring-2 ring-[#FF8C00] shadow-lg shadow-[#FF8C00]/20' : 'hover:border-[#FF8C00]/30'}`}
                onClick={handleSelect}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-label={`${name}, Price: $${price.toFixed(2)}${exterior ? `, Condition: ${exterior}` : ''}`}
                aria-pressed={selected}
                style={cardStyle}
            >
                {/* Image Container */}
                <div className="relative aspect-square bg-[var(--bg-tertiary)] p-4">
                    {/* Loading skeleton */}
                    {!imageLoaded && !imageError && (
                        <div className="absolute inset-0 bg-[var(--bg-secondary)] animate-pulse rounded" />
                    )}
                    {!imageError && image ? (
                        <Image
                            src={image}
                            alt={name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className={`object-contain p-2 transition-all duration-300 group-hover:scale-110 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                            loading="lazy"
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                            unoptimized={image.includes('steamstatic.com')}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <svg className="w-16 h-16 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                    )}

                    {/* Stickers Overlay */}
                    {stickers.length > 0 && (
                        <div className="absolute bottom-2 left-2 right-2 flex gap-1 justify-center">
                            {stickers.slice(0, 4).map((sticker, i) => {
                                const stickerName = typeof sticker === 'string' ? sticker : sticker.name;
                                return (
                                    <div
                                        key={i}
                                        className="w-8 h-8 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm"
                                        title={stickerName}
                                        aria-label={`Sticker: ${stickerName}`}
                                    >
                                        <span className="text-xs" aria-hidden="true">🎨</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Hover/Focus Actions */}
                    <div
                        className={`absolute inset-0 bg-black/60 flex items-center justify-center gap-2 transition-all duration-200 ${isFocused ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            }`}
                        aria-hidden={!isFocused}
                    >
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleOpenDetails}
                            aria-label={`View details for ${name}`}
                            tabIndex={isFocused ? 0 : -1}
                        >
                            Details
                        </Button>
                        {onAddToCart && (
                            <Button
                                size="sm"
                                variant={isInCart ? 'ghost' : 'default'}
                                onClick={handleAddToCart}
                                disabled={isInCart}
                                aria-label={isInCart ? `${name} is already in cart` : `Add ${name} to cart`}
                                tabIndex={isFocused ? 0 : -1}
                            >
                                {isInCart ? 'In Cart' : 'Add'}
                            </Button>
                        )}
                        {onBuy && (
                            <Button
                                size="sm"
                                variant="success"
                                onClick={handleBuy}
                                disabled={!canAfford || buyLoading}
                                className={canAfford ? 'glow-green' : ''}
                                aria-label={canAfford ? `Buy ${name} for $${price.toFixed(2)}` : `Cannot afford ${name}`}
                                tabIndex={isFocused ? 0 : -1}
                            >
                                Buy
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-3">
                    {/* Name */}
                    <h3 className="text-sm font-medium text-foreground truncate mb-1" title={name}>
                        {name}
                    </h3>

                    {/* Exterior Badge */}
                    {exterior && (
                        <Badge variant="secondary" className="mb-2 text-[10px] px-1.5 h-5">
                            {exterior}
                        </Badge>
                    )}

                    {/* Float Bar */}
                    {float !== undefined && (
                        <div className="mb-2">
                            <FloatBar value={float} size="sm" />
                        </div>
                    )}

                    {/* Price */}
                    <div className="flex items-center justify-between mt-auto">
                        <span className="text-lg font-bold text-[var(--accent-green)]">
                            ${price.toFixed(2)}
                        </span>
                        {!canAfford && onBuy && (
                            <span className="text-xs text-[var(--accent-red)] font-medium" aria-live="polite">
                                Can't afford
                            </span>
                        )}
                    </div>
                </div>
            </Card>

            {/* Detail Modal */}
            <Modal open={showDetails} onOpenChange={setShowDetails}>
                <ModalContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>{name}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col md:flex-row gap-6 mt-4">
                        {/* Image */}
                        <div className="flex-1 bg-[var(--bg-tertiary)] rounded-lg p-4 flex items-center justify-center min-h-[300px]">
                            {image ? (
                                <Image
                                    src={image}
                                    alt={name}
                                    width={400}
                                    height={400}
                                    className="object-contain"
                                    unoptimized={image.includes('steamstatic.com')}
                                />
                            ) : (
                                <div className="text-muted-foreground">No image available</div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <h2 className="text-xl font-bold text-white mb-2">{name}</h2>

                            {exterior && (
                                <Badge variant="secondary" className="mb-4">{exterior}</Badge>
                            )}

                            {float !== undefined && (
                                <div className="mb-4">
                                    <div className="text-sm text-[var(--text-secondary)] mb-1">Float Value</div>
                                    <FloatBar value={float} />
                                </div>
                            )}

                            {stickers.length > 0 && (
                                <div className="mb-4">
                                    <div className="text-sm text-[var(--text-secondary)] mb-2">Stickers</div>
                                    <div className="flex flex-wrap gap-2">
                                        {stickers.map((sticker, i) => {
                                            const stickerName = typeof sticker === 'string' ? sticker : sticker.name;
                                            return (
                                                <Badge key={i} variant="secondary">{stickerName}</Badge>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {sellerName && (
                                <div className="mb-4">
                                    <div className="text-sm text-[var(--text-secondary)]">Seller</div>
                                    <div className="text-white">{sellerName}</div>
                                </div>
                            )}

                            <div className="text-3xl font-bold text-[var(--accent-green)] mb-6">
                                ${price.toFixed(2)}
                            </div>

                            {onBuy && (
                                <Button
                                    variant="default"
                                    size="lg"
                                    className="w-full bg-[var(--accent-green)] hover:bg-[var(--accent-green)]/90 text-white shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all hover:scale-[1.02]"
                                    onClick={() => {
                                        handleCloseDetails();
                                        onBuy(id);
                                    }}
                                    disabled={!canAfford || buyLoading}
                                    loading={buyLoading}
                                    aria-label={canAfford ? `Purchase ${name} for $${price.toFixed(2)}` : 'Insufficient balance'}
                                >
                                    {canAfford ? 'Buy Now' : 'Insufficient Balance'}
                                </Button>
                            )}
                        </div>
                    </div>
                </ModalContent>
            </Modal>
        </>
    );
});
