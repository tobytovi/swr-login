import { describe, expect, it, vi } from 'vitest';
import { SessionStore } from '../session-store';

describe('SessionStore', () => {
  it('initial snapshot is loading', () => {
    const store = new SessionStore();
    expect(store.getSnapshot()).toEqual({ user: null, status: 'loading' });
  });

  it('getServerSnapshot returns frozen loading snapshot', () => {
    const store = new SessionStore();
    expect(store.getServerSnapshot()).toEqual({ user: null, status: 'loading' });
  });

  it('setUser updates snapshot and notifies listeners', () => {
    const store = new SessionStore<{ id: string }>();
    const listener = vi.fn();
    store.subscribe(listener);

    store.setUser({ id: '1' });
    expect(store.getSnapshot()).toEqual({ user: { id: '1' }, status: 'authenticated' });
    expect(listener).toHaveBeenCalledOnce();

    store.setUser(null);
    expect(store.getSnapshot()).toEqual({ user: null, status: 'unauthenticated' });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('does not notify when snapshot is identical', () => {
    const store = new SessionStore<{ id: string }>();
    const user = { id: '1' };
    store.setUser(user);
    const listener = vi.fn();
    store.subscribe(listener);
    store.setUser(user);
    expect(listener).not.toHaveBeenCalled();
  });

  it('unsubscribe removes listener', () => {
    const store = new SessionStore<{ id: string }>();
    const listener = vi.fn();
    const off = store.subscribe(listener);
    off();
    store.setUser({ id: '1' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('refresh() invokes fetchSession with token and stores user', async () => {
    const fetchSession = vi.fn(async () => ({ id: 'remote' }));
    const store = new SessionStore<{ id: string }>({
      fetchSession,
      getAccessToken: () => 'token-123',
    });
    await store.refresh();
    expect(fetchSession).toHaveBeenCalledWith({ accessToken: 'token-123' });
    expect(store.getSnapshot()).toEqual({
      user: { id: 'remote' },
      status: 'authenticated',
    });
  });

  it('refresh() coalesces concurrent calls into a single fetch', async () => {
    let resolveCall: ((value: unknown) => void) | null = null;
    const fetchSession = vi.fn(
      () =>
        new Promise<unknown>((resolve) => {
          resolveCall = resolve;
        }),
    );
    const store = new SessionStore({ fetchSession });
    const p1 = store.refresh();
    const p2 = store.refresh();
    expect(fetchSession).toHaveBeenCalledOnce();
    if (resolveCall) (resolveCall as (value: unknown) => void)({ id: 'x' });
    await Promise.all([p1, p2]);
  });

  it('refresh() with no fetcher transitions to unauthenticated when no token', async () => {
    const store = new SessionStore({ getAccessToken: () => null });
    await store.refresh();
    expect(store.getSnapshot().status).toBe('unauthenticated');
  });

  it('refresh() failure marks unauthenticated and rethrows', async () => {
    const fetchSession = vi.fn(async () => {
      throw new Error('network');
    });
    const store = new SessionStore({ fetchSession });
    await expect(store.refresh()).rejects.toThrow('network');
    expect(store.getSnapshot()).toEqual({ user: null, status: 'unauthenticated' });
  });

  it('clear() forces unauthenticated state', () => {
    const store = new SessionStore<{ id: string }>();
    store.setUser({ id: '1' });
    store.clear();
    expect(store.getSnapshot()).toEqual({ user: null, status: 'unauthenticated' });
  });
});
