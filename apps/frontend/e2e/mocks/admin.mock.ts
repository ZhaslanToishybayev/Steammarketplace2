export const mockAdminStats = {
    success: true,
    data: {
        trades: {
            total: 150,
            completed: 145,
            awaiting_buyer: 2,
            awaiting_seller: 1,
            cancelled: 2,
            errors: 0,
            last_24h: 12,
            last_hour: 3
        },
        users: {
            total: 50,
            new_24h: 5,
            new_7d: 15,
            total_balance: 5000.50
        },
        listings: {
            total: 300,
            active: 250,
            reserved: 10,
            sold: 40,
            p2p: 200,
            bot_sale: 100,
            avg_price: 25.50
        },
        revenue: {
            total_fees: 1234.56,
            fees_24h: 45.20,
            fees_7d: 350.00,
            total_volume: 25000.00,
            volume_24h: 900.00
        },
        bots: {
            total: 5,
            online: 4,
            ready: 4,
            activeTrades: 2,
            bots: [
                { name: 'Bot #1', isOnline: true, isReady: true, activeTrades: 1 },
                { name: 'Bot #2', isOnline: false, isReady: false, activeTrades: 0 }
            ]
        },
        recentActivity: [
            {
                id: 1,
                trade_uuid: 'uuid-1',
                status: 'completed',
                item_name: 'AWP | Dragon Lore',
                price: 1500.00,
                trade_type: 'p2p',
                updated_at: new Date().toISOString(),
                buyer_name: 'UserA',
                seller_name: 'UserB'
            }
        ]
    }
};

export const mockAdminLoginSuccess = {
    success: true,
    data: {
        token: 'mock-admin-token-xyz',
        admin: {
            id: 1,
            username: 'superadmin',
            role: 'superadmin'
        }
    }
};
