'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { STORAGE_KEYS } from '@/utils/constants';

// Helper function to check if we're running in a browser environment
const isBrowser = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

// Helper function to safely access localStorage
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return isBrowser() ? localStorage.getItem(key) : null;
    } catch (error) {
      console.warn('localStorage access failed:', error);
      return null;
    }
  },
};

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      const token = safeLocalStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return;

      // Validate WebSocket URL
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
      if (!wsUrl || wsUrl.trim() === '') {
        console.error('❌ Fatal: NEXT_PUBLIC_WS_URL environment variable is not set');
        console.error('   Please set NEXT_PUBLIC_WS_URL in your .env.local file');
        console.error('   Example: NEXT_PUBLIC_WS_URL=wss://yourdomain.com');
        return;
      }

      // Validate WebSocket URL format
      try {
        new URL(wsUrl);
        if (!['ws:', 'wss:'].includes(new URL(wsUrl).protocol)) {
          throw new Error(`Invalid WebSocket protocol: ${new URL(wsUrl).protocol}`);
        }
      } catch (error) {
        console.error(`❌ Fatal: Invalid NEXT_PUBLIC_WS_URL format: ${wsUrl}`);
        console.error(`   Error: ${error.message}`);
        console.error('   Please provide a valid WebSocket URL (e.g., wss://yourdomain.com)');
        return;
      }

      // Initialize socket connection
      const newSocket = io(wsUrl, {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      setSocket(newSocket);

      // Connection events
      newSocket.on('connect', () => {
        console.log('Socket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (newSocket.disconnected) {
            newSocket.connect();
          }
        }, 5000);
      });

      // Error handler
      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      return () => {
        newSocket.disconnect();
        newSocket.off('connect');
        newSocket.off('disconnect');
        newSocket.off('connect_error');
        newSocket.off('error');
      };
    } else {
      // Disconnect socket when user is not authenticated
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
    }
  }, [isAuthenticated, user]);

  const emit = (event: string, data?: any) => {
    if (socket && socket.connected) {
      socket.emit(event, data);
    }
  };

  const on = (event: string, callback: Function) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event: string, callback?: Function) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    emit,
    on,
    off,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocketContext must be used within a SocketProvider');
  }
  return context;
}