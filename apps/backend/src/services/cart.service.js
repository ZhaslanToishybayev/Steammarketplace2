/**
 * Cart Service
 * Redis-based shopping cart for multi-item trades
 */

const Redis = require('ioredis');

let redis;
try {
    redis = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: 3,
    });
} catch (e) {
    console.warn('Redis not available for cart');
    redis = null;
}

// In-memory fallback
const memoryCarts = new Map();

const CART_TTL = 1800; // 30 minutes
const MAX_CART_ITEMS = 50;

function getCartKey(userId) {
    return `cart:${userId}`;
}

/**
 * Get user's cart
 */
async function getCart(userId) {
    if (redis) {
        const data = await redis.get(getCartKey(userId));
        return data ? JSON.parse(data) : { items: [], updatedAt: null };
    }
    return memoryCarts.get(userId) || { items: [], updatedAt: null };
}

/**
 * Save cart
 */
async function saveCart(userId, cart) {
    cart.updatedAt = Date.now();
    if (redis) {
        await redis.setex(getCartKey(userId), CART_TTL, JSON.stringify(cart));
    } else {
        memoryCarts.set(userId, cart);
    }
}

/**
 * Add item to cart
 */
async function addToCart(userId, item) {
    const cart = await getCart(userId);

    // Check if already in cart
    const exists = cart.items.find(i => i.listingId === item.listingId);
    if (exists) {
        return { success: false, error: 'Item already in cart' };
    }

    // Check cart limit
    if (cart.items.length >= MAX_CART_ITEMS) {
        return { success: false, error: `Cart limit ${MAX_CART_ITEMS} items` };
    }

    cart.items.push({
        listingId: item.listingId,
        name: item.name,
        price: item.price,
        image: item.image,
        float: item.float,
        stickers: item.stickers || [],
        addedAt: Date.now()
    });

    await saveCart(userId, cart);
    return { success: true, cart };
}

/**
 * Remove item from cart
 */
async function removeFromCart(userId, listingId) {
    const cart = await getCart(userId);
    cart.items = cart.items.filter(i => i.listingId !== listingId);
    await saveCart(userId, cart);
    return { success: true, cart };
}

/**
 * Clear cart
 */
async function clearCart(userId) {
    const cart = { items: [], updatedAt: Date.now() };
    await saveCart(userId, cart);
    return { success: true };
}

/**
 * Get cart summary
 */
async function getCartSummary(userId) {
    const cart = await getCart(userId);
    const totalPrice = cart.items.reduce((sum, item) => sum + parseFloat(item.price || 0), 0);

    return {
        itemCount: cart.items.length,
        totalPrice,
        items: cart.items,
        updatedAt: cart.updatedAt
    };
}

/**
 * Lock cart items for checkout (mark as pending)
 */
async function lockCartForCheckout(userId) {
    const cart = await getCart(userId);
    const lockKey = `cart_lock:${userId}`;

    if (redis) {
        // Try to get lock
        const locked = await redis.set(lockKey, Date.now(), 'NX', 'EX', 300);
        if (!locked) {
            return { success: false, error: 'Cart already locked for checkout' };
        }
    }

    cart.lockedAt = Date.now();
    await saveCart(userId, cart);

    return { success: true, cart };
}

/**
 * Unlock cart
 */
async function unlockCart(userId) {
    if (redis) {
        await redis.del(`cart_lock:${userId}`);
    }

    const cart = await getCart(userId);
    delete cart.lockedAt;
    await saveCart(userId, cart);

    return { success: true };
}

module.exports = {
    getCart,
    addToCart,
    removeFromCart,
    clearCart,
    getCartSummary,
    lockCartForCheckout,
    unlockCart,
};
