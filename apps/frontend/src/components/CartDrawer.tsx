import { useState } from 'react';
import { useCart } from '../hooks/useCart';
import { Button, Badge, FloatBar, Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from './ui';

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onCheckout: () => void;
}

export function CartDrawer({ isOpen, onClose, onCheckout }: CartDrawerProps) {
    const { items, itemCount, totalPrice, removeFromCart, clearCart, isLoading } = useCart();
    const [checkingOut, setCheckingOut] = useState(false);

    const handleCheckout = async () => {
        setCheckingOut(true);
        await onCheckout();
        setCheckingOut(false);
    };

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent className="flex flex-col h-full w-full sm:max-w-md bg-[var(--bg-secondary)] border-l border-[var(--border-default)]">
                <SheetHeader className="border-b border-[var(--border-default)] pb-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <SheetTitle className="text-lg font-semibold text-white">Shopping Cart</SheetTitle>
                            <Badge variant="blue">{itemCount}</Badge>
                        </div>
                    </div>
                </SheetHeader>

                {/* Items */}
                <div className="flex-1 overflow-y-auto -mx-6 px-6 py-4">
                    {isLoading ? (
                        <div className="text-center py-8 text-[var(--text-muted)]">Loading...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-4">🛒</div>
                            <p className="text-[var(--text-muted)]">Your cart is empty</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <div
                                    key={item.listingId}
                                    className="bg-[var(--bg-tertiary)] rounded-lg p-3 flex gap-3 group relative border border-transparent hover:border-[var(--border-default)] transition-colors"
                                >
                                    <img
                                        src={item.image}
                                        alt={item.name}
                                        className="w-16 h-16 object-contain bg-[var(--bg-primary)] rounded"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-medium text-white truncate">{item.name}</h3>
                                        {item.float !== undefined && (
                                            <div className="mt-1">
                                                <FloatBar value={item.float} size="sm" showValue={false} />
                                            </div>
                                        )}
                                        <div className="mt-1 text-[var(--accent-green)] font-bold">
                                            ${item.price.toFixed(2)}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => removeFromCart(item.listingId)}
                                        className="absolute top-2 right-2 text-[var(--text-muted)] hover:text-[var(--accent-red)] opacity-0 group-hover:opacity-100 transition-opacity"
                                        aria-label="Remove item"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <SheetFooter className="mt-auto border-t border-[var(--border-default)] pt-4 sm:justify-between sm:space-x-0">
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[var(--text-secondary)]">Total ({itemCount} items)</span>
                                <span className="text-2xl font-bold text-[var(--accent-green)]">
                                    ${totalPrice.toFixed(2)}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => clearCart()}
                                >
                                    Clear
                                </Button>
                                <Button
                                    variant="success"
                                    className="flex-1 glow-green"
                                    onClick={handleCheckout}
                                    disabled={checkingOut}
                                >
                                    {checkingOut ? 'Processing...' : 'Checkout'}
                                </Button>
                            </div>
                        </div>
                    </SheetFooter>
                )}
            </SheetContent>
        </Sheet>
    );
}

// Cart Icon Button for Header
export function CartButton({ onClick }: { onClick: () => void }) {
    const { itemCount, totalPrice } = useCart();

    return (
        <button
            onClick={onClick}
            className="relative flex items-center gap-2 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-hover)] px-4 py-2 rounded-lg transition-colors"
        >
            <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
                <>
                    <span className="text-[var(--accent-green)] font-bold">${totalPrice.toFixed(2)}</span>
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent-blue)] text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {itemCount}
                    </span>
                </>
            )}
        </button>
    );
}
