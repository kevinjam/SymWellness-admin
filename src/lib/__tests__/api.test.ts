import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Minimal in-memory sessionStorage for the node test environment.
function installStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('api client', () => {
  beforeEach(() => {
    vi.resetModules();
    installStorage();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sends the bearer token and unwraps { data }', async () => {
    const { api, sessionStore } = await import('../api');
    sessionStore.set({ accessToken: 'abc', refreshToken: 'ref' });
    const fetchMock = vi.fn().mockResolvedValue(json(200, { success: true, data: { hello: 'world' } }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await api.get<{ hello: string }>('/api/admin/overview', { days: 7, empty: '' });

    expect(out).toEqual({ hello: 'world' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/admin/overview?days=7');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer abc' });
  });

  it('refreshes once on 401 and retries the original request', async () => {
    const { api, sessionStore } = await import('../api');
    sessionStore.set({ accessToken: 'old', refreshToken: 'ref' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: 'Access token expired' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'new', refreshToken: 'ref2' }))
      .mockResolvedValueOnce(json(200, { data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const out = await api.get<{ ok: boolean }>('/api/admin/me');

    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(sessionStore.get()).toEqual({ accessToken: 'new', refreshToken: 'ref2' });
    expect((fetchMock.mock.calls[2][1] as RequestInit).headers).toMatchObject({ Authorization: 'Bearer new' });
  });

  it('signs out when the refresh fails', async () => {
    const { api, sessionStore, setUnauthorizedHandler, ApiError } = await import('../api');
    sessionStore.set({ accessToken: 'old', refreshToken: 'ref' });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(401, { error: 'expired' }))
        .mockResolvedValueOnce(json(401, { error: 'invalid refresh' }))
    );

    await expect(api.get('/api/admin/me')).rejects.toBeInstanceOf(ApiError);
    expect(sessionStore.get()).toBeNull();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('turns server errors into readable messages', async () => {
    const { api } = await import('../api');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(403, { error: 'Insufficient permissions' })));
    await expect(api.get('/api/admin/users')).rejects.toMatchObject({
      status: 403,
      message: 'Insufficient permissions',
    });
  });

  it('reports an unreachable API clearly', async () => {
    const { api } = await import('../api');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(api.get('/api/admin/users')).rejects.toMatchObject({
      status: 0,
      message: expect.stringContaining('Cannot reach'),
    });
  });

  it('does not send a token or try to refresh for anonymous requests (login)', async () => {
    const { request, sessionStore } = await import('../api');
    sessionStore.set({ accessToken: 'abc', refreshToken: 'ref' });
    const fetchMock = vi.fn().mockResolvedValue(json(401, { error: 'Invalid credentials' }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      request('/api/auth/login', { method: 'POST', body: { email: 'a', password: 'b' }, anonymous: true })
    ).rejects.toMatchObject({ status: 401, message: 'Invalid credentials' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).not.toHaveProperty('Authorization');
  });
});
