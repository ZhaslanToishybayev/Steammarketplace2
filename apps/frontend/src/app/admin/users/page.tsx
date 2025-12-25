'use client';

import { useEffect, useState } from 'react';
import { useAdminApi } from '../../../hooks/useAdminAuth';
import { Card, CardContent, Button, SearchInput, Badge, Input, ConfirmModal, TableRowSkeleton } from '../../../components/ui';

interface User {
    id: number;
    steam_id: string;
    username: string;
    avatar: string;
    balance: string;
    is_banned: boolean;
    created_at: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function AdminUsersPage() {
    const { apiCall } = useAdminApi();
    const [users, setUsers] = useState<User[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [balanceInput, setBalanceInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmBan, setConfirmBan] = useState<User | null>(null);

    useEffect(() => {
        loadUsers();
    }, [page, search]);

    const loadUsers = async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({ page: page.toString(), limit: '20' });
            if (search) queryParams.append('search', search);

            const data = await apiCall(`/users?${queryParams}`);
            if (data.success) {
                setUsers(data.data.users);
                setPagination(data.data.pagination);
            }
        } catch (err) {
            console.error('Failed to load users:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateBalance = async () => {
        if (!editingUser || !balanceInput) return;
        setSaving(true);

        try {
            const data = await apiCall(`/users/${editingUser.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ balance_set: parseFloat(balanceInput) }),
            });

            if (data.success) {
                setUsers(users.map(u => u.id === editingUser.id ? data.data : u));
                setEditingUser(null);
            }
        } catch (err) {
            console.error('Failed to update balance:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleBan = async () => {
        if (!confirmBan) return;
        setSaving(true);

        try {
            const data = await apiCall(`/users/${confirmBan.id}`, {
                method: 'PATCH',
                body: JSON.stringify({ is_banned: !confirmBan.is_banned }),
            });

            if (data.success) {
                setUsers(users.map(u => u.id === confirmBan.id ? data.data : u));
                setConfirmBan(null);
            }
        } catch (err) {
            console.error('Failed to toggle ban:', err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white">Users</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {pagination ? `${pagination.total} total users` : 'Loading...'}
                    </p>
                </div>
                <div className="w-64">
                    <SearchInput
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        onClear={() => setSearch('')}
                    />
                </div>
            </div>

            {/* Table */}
            <Card>
                <CardContent className="p-0">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>User</th>
                                <th>Steam ID</th>
                                <th>Balance</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={6} />)
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="text-center py-8 text-[var(--text-muted)]">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={user.avatar || '/default-avatar.png'}
                                                    alt=""
                                                    className="w-8 h-8 rounded-full"
                                                />
                                                <span className="font-medium">{user.username}</span>
                                            </div>
                                        </td>
                                        <td className="font-mono text-sm text-[var(--text-muted)]">
                                            {user.steam_id}
                                        </td>
                                        <td>
                                            <span className="text-[var(--accent-green)] font-mono">
                                                ${parseFloat(user.balance).toFixed(2)}
                                            </span>
                                        </td>
                                        <td>
                                            <Badge variant={user.is_banned ? 'red' : 'green'}>
                                                {user.is_banned ? 'Banned' : 'Active'}
                                            </Badge>
                                        </td>
                                        <td className="text-[var(--text-muted)]">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => {
                                                        setEditingUser(user);
                                                        setBalanceInput(user.balance);
                                                    }}
                                                >
                                                    Edit $
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant={user.is_banned ? 'success' : 'destructive'}
                                                    onClick={() => setConfirmBan(user)}
                                                >
                                                    {user.is_banned ? 'Unban' : 'Ban'}
                                                </Button>
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
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            ← Prev
                        </Button>
                        <span className="px-4 py-2 text-[var(--text-secondary)]">
                            Page {page} of {pagination.pages}
                        </span>
                        <Button
                            size="sm"
                            variant="secondary"
                            disabled={page === pagination.pages}
                            onClick={() => setPage(page + 1)}
                        >
                            Next →
                        </Button>
                    </div>
                )}
            </Card>

            {/* Edit Balance Modal */}
            {editingUser && (
                <div className="modal-overlay" onClick={() => setEditingUser(null)}>
                    <div className="modal-content w-96" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[var(--border-default)]">
                            <h2 className="font-semibold text-white">Edit Balance</h2>
                        </div>
                        <div className="p-4">
                            <p className="text-[var(--text-secondary)] mb-4">
                                User: {editingUser.username}
                            </p>
                            <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">New Balance</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                            />
                            <div className="flex gap-2 mt-4">
                                <Button variant="secondary" onClick={() => setEditingUser(null)}>
                                    Cancel
                                </Button>
                                <Button variant="default" onClick={handleUpdateBalance} loading={saving}>
                                    Save
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Ban Confirmation */}
            <ConfirmModal
                isOpen={!!confirmBan}
                onClose={() => setConfirmBan(null)}
                onConfirm={handleToggleBan}
                title={confirmBan?.is_banned ? 'Unban User' : 'Ban User'}
                description={confirmBan ? `Are you sure you want to ${confirmBan.is_banned ? 'unban' : 'ban'} ${confirmBan.username}?` : ''}
                confirmText={confirmBan?.is_banned ? 'Unban' : 'Ban'}
                variant={confirmBan?.is_banned ? 'default' : 'destructive'}
                loading={saving}
            />
        </div>
    );
}
