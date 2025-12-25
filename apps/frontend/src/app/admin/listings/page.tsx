'use client';

import { useEffect, useState } from 'react';
import { useAdminApi } from '../../../hooks/useAdminAuth';
import { Card, CardContent, Badge, TableRowSkeleton } from '../../../components/ui';

interface Listing {
    id: number;
    item_name: string;
    item_icon_url: string;
    price: string;
    status: string;
    is_featured: boolean;
    seller_name: string;
    created_at: string;
}

export default function AdminListingsPage() {
    const { apiCall } = useAdminApi();
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<any>(null);

    useEffect(() => {
        loadListings();
    }, [page, statusFilter]);

    const loadListings = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (statusFilter) params.append('status', statusFilter);

            const data = await apiCall(`/listings?${params}`);
            if (data.success) {
                setListings(data.data.listings);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Failed to load listings:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFeature = async (id: number, featured: boolean) => {
        try {
            const data = await apiCall(`/listings/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_featured: featured }),
            });
            if (data.success) {
                setListings(listings.map(l => l.id === id ? { ...l, is_featured: featured } : l));
            }
        } catch (err) {
            console.error('Failed to feature listing:', err);
        }
    };

    const handleRemove = async (id: number) => {
        if (!confirm('Are you sure you want to remove this listing?')) return;

        try {
            const data = await apiCall(`/listings/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ status: 'removed' }),
            });
            if (data.success) {
                setListings(listings.map(l => l.id === id ? { ...l, status: 'removed' } : l));
            }
        } catch (err) {
            console.error('Failed to remove listing:', err);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'green';
            case 'sold': return 'blue';
            case 'removed': case 'cancelled': return 'red';
            default: return 'orange';
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Listings</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {pagination ? `${pagination.total} total listings` : 'Loading...'}
                    </p>
                </div>
                <div className="flex gap-2">
                    {['', 'active', 'sold', 'removed'].map((status) => (
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
                                <th>Item</th>
                                <th>Price</th>
                                <th>Seller</th>
                                <th>Status</th>
                                <th>Featured</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                            ) : listings.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                                        No listings found
                                    </td>
                                </tr>
                            ) : (
                                listings.map((listing) => (
                                    <tr key={listing.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={`https://community.cloudflare.steamstatic.com/economy/image/${listing.item_icon_url}`}
                                                    alt=""
                                                    className="w-10 h-10 object-contain bg-[var(--bg-tertiary)] rounded"
                                                />
                                                <span className="font-medium truncate max-w-[200px]">{listing.item_name}</span>
                                            </div>
                                        </td>
                                        <td className="text-[var(--accent-green)] font-mono">
                                            ${parseFloat(listing.price).toFixed(2)}
                                        </td>
                                        <td className="text-[var(--text-secondary)]">
                                            {listing.seller_name || 'Unknown'}
                                        </td>
                                        <td>
                                            <Badge variant={getStatusColor(listing.status) as any}>
                                                {listing.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {listing.is_featured ? (
                                                <span className="text-[var(--rarity-gold)]">⭐ Featured</span>
                                            ) : (
                                                <span className="text-[var(--text-muted)]">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleFeature(listing.id, !listing.is_featured)}
                                                    className={`btn btn-sm ${listing.is_featured ? 'btn-warning' : 'btn-secondary'}`}
                                                >
                                                    {listing.is_featured ? 'Unfeature' : 'Feature'}
                                                </button>
                                                {listing.status === 'active' && (
                                                    <button
                                                        onClick={() => handleRemove(listing.id)}
                                                        className="btn btn-sm btn-danger"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
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
