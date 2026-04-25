const TOKEN_KEY = 'career_ai.token';
const REFRESH_KEY = 'career_ai.refresh';
const USER_KEY = 'career_ai.user';

export type StoredUser = {
  id: number;
  username: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'applicant';
  avatar: string | null;
};

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  setRefresh(token: string): void {
    localStorage.setItem(REFRESH_KEY, token);
  },
  getUser(): StoredUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredUser;
    } catch {
      return null;
    }
  },
  setUser(user: StoredUser): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('career_ai:auth-changed'));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('career_ai:auth-changed'));
  },
  isTokenValid(): boolean {
    const token = this.getToken();
    if (!token) return false;
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(atob(payload)) as { exp?: number };
      if (!decoded.exp) return false;
      return decoded.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },
};
