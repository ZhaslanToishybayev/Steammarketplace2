'use client';

import { useEffect, useState } from 'react';
import { useAdminApi } from '../../../hooks/useAdminAuth';
import { Card, CardContent, Badge, StatusBadge } from '../../../components/ui';

interface Bot {
    id: number;
    account_name: string;
    steam_id: string;
    is_online: boolean;
    inventory_count: number;
    active_trades: number;
    last_login_at: string;
    created_at: string;
}

export default function AdminBotsPage() {
    const { apiCall } = useAdminApi();
    const [bots, setBots] = useState<Bot[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadBots();
    }, []);

    const loadBots = async () => {
        try {
            const data = await apiCall('/bots');
            if (data.success) {
                setBots(data.data);
            }
        } catch (err) {
            console.error('Failed to load bots:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const onlineBots = bots.filter(b => b.is_online).length;

    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white">Bots</h1>
                <p className="text-[var(--text-secondary)] mt-1">
                    {onlineBots} / {bots.length} online
                </p>
            </div>

            {/* Bot Cards */}
            {isLoading ? (
                <div className="text-center py-12 text-[var(--text-muted)]">Loading bots...</div>
            ) : bots.length === 0 ? (
                <Card className="p-12 text-center">
                    <div className="text-4xl mb-4">🤖</div>
                    <h3 className="text-xl font-semibold text-white mb-2">No Bots Configured</h3>
                    <p className="text-[var(--text-secondary)]">Add bot credentials in .env to get started</p>
                </Card>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {bots.map((bot) => (
                        <Card key={bot.id} className={`p-6 ${bot.is_online ? 'border-[var(--accent-green)]' : ''}`}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${bot.is_online ? 'bg-[var(--accent-green)]/20' : 'bg-[var(--bg-tertiary)]'
                                        }`}>
                                        🤖
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-white">{bot.account_name}</h3>
                                        <StatusBadge status={bot.is_online ? 'online' : 'offline'} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">Steam ID</span>
                                    <span className="font-mono text-sm">{bot.steam_id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">Inventory</span>
                                    <span>{bot.inventory_count || 0} items</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">Active Trades</span>
                                    <Badge variant={bot.active_trades > 0 ? 'orange' : 'green'}>
                                        {bot.active_trades || 0}
                                    </Badge>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-[var(--text-muted)]">Last Login</span>
                                    <span className="text-sm">
                                        {bot.last_login_at ? new Date(bot.last_login_at).toLocaleString() : 'Never'}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
                                <button className="btn btn-sm btn-secondary w-full" disabled>
                                    Restart Bot (Coming Soon)
                                </button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
