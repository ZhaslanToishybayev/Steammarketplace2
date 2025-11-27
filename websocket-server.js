// WEBSOCKET REAL-TIME UPDATES
// ============================
// WebSocket server for real-time inventory updates, trading notifications, and marketplace updates

const WebSocket = require('ws');
const http = require('http');

// Create HTTP server for WebSocket upgrade
const createWebSocketServer = (app) => {
  const server = http.createServer(app);
  const wss = new WebSocket.Server({ server });

  // Store active connections
  const clients = new Map();
  const userConnections = new Map();

  // WebSocket connection handler
  wss.on('connection', (ws, request) => {
    console.log('🔗 WebSocket client connected');

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);

        switch (data.type) {
          case 'authenticate':
            await handleAuthentication(ws, data);
            break;

          case 'subscribe_inventory':
            await handleInventorySubscription(ws, data);
            break;

          case 'subscribe_marketplace':
            await handleMarketplaceSubscription(ws, data);
            break;

          case 'subscribe_trades':
            await handleTradeSubscription(ws, data);
            break;

          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          default:
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Unknown message type'
            }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      console.log('🔌 WebSocket client disconnected');

      // Clean up user connections
      for (const [userId, connections] of userConnections.entries()) {
        const filtered = connections.filter(conn => conn !== ws);
        if (filtered.length === 0) {
          userConnections.delete(userId);
        } else {
          userConnections.set(userId, filtered);
        }
      }

      clients.delete(ws);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to Steam Marketplace WebSocket',
      timestamp: new Date().toISOString()
    }));
  });

  // Authentication handler
  const handleAuthentication = async (ws, data) => {
    try {
      const { token } = data;

      // Verify JWT token
      const jwt = require('./jwt-auth-middleware');
      const decoded = jwt.jwt.verify(token, jwt.JWT_SECRET);

      ws.userId = decoded.userId;
      ws.steamId = decoded.steamId;
      ws.authenticated = true;

      // Add to user connections
      if (!userConnections.has(ws.userId)) {
        userConnections.set(ws.userId, []);
      }
      userConnections.get(ws.userId).push(ws);

      clients.set(ws, {
        userId: ws.userId,
        steamId: ws.steamId,
        authenticated: true,
        subscriptions: new Set()
      });

      ws.send(JSON.stringify({
        type: 'authenticated',
        userId: ws.userId,
        steamId: ws.steamId,
        message: 'Authentication successful'
      }));

      console.log(`✅ User ${ws.userId} authenticated via WebSocket`);

    } catch (error) {
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
      ws.close();
    }
  };

  // Inventory subscription handler
  const handleInventorySubscription = async (ws, data) => {
    if (!ws.authenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required'
      }));
      return;
    }

    const { steamId } = data;
    if (steamId !== ws.steamId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Access denied'
      }));
      return;
    }

    const client = clients.get(ws);
    client.subscriptions.add('inventory');

    ws.send(JSON.stringify({
      type: 'inventory_subscribed',
      steamId: steamId,
      message: 'Subscribed to inventory updates'
    }));

    // Send current inventory
    try {
      const inventory = await getSteamInventory(steamId);
      ws.send(JSON.stringify({
        type: 'inventory_update',
        steamId: steamId,
        inventory: inventory,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'inventory_error',
        steamId: steamId,
        error: error.message
      }));
    }
  };

  // Marketplace subscription handler
  const handleMarketplaceSubscription = async (ws, data) => {
    if (!ws.authenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required'
      }));
      return;
    }

    const client = clients.get(ws);
    client.subscriptions.add('marketplace');

    ws.send(JSON.stringify({
      type: 'marketplace_subscribed',
      message: 'Subscribed to marketplace updates'
    }));

    // Send current marketplace listings
    try {
      const listings = await DatabaseService.getAllActiveListings(50);
      ws.send(JSON.stringify({
        type: 'marketplace_update',
        listings: listings,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'marketplace_error',
        error: error.message
      }));
    }
  };

  // Trade subscription handler
  const handleTradeSubscription = async (ws, data) => {
    if (!ws.authenticated) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Authentication required'
      }));
      return;
    }

    const client = clients.get(ws);
    client.subscriptions.add('trades');

    ws.send(JSON.stringify({
      type: 'trades_subscribed',
      userId: ws.userId,
      message: 'Subscribed to trade updates'
    }));

    // Send current trade offers
    try {
      const tradeOffers = await DatabaseService.getUserTradeOffers(ws.userId);
      ws.send(JSON.stringify({
        type: 'trades_update',
        trades: tradeOffers,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'trades_error',
        error: error.message
      }));
    }
  };

  // Broadcast to specific user
  const broadcastToUser = (userId, message) => {
    const connections = userConnections.get(userId);
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
      });
    }
  };

  // Broadcast to all authenticated users
  const broadcastToAuthenticated = (message) => {
    clients.forEach((client, ws) => {
      if (ws.authenticated && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  // Broadcast to subscribers of specific type
  const broadcastToSubscribers = (subscriptionType, message) => {
    clients.forEach((client, ws) => {
      if (client.subscriptions.has(subscriptionType) &&
          ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  };

  // Health check
  const getWebSocketStats = () => {
    return {
      totalConnections: clients.size,
      authenticatedConnections: Array.from(clients.values())
        .filter(client => client.authenticated).length,
      userConnections: userConnections.size,
      subscriptions: {
        inventory: Array.from(clients.values())
          .filter(client => client.subscriptions.has('inventory')).length,
        marketplace: Array.from(clients.values())
          .filter(client => client.subscriptions.has('marketplace')).length,
        trades: Array.from(clients.values())
          .filter(client => client.subscriptions.has('trades')).length
      }
    };
  };

  // Start health check interval
  setInterval(() => {
    // Clean up inactive connections
    clients.forEach((client, ws) => {
      if (ws.readyState === WebSocket.CLOSED) {
        clients.delete(ws);
      }
    });
  }, 30000); // Every 30 seconds

  return {
    server,
    wss,
    broadcastToUser,
    broadcastToAuthenticated,
    broadcastToSubscribers,
    getWebSocketStats
  };
};

// Helper function to get Steam inventory (import from main server)
async function getSteamInventory(steamId, appId = 570) {
  // This would need to be imported from the main server
  // For now, return mock data
  return {
    success: true,
    steamId,
    appId,
    items: [],
    totalCount: 0,
    method: 'websocket_mock'
  };
}

module.exports = { createWebSocketServer };