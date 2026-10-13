import { API_BASE } from './config';

const SESSION_KEY = 'sym_admin_session';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface Session {
  accessToken: string;
  refreshToken?: string;
}

/** Tokens live in sessionStorage: cleared when the tab closes, never persisted. */
export const sessionStore = {
  get(): Session | null {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  set(session: Session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
  },
};

type Listener = () => void;
let onUnauthorized: Listener | null = null;
export function setUnauthorizedHandler(fn: Listener | null) {
  onUnauthorized = fn;
}

let refreshing: Promise<boolean> | null = null;

async function refreshTokens(): Promise<boolean> {
  const current = sessionStore.get();
  if (!current?.refreshToken) return false;
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: current.refreshToken }),
        });
        if (!res.ok) return false;
        const body = await res.json();
        if (!body?.accessToken) return false;
        sessionStore.set({
          accessToken: body.accessToken,
          refreshToken: body.refreshToken ?? current.refreshToken,
        });
        return true;
      } catch {
        return false;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export type Query = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
  /** Skip auth header + refresh logic (login). */
  anonymous?: boolean;
}

function buildUrl(path: string, query?: Query) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v));
  });
  const qs = params.toString();
  return `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
}

async function send(path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(buildUrl(path, opts.query), {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: opts.signal,
  });
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await send(path, opts, opts.anonymous ? null : (sessionStore.get()?.accessToken ?? null));
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(0, 'Cannot reach the SymWellness API. Check your connection and API address.');
  }

  if (res.status === 401 && !opts.anonymous) {
    if (await refreshTokens()) {
      try {
        res = await send(path, opts, sessionStore.get()?.accessToken ?? null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err;
        throw new ApiError(0, 'Cannot reach the SymWellness API.');
      }
    }
    if (res.status === 401) {
      sessionStore.clear();
      onUnauthorized?.();
    }
  }

  let json: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  if (!res.ok) {
    const body = json as { error?: string; message?: string } | null;
    const fallback =
      res.status === 403
        ? 'You do not have permission to do that.'
        : res.status === 404
          ? 'Not found.'
          : res.status === 429
            ? 'Too many requests. Please wait a moment.'
            : `Request failed (${res.status}).`;
    throw new ApiError(res.status, body?.error || body?.message || fallback);
  }

  const body = json as { data?: T } | null;
  return (body && 'data' in body && body.data !== undefined ? body.data : json) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: 'PUT', body }),
  del: <T>(path: string, body?: unknown) => request<T>(path, { method: 'DELETE', body }),
};
