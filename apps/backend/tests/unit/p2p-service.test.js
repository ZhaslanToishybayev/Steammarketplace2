const p2pService = require('../../src/services/p2p.service');
const { pool } = require('../../src/config/database');

jest.mock('../../src/config/database', () => ({
    pool: { connect: jest.fn(), query: jest.fn() },
    query: jest.fn(),
}));

jest.mock('../../src/services/notification.service', () => ({
    notificationService: { notifyTradeUpdate: jest.fn() },
}));

jest.mock('axios');

const axios = require('axios');

describe('p2pService.getApiKey', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STEAM_API_KEY = 'TEST_GLOBAL_KEY_32_CHARS__';
    });

    test('returns key from DB when user has one', async () => {
        pool.query.mockResolvedValue({ rows: [{ api_key: 'USER_KEY_32_CHARS___________' }] });
        const key = await p2pService.getApiKey('76561198000000001');
        expect(key).toBe('USER_KEY_32_CHARS___________');
    });

    test('falls back to global STEAM_API_KEY when no user key', async () => {
        pool.query.mockResolvedValue({ rows: [] });
        const key = await p2pService.getApiKey('76561198000000001');
        expect(key).toBe('TEST_GLOBAL_KEY_32_CHARS__');
    });

    test('returns null when no key anywhere', async () => {
        delete process.env.STEAM_API_KEY;
        pool.query.mockResolvedValue({ rows: [] });
        const key = await p2pService.getApiKey('76561198000000001');
        expect(key).toBeNull();
    });

    test('ignores placeholder global key', async () => {
        process.env.STEAM_API_KEY = 'local_docker_placeholder_key';
        pool.query.mockResolvedValue({ rows: [] });
        const key = await p2pService.getApiKey('76561198000000001');
        expect(key).toBeNull();
    });
});

describe('p2pService.registerApiKey', () => {
    test('validates 32-char hex key', async () => {
        await expect(p2pService.registerApiKey('76561198000000001', 'short'))
            .rejects.toThrow('Invalid Steam API Key format');
    });

    test('inserts key into DB', async () => {
        const mockClient = { query: jest.fn().mockResolvedValue({ rows: [] }), release: jest.fn() };
        pool.connect.mockResolvedValue(mockClient);
        const result = await p2pService.registerApiKey('76561198000000001', 'ABCDEF0123456789ABCDEF0123456789');
        expect(result).toBe(true);
        expect(mockClient.query).toHaveBeenCalled();
    });
});

describe('p2pService._steamIdToAccountId', () => {
    test('converts SteamID64 to account ID', () => {
        const accountId = p2pService._steamIdToAccountId('76561197960265729');
        expect(accountId).toBe(1);
    });

    test('converts known SteamID64 correctly', () => {
        const accountId = p2pService._steamIdToAccountId('76561198000000001');
        expect(typeof accountId).toBe('number');
        expect(accountId).toBeGreaterThan(0);
    });
});

describe('p2pService.syncTrade', () => {
    const mockTrade = {
        id: 1,
        trade_uuid: 'test-uuid-1234',
        trade_type: 'p2p',
        status: 'WAITING_SELLER',
        seller_steam_id: '76561198000000001',
        buyer_steam_id: '76561198000000002',
        item_asset_id: '1234567890',
        seller_trade_offer_id: null,
        created_at: new Date(),
        price: '100.00',
        currency: 'USD',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.STEAM_API_KEY = 'TEST_GLOBAL_KEY_32_CHARS__';
        pool.connect.mockResolvedValue({
            query: jest.fn(),
            release: jest.fn(),
        });
    });

    test('returns terminal status for completed trades', async () => {
        const terminalTrade = { ...mockTrade, status: 'TRADE_COMPLETED' };
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [terminalTrade] }),
            release: jest.fn(),
        });
        const result = await p2pService.syncTrade('test-uuid');
        expect(result.status).toBe('TRADE_COMPLETED');
        expect(result.message).toContain('terminal state');
    });

    test('returns message for non-P2P trades', async () => {
        const nonP2P = { ...mockTrade, trade_type: 'bot_sale' };
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [nonP2P] }),
            release: jest.fn(),
        });
        const result = await p2pService.syncTrade('test-uuid');
        expect(result.message).toContain('Not a P2P trade');
    });

    test('handles 403 from Steam API gracefully', async () => {
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [{ ...mockTrade, seller_trade_offer_id: '12345' }] }),
            release: jest.fn(),
        });
        axios.get.mockRejectedValue({ response: { status: 403 } });
        const result = await p2pService.syncTrade('test-uuid');
        expect(result.message).toContain('API key invalid');
    });

    test('handles no API key scenario', async () => {
        delete process.env.STEAM_API_KEY;
        pool.query.mockResolvedValue({ rows: [] });
        pool.connect.mockResolvedValue({
            query: jest.fn().mockResolvedValue({ rows: [mockTrade] }),
            release: jest.fn(),
        });
        const result = await p2pService.syncTrade('test-uuid');
        expect(result.message).toContain('Seller has no API Key');
    });
});
