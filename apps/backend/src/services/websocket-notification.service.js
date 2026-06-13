/**
 * WebSocket Notification Service
 * Real-time notifications for trades, prices, and system events
 */

const WebSocket = require('ws');
const Redis = require('ioredis');

class WebSocketNotificationService {
    constructor(server) {
        this.wss = new WebSocket.Server({ server, path: '/ws' });
        this.clients = new Map(); // steamId -> WebSocket[]
        this.redis = null;

        this.init();
    }

    init() {
        // Redis for pub/sub across instances
        try {
            this.redis = new Redis({
                host: process.env.REDIS_HOST || 'redis',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
            });

            this.subscriber = new Redis({
                host: process.env.REDIS_HOST || 'redis',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD,
            });

            // Subscribe to notification channels
            this.subscriber.subscribe('notifications', 'trade_updates', 'price_alerts');
            this.subscriber.on('message', (channel, message) => {
                this.handleRedisMessage(channel, JSON.parse(message));
            });
        } catch (e) {
            console.warn('Redis not available for WebSocket notifications');
        }

        // WebSocket connection handling
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });

        console.log('WebSocket notification service initialized');
    }

    handleConnection(ws, req) {
        // Extract user from query or auth header
        const url = new URL(req.url, 'http://localhost');
        const steamId = url.searchParams.get('steamId');
        const token = url.searchParams.get('token');

        if (!steamId) {
            ws.close(4001, 'steamId required');
            return;
        }

        // Register client
        if (!this.clients.has(steamId)) {
            this.clients.set(steamId, []);
        }
        this.clients.get(steamId).push(ws);

        console.log(`WebSocket client connected: ${steamId}`);

        // Send welcome message
        ws.send(JSON.stringify({
            type: 'connected',
            message: 'Connected to notification service',
            timestamp: Date.now()
        }));

        // Handle messages from client
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                this.handleClientMessage(steamId, message);
            } catch (e) {
                console.error('Invalid WebSocket message:', e);
            }
        });

        // Handle disconnect
        ws.on('close', () => {
            const clients = this.clients.get(steamId) || [];
            const index = clients.indexOf(ws);
            if (index > -1) {
                clients.splice(index, 1);
            }
            if (clients.length === 0) {
                this.clients.delete(steamId);
            }
            console.log(`WebSocket client disconnected: ${steamId}`);
        });

        // Heartbeat
        ws.isAlive = true;
        ws.on('pong', () => { ws.isAlive = true; });
    }

    handleClientMessage(steamId, message) {
        switch (message.type) {
            case 'subscribe':
                // Subscribe to specific events
                // e.g., { type: 'subscribe', channel: 'price_alerts', itemName: 'AK-47 | Redline' }
                break;
            case 'ping':
                this.sendToUser(steamId, { type: 'pong', timestamp: Date.now() });
                break;
            default:
                console.log(`Unknown message type from ${steamId}:`, message.type);
        }
    }

    handleRedisMessage(channel, data) {
        const { steamId, ...payload } = data;

        if (steamId) {
            // Send to specific user
            this.sendToUser(steamId, { channel, ...payload });
        } else if (data.broadcast) {
            // Broadcast to all
            this.broadcast({ channel, ...payload });
        }
    }

    // Send notification to specific user
    sendToUser(steamId, message) {
        const clients = this.clients.get(steamId) || [];
        const payload = JSON.stringify(message);

        clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    // Broadcast to all connected clients
    broadcast(message) {
        const payload = JSON.stringify(message);
        this.wss.clients.forEach(ws => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(payload);
            }
        });
    }

    // ==================== NOTIFICATION HELPERS ====================

    // Trade status update
    async notifyTradeUpdate(steamId, tradeData) {
        const notification = {
            type: 'trade_update',
            data: tradeData,
            timestamp: Date.now()
        };

        this.sendToUser(steamId, notification);

        // Also publish to Redis for other instances
        if (this.redis) {
            await this.redis.publish('trade_updates', JSON.stringify({ steamId, ...notification }));
        }
    }

    // Price alert trigger
    async notifyPriceAlert(steamId, alertData) {
        const notification = {
            type: 'price_alert',
            data: alertData,
            timestamp: Date.now()
        };

        this.sendToUser(steamId, notification);

        if (this.redis) {
            await this.redis.publish('price_alerts', JSON.stringify({ steamId, ...notification }));
        }
    }

    // New listing notification (for subscribed items)
    async notifyNewListing(itemName, listingData) {
        const notification = {
            type: 'new_listing',
            data: { itemName, ...listingData },
            timestamp: Date.now(),
            broadcast: true
        };

        this.broadcast(notification);
    }

    // System notification
    async notifySystem(steamId, title, message) {
        const notification = {
            type: 'system',
            data: { title, message },
            timestamp: Date.now()
        };

        this.sendToUser(steamId, notification);
    }

    // Start heartbeat interval
    startHeartbeat(interval = 30000) {
        setInterval(() => {
            this.wss.clients.forEach(ws => {
                if (!ws.isAlive) {
                    return ws.terminate();
                }
                ws.isAlive = false;
                ws.ping();
            });
        }, interval);
    }

    // Get connected users count
    getStats() {
        return {
            totalConnections: this.wss.clients.size,
            uniqueUsers: this.clients.size
        };
    }
}

module.exports = WebSocketNotificationService;
