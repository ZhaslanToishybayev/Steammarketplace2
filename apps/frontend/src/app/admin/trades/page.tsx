'use client';

import { useEffect, useState } from 'react';
import { useAdminApi } from '../../../hooks/useAdminAuth';
import { Card, CardContent, Badge, TableRowSkeleton } from '../../../components/ui';

interface Trade {
    id: number;
    trade_uuid: string;
    status: string;
    item_name: string;
    price: string;
    buyer_name: string;
    seller_name: string;
    created_at: string;
}

export default function AdminTradesPage() {
    const { apiCall } = useAdminApi();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    useEffect(() => {
        loadTrades();
    }, [page, statusFilter]);

    const loadTrades = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (statusFilter) params.append('status', statusFilter);

            const data = await apiCall(`/trades?${params}`);
            if (data.success) {
                setTrades(data.data.trades);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Failed to load trades:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'green';
            case 'pending': case 'awaiting_seller': case 'awaiting_buyer': return 'orange';
            case 'cancelled': case 'failed': return 'red';
            default: return 'blue';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Trades</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {pagination ? `${pagination.total} total trades` : 'Loading...'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {['', 'pending', 'awaiting_seller', 'completed', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setPage(1); }}
                            className={`btn btn-sm ${statusFilter === status ? 'btn-primary' : 'btn-secondary'}`}
                        >
                            {status || 'All'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Trade ID</th>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Buyer → Seller</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                            ) : trades.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                                        No trades found
                                    </td>
                                </tr>
                            ) : (
                                trades.map((trade) => (
                                    <tr key={trade.id}>
                                        <td className="font-mono text-sm">
                                            {trade.trade_uuid.slice(0, 8)}...
                                        </td>
                                        <td className="font-medium truncate max-w-[200px]">
                                            {trade.item_name}
                                        </td>
                                        <td className="text-[var(--accent-green)] font-mono">
                                            ${parseFloat(trade.price).toFixed(2)}
                                        </td>
                                        <td className="text-[var(--text-secondary)]">
                                            <span className="text-[var(--accent-blue)]">{trade.buyer_name || 'Unknown'}</span>
                                            {' → '}
                                            <span className="text-[var(--accent-orange)]">{trade.seller_name || 'Unknown'}</span>
                                        </td>
                                        <td>
                                            <Badge variant={getStatusColor(trade.status) as any}>
                                                {trade.status}
                                            </Badge>
                                        </td>
                                        <td className="text-[var(--text-muted)]">
                                            {new Date(trade.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </CardContent>

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="p-4 border-t border-[var(--border-default)] flex justify-center gap-2">
                        <button
                            className="btn btn-sm btn-secondary"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            ← Prev
                        </button>
                        <span className="px-4 py-2 text-[var(--text-secondary)]">
                            Page {page} of {pagination.pages}
                        </span>
                        <button
                            className="btn btn-sm btn-secondary"
                            disabled={page === pagination.pages}
                            onClick={() => setPage(page + 1)}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
}
