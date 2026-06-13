/**
 * Service Worker for Push Notifications
 * Handles push events and notification clicks.
 * 
 * Place this file in /public/sw.js of Next.js app
 */

const CACHE_NAME = 'steam-marketplace-v1';
const OFFLINE_URL = '/offline.html';

// Install event - cache important assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/offline.html',
                '/icons/notification-icon.png',
                '/icons/badge.png',
            ]).catch((err) => {
                console.log('[SW] Cache addAll failed:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        })
    );
    self.clients.claim();
});

// Push event - show notification
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    let data = {
        title: 'Steam Marketplace',
        body: 'You have a new notification',
        icon: '/icons/notification-icon.png',
        badge: '/icons/badge.png',
    };

    try {
        if (event.data) {
            data = { ...data, ...event.data.json() };
        }
    } catch (err) {
        console.error('[SW] Error parsing push data:', err);
    }

    const options = {
        body: data.body,
        icon: data.icon || '/icons/notification-icon.png',
        badge: data.badge || '/icons/badge.png',
        tag: data.tag || 'default',
        requireInteraction: data.requireInteraction || false,
        data: data.data || {},
        actions: data.actions || [],
        vibrate: [100, 50, 100],
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification.tag);

    event.notification.close();

    const data = event.notification.data || {};
    let targetUrl = '/';

    // Determine target URL based on notification type
    switch (data.type) {
        case 'trade_update':
            targetUrl = `/trades/${data.tradeId}`;
            break;
        case 'item_sold':
            targetUrl = '/wallet';
            break;
        case 'price_drop':
            targetUrl = '/watchlist';
            break;
        case 'new_message':
            targetUrl = '/messages';
            break;
        default:
            targetUrl = '/';
    }

    // Handle action clicks
    if (event.action === 'view') {
        // Already handled by default URL
    } else if (event.action === 'buy') {
        targetUrl = '/marketplace';
    } else if (event.action === 'dismiss') {
        return; // Just close the notification
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Try to focus existing window
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    client.navigate(targetUrl);
                    return client.focus();
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip API calls and auth endpoints
    if (event.request.url.includes('/api/') || event.request.url.includes('/auth/')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // Return cached version or offline page
                return caches.match(event.request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match(OFFLINE_URL);
                    }
                });
            })
    );
});

console.log('[SW] Service Worker loaded');
