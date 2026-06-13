const { p2pFlowService, P2P_STATUS, LISTING_STATUS } = require('../../src/services/p2p-flow.service');

jest.mock('../../src/services/notification.service', () => ({
    notificationService: { notifyTradeUpdate: jest.fn() },
}));

const mockClient = {
    query: jest.fn(),
};

describe('p2pFlowService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('P2P_STATUS constants', () => {
        test('has all required states', () => {
            expect(P2P_STATUS.PAYMENT_RESERVED).toBe('PAYMENT_RESERVED');
            expect(P2P_STATUS.WAITING_SELLER).toBe('WAITING_SELLER');
            expect(P2P_STATUS.TRADE_SENT).toBe('TRADE_SENT');
            expect(P2P_STATUS.TRADE_ACCEPTED).toBe('TRADE_ACCEPTED');
            expect(P2P_STATUS.SETTLEMENT_PENDING).toBe('SETTLEMENT_PENDING');
            expect(P2P_STATUS.TRADE_COMPLETED).toBe('TRADE_COMPLETED');
            expect(P2P_STATUS.CANCELLED).toBe('CANCELLED');
            expect(P2P_STATUS.REFUNDED).toBe('REFUNDED');
            expect(P2P_STATUS.DISPUTED).toBe('DISPUTED');
        });
    });

    describe('LISTING_STATUS constants', () => {
        test('has required listing statuses', () => {
            expect(LISTING_STATUS.OPEN).toBe('OPEN');
            expect(LISTING_STATUS.RESERVED).toBe('RESERVED');
            expect(LISTING_STATUS.SOLD).toBe('SOLD');
            expect(LISTING_STATUS.REMOVED).toBe('REMOVED');
        });
    });

    describe('markSellerTradeSent', () => {
        const setupMocks = () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'WAITING_SELLER' }] }) // SELECT FOR UPDATE
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'TRADE_SENT' }] }) // UPDATE
                .mockResolvedValueOnce({ rows: [] }) // INSERT history
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'TRADE_SENT' }] }); // SELECT for notification
        };

        test('updates trade status to TRADE_SENT', async () => {
            setupMocks();
            await p2pFlowService.markSellerTradeSent(mockClient, 'test-uuid', 'offer-123');

            const updateCall = mockClient.query.mock.calls.find(
                ([sql, params]) => sql.includes('UPDATE escrow_trades') && (params || []).includes('TRADE_SENT')
            );
            expect(updateCall).toBeDefined();
        });

        test('records status history entry', async () => {
            setupMocks();
            await p2pFlowService.markSellerTradeSent(mockClient, 'test-uuid', 'offer-123');

            const historyCall = mockClient.query.mock.calls.find(
                ([sql]) => sql.includes('escrow_trade_history')
            );
            expect(historyCall).toBeDefined();
        });
    });

    describe('cancelAndRefund', () => {
        const mockTrade = {
            id: 1,
            trade_uuid: 'test-uuid',
            buyer_steam_id: '76561198000000002',
            seller_steam_id: '76561198000000001',
            price: '100.00',
            currency: 'USD',
            listing_id: 5,
            status: 'WAITING_SELLER',
        };

        const setupCancelMocks = () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // UPDATE escrow_trades status
                .mockResolvedValueOnce({ rows: [] }) // UPDATE users reserved_balance
                .mockResolvedValueOnce({ rows: [] }) // INSERT escrow_transactions
                .mockResolvedValueOnce({ rows: [] }) // UPDATE listings
                .mockResolvedValueOnce({ rows: [] }) // INSERT history
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'REFUNDED' }] }); // SELECT for notification
        };

        test('refunds buyer and cancels trade', async () => {
            setupCancelMocks();
            await p2pFlowService.cancelAndRefund(mockClient, mockTrade, 'Test cancel', 'system');

            const refundQuery = mockClient.query.mock.calls.find(
                ([sql]) => sql.includes("reserved_balance = GREATEST")
            );
            expect(refundQuery).toBeDefined();
        });

        test('records escrow transaction for refund', async () => {
            setupCancelMocks();
            await p2pFlowService.cancelAndRefund(mockClient, mockTrade, 'Test cancel', 'system');

            const txQuery = mockClient.query.mock.calls.find(
                ([sql]) => sql.includes('INSERT INTO escrow_transactions')
            );
            expect(txQuery).toBeDefined();
        });
    });

    describe('releaseDueSettlements', () => {
        test('releases due settlements', async () => {
            mockClient.query
                .mockResolvedValueOnce({ rows: [{ id: 1, trade_uuid: 't1', seller_steam_id: '76561198000000001', seller_payout: '95.00', price: '100.00', currency: 'USD' }] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 1, status: 'TRADE_COMPLETED' }] });

            const count = await p2pFlowService.releaseDueSettlements(mockClient);
            expect(count).toBe(1);
        });

        test('returns 0 when no settlements due', async () => {
            mockClient.query.mockResolvedValueOnce({ rows: [] });
            const count = await p2pFlowService.releaseDueSettlements(mockClient);
            expect(count).toBe(0);
        });
    });
});
