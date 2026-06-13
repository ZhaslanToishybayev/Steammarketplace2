import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  steamId: string;
  username: string;
  avatar: string;
  balance: number;
  role: string;
  tradeUrl?: string;
}

const BACKEND_URL = '/api';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Check auth - first from localStorage, then backend as fallback
  const checkAuth = useCallback(async () => {
    // First, check localStorage (fast, works across pages)
    const stored = localStorage.getItem('steam_user');
    console.log('[AuthDebug] Stored user from localStorage:', stored);
    if (stored) {
      try {
        const userData = JSON.parse(stored) as User;
        if (userData.steamId) {
          setUser(userData);
          setIsAuthenticated(true);
          return true;
        }
      } catch (e) {
        localStorage.removeItem('steam_user');
      }
    }

    // Fallback: try backend session
    try {
      const response = await fetch(`${BACKEND_URL}/auth/check`, {
        credentials: 'include',
      });

      console.log('[AuthDebug] Backend check response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[AuthDebug] Backend check data:', data);

        if (data.authenticated && data.user) {
          const userData: User = {
            id: data.user.steamId,
            steamId: data.user.steamId,
            username: data.user.username || `User ${data.user.steamId.substring(0, 8)}`,
            avatar: data.user.avatar || '',
            balance: 0,
            role: 'user'
          };
          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('steam_user', JSON.stringify(userData));
          return true;
        }
      }
    } catch (e) {
      console.error('[AuthDebug] Auth check fetch failed:', e);
    }

    // Only clear if localStorage also failed
    if (!stored) {
      setUser(null);
      setIsAuthenticated(false);
    }
    return false;
  }, []);

  useEffect(() => {
    const abortController = new AbortController();

    const initAuth = async () => {
      setIsLoading(true);
      const urlParams = new URLSearchParams(window.location.search);
      const auth = urlParams.get('auth');

      // Handle successful Steam login redirect - extract user data from URL params
      if (auth === 'success') {
        const steamId = urlParams.get('steamid');
        const username = urlParams.get('username');
        const avatar = urlParams.get('avatar');

        if (steamId) {
          const userData: User = {
            id: steamId,
            steamId: steamId,
            username: decodeURIComponent(username || `User ${steamId.substring(0, 8)}`),
            avatar: decodeURIComponent(avatar || ''),
            balance: 0,
            role: 'user'
          };

          setUser(userData);
          setIsAuthenticated(true);
          localStorage.setItem('steam_user', JSON.stringify(userData));

          // Clean URL after extracting data
          window.history.replaceState({}, '', window.location.pathname);
          setIsLoading(false);
          return;
        }
      }

      // Try to restore from localStorage first
      const stored = localStorage.getItem('steam_user');
      if (stored) {
        try {
          const userData = JSON.parse(stored) as User;
          if (userData.steamId) {
            setUser(userData);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          localStorage.removeItem('steam_user');
        }
      }

      try {
        console.log('[AuthDebug] initAuth: Fetching /auth/check...');
        const response = await fetch(`${BACKEND_URL}/auth/check`, {
          credentials: 'include',
          signal: abortController.signal,
        });
        console.log('[AuthDebug] initAuth status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[AuthDebug] initAuth data:', data);
          if (data.authenticated && data.user) {
            const userData: User = {
              id: data.user.steamId,
              steamId: data.user.steamId,
              username: data.user.username || `User ${data.user.steamId.substring(0, 8)}`,
              avatar: data.user.avatar || '',
              balance: 0,
              role: 'user'
            };
            setUser(userData);
            setIsAuthenticated(true);
            localStorage.setItem('steam_user', JSON.stringify(userData));
          } else {
            setUser(null);
            setIsAuthenticated(false);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (e: unknown) {
        if (e instanceof Error && e.name === 'AbortError') return;
        console.error('Auth check failed', e);
        setUser(null);
        setIsAuthenticated(false);
      }

      setIsLoading(false);
    };

    initAuth();

    // Cleanup - abort fetch on unmount
    return () => abortController.abort();
  }, []);

  const loginWithSteam = useCallback(() => {
    // Redirect to backend auth endpoint
    window.location.href = `${BACKEND_URL}/auth/steam`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${BACKEND_URL}/auth/logout`, { credentials: 'include' });
    } catch (e) { console.error(e); }

    localStorage.removeItem('steam_user');
    setUser(null);
    setIsAuthenticated(false);
    router.refresh();
  }, [router]);

  return {
    user,
    isAuthenticated,
    isLoading,
    loginWithSteam,
    logout,
    checkAuth,
    // Helpers (stubs for now)
    hasRole: () => false,
    canAccessAdmin: () => false,
    isLoggingOut: false,
    isUpdatingTradeUrl: false,
  };
}
