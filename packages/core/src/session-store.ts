/**
 * @swr-login/core - Session store (v0.9).
 *
 * Replaces v0.7's SWR-based session caching. Implements the
 * `useSyncExternalStore` contract directly:
 *   - `subscribe(listener)` — invoked by React to register dirty notifications
 *   - `getSnapshot()` — synchronous read of current `SessionSnapshot`
 *   - `getServerSnapshot()` — SSR-safe `{ user: null, status: 'loading' }`
 *
 * The store also owns the in-flight refresh promise so concurrent
 * `refresh()` calls coalesce.
 */

import type { SessionSnapshot, SessionStatus } from './types';

export type FetchSessionFn = (token: { accessToken: string | null }) => Promise<unknown>;

export interface SessionStoreOptions {
  fetchSession?: FetchSessionFn;
  /** Read accessToken from credential at refresh time. */
  getAccessToken?: () => string | null;
}

const SERVER_SNAPSHOT: SessionSnapshot = Object.freeze({
  user: null,
  status: 'loading' as SessionStatus,
});

export class SessionStore<TUser = unknown> {
  private snapshot: SessionSnapshot<TUser> = { user: null, status: 'loading' };
  private listeners = new Set<() => void>();
  private inflight: Promise<void> | null = null;
  private fetchSession: FetchSessionFn | undefined;
  private getAccessToken: (() => string | null) | undefined;

  constructor(options: SessionStoreOptions = {}) {
    this.fetchSession = options.fetchSession;
    this.getAccessToken = options.getAccessToken;
  }

  // ─── useSyncExternalStore contract ────────────────────────

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): SessionSnapshot<TUser> => this.snapshot;

  getServerSnapshot = (): SessionSnapshot<TUser> => SERVER_SNAPSHOT as SessionSnapshot<TUser>;

  // ─── Mutations ────────────────────────────────────────────

  /**
   * Set the snapshot directly. Notifies listeners only when reference changes.
   */
  setSnapshot(next: SessionSnapshot<TUser>): void {
    if (this.snapshot.user === next.user && this.snapshot.status === next.status) {
      return;
    }
    this.snapshot = next;
    this.notify();
  }

  /**
   * Refresh the session. Concurrent calls coalesce into one in-flight promise.
   *
   * - When no `fetchSession` is configured, transitions to `unauthenticated`
   *   if credential lacks auth, else marks current snapshot as authenticated
   *   with previous user (no-op).
   */
  async refresh(): Promise<void> {
    if (this.inflight) return this.inflight;

    this.inflight = this.runRefresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async runRefresh(): Promise<void> {
    const token = this.getAccessToken?.() ?? null;

    if (!this.fetchSession) {
      // No fetcher: derive status from credential availability only.
      this.setSnapshot({
        user: this.snapshot.user,
        status: token ? 'authenticated' : 'unauthenticated',
      });
      return;
    }

    try {
      const user = (await this.fetchSession({ accessToken: token })) as TUser | null;
      this.setSnapshot({
        user: user ?? null,
        status: user ? 'authenticated' : 'unauthenticated',
      });
    } catch (err) {
      this.setSnapshot({ user: null, status: 'unauthenticated' });
      throw err;
    }
  }

  /** Explicit local-only update (used by login success). */
  setUser(user: TUser | null): void {
    this.setSnapshot({
      user,
      status: user ? 'authenticated' : 'unauthenticated',
    });
  }

  /** Mark unauthenticated immediately (used by logout / session_lost). */
  clear(): void {
    this.setSnapshot({ user: null, status: 'unauthenticated' });
  }

  // ─── internals ────────────────────────────────────────────

  private notify(): void {
    for (const listener of Array.from(this.listeners)) {
      try {
        listener();
      } catch (err) {
        console.error('[swr-login] error in session-store listener:', err);
      }
    }
  }
}
