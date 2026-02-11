import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  tenantId: string | null;
  tenantName?: string;
  isImpersonating?: boolean;
  originalUserId?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  availablePortals: string[];
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchPortal: (portal: string) => void;
  impersonate: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getRedirectPath(role: string): string {
  switch (role) {
    case 'BRAMBLE_OPERATOR':
      return '/operator';
    case 'COOP_ADMIN':
      return '/app/admin';
    case 'INSTRUCTOR':
      return '/app/instructor';
    case 'FAMILY':
      return '/app/family';
    default:
      return '/';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [availablePortals, setAvailablePortals] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      setToken(storedToken);
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${storedToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            setAvailablePortals(data.availablePortals || [data.user.role]);
          } else {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setToken(null);
          }
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    setAvailablePortals(data.availablePortals || [data.user.role]);
    
    const redirectPath = getRedirectPath(data.user.role);
    setLocation(redirectPath);
  };

  const logout = () => {
    const storedToken = localStorage.getItem('accessToken');
    if (storedToken) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${storedToken}` },
      });
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setToken(null);
    setUser(null);
    setAvailablePortals([]);
    setLocation('/login');
  };

  const switchPortal = (portal: string) => {
    const redirectPath = getRedirectPath(portal);
    setLocation(redirectPath);
  };

  const impersonate = async (userId: string) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/impersonate/${userId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Impersonation failed');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    setAvailablePortals([data.user.role]);

    const redirectPath = getRedirectPath(data.user.role);
    setLocation(redirectPath);
  };

  const stopImpersonation = async () => {
    const storedToken = localStorage.getItem('accessToken');
    const res = await fetch('/api/stop-impersonation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${storedToken}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to stop impersonation');
    }

    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    setToken(data.accessToken);
    setUser(data.user);
    setAvailablePortals(data.availablePortals || [data.user.role]);

    setLocation('/operator');
  };

  return (
    <AuthContext.Provider value={{ user, token, availablePortals, login, logout, switchPortal, impersonate, stopImpersonation, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('accessToken');
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshRes = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        localStorage.setItem('accessToken', data.accessToken);
        return fetchWithAuth(url, options);
      }
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  return res;
}
