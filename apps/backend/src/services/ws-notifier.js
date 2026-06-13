/**
 * Socket.IO Notifier (Unified)
 * Uses the main Socket.IO instance to send real-time updates
 */

let ioInstance = null;

function setIoInstance(io) {
    ioInstance = io;
    console.log('[WsNotifier] Socket.IO instance registered');
}

function getIoInstance() {
    return ioInstance;
}

/**
 * Notify user about trade update
 * @param {string} steamId 
 * @param {object} tradeData 
 */
async function notifyTradeUpdate(steamId, tradeData) {
    if (ioInstance) {
        // Emit to user's personal room
        ioInstance.to(`user:${steamId}`).emit('trade:update', tradeData);
        
        // Also emit to specific trade room
        if (tradeData.tradeUuid) {
            ioInstance.to(`trade:${tradeData.tradeUuid}`).emit('trade:update', tradeData);
        }
        
        console.log(`[WsNotifier] Sent trade update to ${steamId}`);
    } else {
        console.warn('[WsNotifier] Socket.IO not initialized, skipping notification');
    }
}

/**
 * Send system notification
 */
async function notifySystem(steamId, title, message) {
    if (ioInstance) {
        ioInstance.to(`user:${steamId}`).emit('notification', {
            type: 'system',
            title,
            message,
            timestamp: Date.now()
        });
    }
}

module.exports = {
    setIoInstance,
    getIoInstance,
    notifyTradeUpdate,
    notifySystem
};
