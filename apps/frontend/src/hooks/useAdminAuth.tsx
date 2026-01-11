'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface Admin {
    id: number;
    username: string;
    role: string;
}

interface AdminAuthContextType {
    admin: Admin | null;
    token: string | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function useAdminAuth() {
    const context = useContext(AdminAuthContext);
    if (!context) {
        throw new Error('useAdminAuth must be used within AdminAuthProvider');
    }
    return context;
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
    const [admin, setAdmin] = useState<Admin | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for existing token on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('admin_token');
        if (storedToken) {
            verifyToken(storedToken);
        } else {
            setIsLoading(false);
        }
    }, []);

    const verifyToken = async (storedToken: string) => {
        try {
            const res = await fetch('/api/admin/verify', {
                headers: { Authorization: `Bearer ${storedToken}` },
            });
            const data = await res.json();
            if (data.success) {
                setAdmin(data.admin);
                setToken(storedToken);
            } else {
                localStorage.removeItem('admin_token');
            }
        } catch (err) {
            localStorage.removeItem('admin_token');
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (username: string, password: string): Promise<boolean> => {
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.success) {
                setAdmin(data.data.admin);
                setToken(data.data.token);
                localStorage.setItem('admin_token', data.data.token);
                return true;
            }
            return false;
        } catch (err) {
            return false;
        }
    };

    const logout = () => {
        setAdmin(null);
        setToken(null);
        localStorage.removeItem('admin_token');
    };

    return (
        <AdminAuthContext.Provider value={{ admin, token, isLoading, login, logout }}>
            {children}
        </AdminAuthContext.Provider>
    );
}

// API helper hook
export function useAdminApi() {
    const { token } = useAdminAuth();

    const apiCall = async (endpoint: string, options: RequestInit = {}) => {
        const res = await fetch(`/api/admin${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...options.headers,
            },
        });
        return res.json();
    };

    return { apiCall };
}
