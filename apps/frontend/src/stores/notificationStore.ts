import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'trade' | 'system';
  message: string;
  title?: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    url: string;
  };
  userId?: string;
  expiresAt?: string;
}

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;

  // Actions
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setNotifications: (notifications: Notification[]) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  resetUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      // Initial state
      notifications: [],
      unreadCount: 0,

      // Actions
      addNotification: (notificationData) => {
        const newNotification: Notification = {
          ...notificationData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          read: false,
        };

        set((state) => {
          const newNotifications = [newNotification, ...state.notifications];

          // Keep only last 100 notifications
          const limitedNotifications = newNotifications.slice(0, 100);

          return {
            notifications: limitedNotifications,
            unreadCount: state.unreadCount + 1,
          };
        });
      },

      markAsRead: (id) =>
        set((state) => {
          const updatedNotifications = state.notifications.map((notification) =>
            notification.id === id ? { ...notification, read: true } : notification
          );

          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.read
          ).length;

          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        }),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((notification) => ({
            ...notification,
            read: true,
          })),
          unreadCount: 0,
        })),

      removeNotification: (id) =>
        set((state) => {
          const updatedNotifications = state.notifications.filter(
            (notification) => notification.id !== id
          );

          const newUnreadCount = updatedNotifications.filter(
            (n) => !n.read
          ).length;

          return {
            notifications: updatedNotifications,
            unreadCount: newUnreadCount,
          };
        }),

      clearAll: () =>
        set({
          notifications: [],
          unreadCount: 0,
        }),

      setNotifications: (notifications) => {
        const unreadCount = notifications.filter((n) => !n.read).length;
        set({ notifications, unreadCount });
      },

      incrementUnreadCount: () =>
        set((state) => ({ unreadCount: state.unreadCount + 1 })),

      decrementUnreadCount: () =>
        set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),

      resetUnreadCount: () => set({ unreadCount: 0 }),
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50), // Only persist last 50
        unreadCount: state.unreadCount,
      }),
    }
  )
);

// Selectors
export const useNotifications = () => useNotificationStore((state) => state.notifications);
export const useUnreadCount = () => useNotificationStore((state) => state.unreadCount);
export const useUnreadNotifications = () =>
  useNotificationStore((state) => state.notifications.filter((n) => !n.read));

// Utility functions for adding notifications with specific types
export const useAddNotification = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  return {
    info: (message: string, title?: string) =>
      addNotification({ type: 'info', message, title }),
    success: (message: string, title?: string) =>
      addNotification({ type: 'success', message, title }),
    warning: (message: string, title?: string) =>
      addNotification({ type: 'warning', message, title }),
    error: (message: string, title?: string) =>
      addNotification({ type: 'error', message, title }),
    trade: (message: string, title?: string, action?: Notification['action']) =>
      addNotification({ type: 'trade', message, title, action }),
    system: (message: string, title?: string) =>
      addNotification({ type: 'system', message, title }),
  };
};