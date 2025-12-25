export interface SteamUser {
  steamId: string;
  username: string;
  avatar: string;
  profileUrl: string;
  steamLevel?: number;
  cs2Playtime?: number;
}

class SessionManager {
  private readonly USER_KEY = 'steam_user';
  private readonly TOKEN_KEY = 'steam_token';

  setUser(user: SteamUser) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  getUser(): SteamUser | null {
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return null;

    const userStr = localStorage.getItem(this.USER_KEY);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  clearUser() {
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.USER_KEY);
  }

  isAuthenticated(): boolean {
    return this.getUser() !== null;
  }

  getSteamId(): string | null {
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return null;
    const user = this.getUser();
    return user?.steamId || null;
  }

  // Для бэкенд сессии (в реальном приложении это были бы HTTP-only куки)
  setSessionToken(token: string) {
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getSessionToken(): string | null {
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  clearSession() {
    this.clearUser();
    // Only access localStorage on client-side
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
  }
}

export const sessionManager = new SessionManager();
