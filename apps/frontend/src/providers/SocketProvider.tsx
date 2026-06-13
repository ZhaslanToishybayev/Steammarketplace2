'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

interface SocketContextType {
    socket: Socket | null;
    connected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    connected: false
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [connected, setConnected] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        // DEBUG MODE: Minimal config to verify connection
        console.log(`🔌 Attempting socket connection (Minimal)...`);

        const newSocket = io({
            path: '/socket.io',
            transports: ['polling'],
            autoConnect: true,
            // withCredentials: true, // Disabled for test
            // query: { steamId: ... } // Disabled for test
        });

        newSocket.on('connect', () => {
            console.log('✅ Socket Connected ID:', newSocket.id);
            setConnected(true);
            toast.success('Real-time updates active', { id: 'socket-status', icon: '⚡' });
        });

        newSocket.on('connect_error', (err) => {
            console.error('❌ Socket Connection Error:', err.message);
            setConnected(false);
            // toast.error(`Connection failed: ${err.message}`, { id: 'socket-status' });
        });

        newSocket.on('disconnect', (reason) => {
            console.log('🔌 Socket Disconnected:', reason);
            setConnected(false);
        });

        // --- Event Listeners ---

        newSocket.on('trade_updated', (data: any) => {
            console.log('🔔 Trade Update:', data);
            
            if (data.status === 'awaiting_buyer') {
                toast.success(
                    <div className="flex flex-col gap-1">
                        <span className="font-bold">Trade Offer Sent!</span>
                        <span className="text-sm">Please accept it in your Steam App.</span>
                    </div>,
                    { duration: 6000, icon: '📩' }
                );
            } else if (data.status === 'completed') {
                toast.success('Trade Completed! Funds credited.', { icon: '💰' });
            }
            
            // Refresh data
            queryClient.invalidateQueries({ queryKey: ['trades'] });
            queryClient.invalidateQueries({ queryKey: ['listings'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        });

        newSocket.on('trade_failed', (data: any) => {
            console.error('❌ Trade Failed:', data);
            toast.error(
                <div className="flex flex-col gap-1">
                    <span className="font-bold">Trade Failed</span>
                    <span className="text-sm">{data.reason || 'Unknown error'}</span>
                    <span className="text-xs opacity-75">Funds refunded automatically.</span>
                </div>,
                { duration: 8000 }
            );
            
            // Refresh balance
            queryClient.invalidateQueries({ queryKey: ['user'] });
            if (typeof window !== 'undefined' && window.location.pathname.includes('/marketplace')) {
                 window.location.reload();
            }
        });

        newSocket.on('balance_updated', () => {
             console.log('💰 Balance Update');
             queryClient.invalidateQueries({ queryKey: ['user'] }); // Refresh user data (balance)
        });

        newSocket.on('listing_update', (data: any) => {
            if (data.status === 'awaiting_deposit') {
                 toast.success('Listing Created! Bot is waiting for your item.', { icon: '🤖' });
            }
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [user?.steamId]); // Re-connect if user changes

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
}