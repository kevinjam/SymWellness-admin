import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, request, sessionStore, setUnauthorizedHandler } from './api';
import { admin } from './endpoints';
import type { AdminMe } from './types';

type Status = 'loading' | 'anon' | 'authed';

interface AuthValue {
  status: Status;
  me: AdminMe | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

interface LoginResponse {
  token?: { accessToken?: string; refreshToken?: string };
  user?: { role?: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<AdminMe | null>(null);

  const logout = useCallback(() => {
    sessionStore.clear();
    setMe(null);
    setStatus('anon');
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore a session if this tab already has one.
  useEffect(() => {
    let cancelled = false;
    if (!sessionStore.get()) {
      setStatus('anon');
      return;
    }
    admin
      .me()
      .then((profile) => {
        if (cancelled) return;
        setMe(profile);
        setStatus('authed');
      })
      .catch(() => {
        if (cancelled) return;
        sessionStore.clear();
        setStatus('anon');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email: email.trim().toLowerCase(), password },
      anonymous: true,
    });
    const accessToken = res.token?.accessToken;
    if (!accessToken) throw new ApiError(500, 'Unexpected response from the server.');
    if (res.user?.role !== 'admin') {
      // Never keep a non-admin token around in the console.
      throw new ApiError(403, 'This account does not have administrator access.');
    }
    sessionStore.set({ accessToken, refreshToken: res.token?.refreshToken });
    const profile = await admin.me();
    setMe(profile);
    setStatus('authed');
  }, []);

  const value = useMemo(() => ({ status, me, login, logout }), [status, me, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
