/**
 * Cart API Routes
 * Shopping cart for multi-item trading
 */

const express = require('express');
const router = express.Router();
const cartService = require('../services/cart.service');

// Middleware to get userId (from session or temporary ID)
const getUserId = (req) => {
    // From authenticated user
    if (req.user?.id) return req.user.id;
    if (req.user?.steamId) return req.user.steamId;

    // From session
    if (req.session?.passport?.user?.steamId) {
        return req.session.passport.user.steamId;
    }

    // Fallback to session ID
    return req.sessionID || 'anonymous';
};

// Get cart
router.get('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        const summary = await cartService.getCartSummary(userId);

        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to get cart' });
    }
});

// Add to cart
router.post('/add', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { listingId, name, price, image, float, stickers } = req.body;

        if (!listingId) {
            return res.status(400).json({ success: false, error: 'listingId required' });
        }

        const result = await cartService.addToCart(userId, {
            listingId,
            name,
            price,
            image,
            float,
            stickers
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            data: await cartService.getCartSummary(userId)
        });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to add item' });
    }
});

// Remove from cart
router.delete('/:listingId', async (req, res) => {
    try {
        const userId = getUserId(req);
        const { listingId } = req.params;

        await cartService.removeFromCart(userId, parseInt(listingId));

        res.json({
            success: true,
            data: await cartService.getCartSummary(userId)
        });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to remove item' });
    }
});

// Clear cart
router.delete('/', async (req, res) => {
    try {
        const userId = getUserId(req);
        await cartService.clearCart(userId);

        res.json({ success: true });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ success: false, error: 'Failed to clear cart' });
    }
});

// Checkout - initiate multi-item purchase
router.post('/checkout', async (req, res) => {
    try {
        const userId = getUserId(req);

        // Lock cart
        const lockResult = await cartService.lockCartForCheckout(userId);
        if (!lockResult.success) {
            return res.status(400).json(lockResult);
        }

        const cart = lockResult.cart;

        if (cart.items.length === 0) {
            await cartService.unlockCart(userId);
            return res.status(400).json({ success: false, error: 'Cart is empty' });
        }

        // Calculate total
        const totalPrice = cart.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

        // Here you would:
        // 1. Check user balance
        // 2. Verify all listings are still available
        // 3. Create escrow trades for each item
        // 4. Deduct balance
        // 5. Clear cart

        res.json({
            success: true,
            data: {
                itemCount: cart.items.length,
                totalPrice,
                status: 'checkout_initiated',
                message: 'Proceed to confirm purchase'
            }
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, error: 'Checkout failed' });
    }
});

module.exports = router;
