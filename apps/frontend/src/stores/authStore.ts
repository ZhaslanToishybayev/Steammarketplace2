import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  steamId: string;
  username: string;
  avatar: string;
  tradeUrl?: string;
  balance: number;
  role: 'user' | 'moderator' | 'admin';
  email?: string;
  isEmailVerified?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  updateBalance: (amount: number) => void;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),

      logout: async () => {
        try {
          set({ isLoading: true });
          // Простой logout без вызова API
          get().clearAuth();
        } catch (error) {
          console.error('Logout error:', error);
          get().clearAuth();
        }
      },

      updateBalance: (amount) =>
        set((state) => ({
          user: state.user ? { ...state.user, balance: amount } : null,
        })),

      checkAuth: async () => {
        try {
          set({ isLoading: true });

          // Проверяем есть ли данные в localStorage
          const storedData = localStorage.getItem('auth-storage');
          if (storedData) {
            const parsed = JSON.parse(storedData);
            if (parsed.state?.user) {
              set({
                user: parsed.state.user,
                isAuthenticated: parsed.state.isAuthenticated,
                isLoading: false
              });
              return;
            }
          }

          // Если нет в localStorage, проверяем через API
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const data = await response.json();
            set({ user: data.user, isAuthenticated: true, isLoading: false });
          } else {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      clearAuth: () => set({ user: null, isAuthenticated: false, isLoading: false }),
    }),
    {
      name: 'auth-storage',
      // Only persist user data, not loading state
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Selectors for better performance
export const useUser = () => useAuthStore((state) => state.user);
export const useIsAuthenticated = () => useAuthStore((state) => state.isAuthenticated);
export const useIsLoading = () => useAuthStore((state) => state.isLoading);
export const useUserRole = () => useAuthStore((state) => state.user?.role);
export const useUserBalance = () => useAuthStore((state) => state.user?.balance);

// Computed values
export const useIsAdmin = () => {
  const role = useUserRole();
  return role === 'admin';
};

export const useIsModerator = () => {
  const role = useUserRole();
  return role === 'moderator' || role === 'admin';
};

export const useCanTrade = () => {
  const user = useUser();
  return user?.tradeUrl && user.tradeUrl.length > 0;
};
