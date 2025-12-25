'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '../../../hooks/useAdminAuth';
import { Button, Input } from '../../../components/ui';

export default function AdminLoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAdminAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const success = await login(username, password);

        if (success) {
            router.push('/admin');
        } else {
            setError('Invalid username or password');
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent-red)] to-[var(--accent-orange)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="text-white font-bold text-2xl">A</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
                    <p className="text-[var(--text-muted)] mt-1">Steam Marketplace Management</p>
                </div>

                {/* Login Form */}
                <div className="card p-6">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Username</label>
                            <Input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                            />
                        </div>

                        <div className="mb-6">
                            <label className="text-sm font-medium text-[var(--text-primary)] mb-1 block">Password</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                            />
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-lg text-[var(--accent-red)] text-sm">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            variant="default"
                            size="lg"
                            className="w-full"
                            loading={loading}
                        >
                            Sign In
                        </Button>
                    </form>
                </div>

                {/* Default credentials hint */}
                <p className="text-center text-[var(--text-muted)] text-sm mt-6">
                    Default: admin / admin123
                </p>
            </div>
        </div>
    );
}
