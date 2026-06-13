import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { useNotificationStore } from '@/stores/notificationStore';
import { useTradeStore } from '@/stores/tradeStore';
import toast from 'react-hot-toast';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  emit: ((event: string, data?: any) => void) | null;
  on: ((event: string, callback: (...args: any[]) => void) => void) | null;
  off: ((event: string, callback?: (...args: any[]) => void) => void) | null;
}

export function useSocket(): UseSocketReturn {
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const { incrementUnreadCount, addNotification } = useNotificationStore();
  const { updateTradeStatus, setTradeError } = useTradeStore();

  const initializeSocket = useCallback(() => {
    if (!isAuthenticated || !user) return;

    try {
      // Clean up existing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const token = localStorage.getItem('authToken');
      if (!token) return;

      // Initialize socket connection
      socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL || '', {
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      const socket = socketRef.current;

      // Connection events
      socket.on('connect', () => {
        console.log('Socket connected');
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setTimeout(() => {
          if (socketRef.current && !socketRef.current.connected) {
            initializeSocket();
          }
        }, 5000); // Retry after 5 seconds
      });

      // Trade events
      socket.on('trade:update', (data) => {
        console.log('Trade update received:', data);
        updateTradeStatus(data.status, data.error);

        // Show toast notification for important trade updates
        if (data.status === 'completed') {
          toast.success('Trade completed successfully!');
        } else if (data.status === 'declined') {
          toast.error('Trade was declined');
        } else if (data.status === 'cancelled') {
          toast('Trade was cancelled', { icon: 'ℹ️' });
        }
      });

      socket.on('trade:completed', (data) => {
        console.log('Trade completed:', data);
        toast.success(`Trade ${data.tradeId} has been completed!`);
        addNotification({
          type: 'trade',
          message: `Your trade has been completed successfully.`,
          title: 'Trade Completed',
          action: {
            label: 'View Trade',
            url: `/trade/${data.tradeId}`,
          },
        });
      });

      socket.on('trade:accepted', (data) => {
        console.log('Trade accepted:', data);
        toast.success('Trade accepted! Check your Steam trade offer.');
        addNotification({
          type: 'trade',
          message: 'Your trade offer has been accepted. Please check your Steam trade offer.',
          title: 'Trade Accepted',
          action: {
            label: 'View Trade',
            url: `/trade/${data.tradeId}`,
          },
        });
      });

      socket.on('trade:declined', (data) => {
        console.log('Trade declined:', data);
        toast.error('Trade was declined.');
        addNotification({
          type: 'trade',
          message: 'Your trade offer was declined.',
          title: 'Trade Declined',
        });
      });

      // Notification events
      socket.on('notification', (data) => {
        console.log('Notification received:', data);
        incrementUnreadCount();
        addNotification({
          type: data.type || 'info',
          message: data.message,
          title: data.title,
          action: data.action,
        });

        if (data.showToast) {
          const type = data.type;
          if (type === 'success') {
            toast.success(data.message);
          } else if (type === 'error') {
            toast.error(data.message);
          } else if (type === 'loading') {
            toast.loading(data.message);
          } else {
            // Info or unknown type
            toast(data.message, { icon: 'ℹ️' });
          }
        }
      });

      // Balance updates
      socket.on('balance:updated', (data) => {
        console.log('Balance updated:', data);
        // The balance update will be handled by the auth store
        toast.success(`Balance updated: +${data.amount}`);
      });

      // Inventory updates
      socket.on('inventory:updated', (data) => {
        console.log('Inventory updated:', data);
        // Invalidate inventory queries to refetch
        // This would require access to queryClient, which we don't have here
        // You might want to handle this in the component that uses inventory data
      });

      // Error events
      socket.on('error', (data) => {
        console.error('Socket error:', data);
        toast.error(data.message || 'An error occurred');
      });

      socket.on('maintenance:scheduled', (data) => {
        toast(
          `System maintenance scheduled for ${new Date(data.startTime).toLocaleString()}. Expected duration: ${data.duration} minutes.`,
          { icon: '⚠️' }
        );
      });

    } catch (error) {
      console.error('Failed to initialize socket:', error);
    }
  }, [isAuthenticated, user, incrementUnreadCount, addNotification, updateTradeStatus]);

  // Initialize socket when auth state changes
  useEffect(() => {
    initializeSocket();

    return () => {
      // Cleanup on unmount
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initializeSocket]);

  // Join/leave trade room
  const joinTradeRoom = useCallback((tradeId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('join_trade_room', tradeId);
    }
  }, []);

  const leaveTradeRoom = useCallback((tradeId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave_trade_room', tradeId);
    }
  }, []);

  // Expose socket methods
  const emit = useCallback(
    (event: string, data?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      }
    },
    []
  );

  const on = useCallback(
    (event: string, callback: (...args: any[]) => void) => {
      if (socketRef.current) {
        // @ts-ignore - Socket.io types are strict, but we want flexibility here
        socketRef.current.on(event, callback);
      }
    },
    []
  );

  const off = useCallback(
    (event: string, callback?: (...args: any[]) => void) => {
      if (socketRef.current) {
        // @ts-ignore
        socketRef.current.off(event, callback);
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
    emit: emit,
    on: on,
    off: off,
  };
}