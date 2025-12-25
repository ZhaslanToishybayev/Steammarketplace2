/**
 * Singleton WebSocket Notifier
 * Initialized by server.js, used by other services
 */

let wsNotificationService = null;

function setWsNotificationService(service) {
    wsNotificationService = service;
    console.log('[WsNotifier] Service registered');
}

function getWsNotificationService() {
    return wsNotificationService;
}

// Convenience Methods
async function notifyTradeUpdate(steamId, tradeData) {
    if (wsNotificationService) {
        await wsNotificationService.notifyTradeUpdate(steamId, tradeData);
    }
}

async function notifySystem(steamId, title, message) {
    if (wsNotificationService) {
        await wsNotificationService.notifySystem(steamId, title, message);
    }
}

module.exports = {
    setWsNotificationService,
    getWsNotificationService,
    notifyTradeUpdate,
    notifySystem
};
