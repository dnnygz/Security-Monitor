import { createContext, useContext, useMemo, useState } from 'react';
import { login as loginRequest } from '../services/authService';
import type { User } from '../types';

type StoredSession = {
  user: User;
  token: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (correo: string, contrasena: string) => Promise<void>;
  logout: () => void;
};

const STORAGE_KEY = 'security-monitor-session';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSession(): StoredSession | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const session = JSON.parse(stored) as StoredSession;
    if (session.token) localStorage.setItem('token', session.token);
    return session;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readSession());

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user || null,
      token: session?.token || null,
      isAuthenticated: Boolean(session?.user),
      login: async (correo, contrasena) => {
        const nextSession = await loginRequest(correo, contrasena);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
        setSession(nextSession);
      },
      logout: () => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('token');
        setSession(null);
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
