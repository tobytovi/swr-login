/**
 * @swr-login/adapter-jwt - JWT Credential adapter (v0.9).
 *
 * Implements the `Credential` v1.0 contract over a pluggable storage backend
 * (localStorage / sessionStorage / memory).
 *
 * Method packages that need to **persist** tokens after a successful login
 * cast the credential to `JWTCredential` and call `.setTokens()`.
 */

import type { Credential } from '@swr-login/core';

export type JWTStorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

export interface JWTAdapterOptions {
  /** Storage strategy (default: `'localStorage'`). */
  storage?: JWTStorageStrategy;
  /** Key prefix for storage entries (default: `'swr_login'`). */
  prefix?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Unix epoch milliseconds at which the access token expires. */
  expiresAt?: number;
}

/**
 * Credential implementation produced by `JWTCredential`.
 *
 * Adds method-side token management on top of the core Credential contract.
 */
export interface JWTCredential extends Credential {
  setTokens(tokens: TokenSet): void;
  getRefreshToken(): string | null;
  getExpiresAt(): number | null;
  /** The configured storage backend (informational). */
  readonly storage: JWTStorageStrategy;
}

const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: 'expires_at',
} as const;

/**
 * Create a JWT-backed Credential.
 *
 * @example
 * ```ts
 * import { JWTCredential } from '@swr-login/adapter-jwt';
 * const credential = JWTCredential();
 * <AuthHookRegistry credential={credential} methods={[...]} />
 * ```
 */
export function JWTCredential(options: JWTAdapterOptions = {}): JWTCredential {
  const { storage = 'localStorage', prefix = 'swr_login' } = options;
  const makeKey = (k: string) => `${prefix}_${k}`;
  const memoryStore = new Map<string, string>();
  const listeners = new Set<() => void>();

  const getStorageBackend = (): Storage | null => {
    if (storage === 'memory') return null;
    if (typeof window === 'undefined') return null;
    return storage === 'sessionStorage' ? sessionStorage : localStorage;
  };

  const get = (k: string): string | null => {
    const fullKey = makeKey(k);
    const store = getStorageBackend();
    return store ? store.getItem(fullKey) : (memoryStore.get(fullKey) ?? null);
  };

  const set = (k: string, v: string): void => {
    const fullKey = makeKey(k);
    const store = getStorageBackend();
    if (store) store.setItem(fullKey, v);
    else memoryStore.set(fullKey, v);
  };

  const remove = (k: string): void => {
    const fullKey = makeKey(k);
    const store = getStorageBackend();
    if (store) store.removeItem(fullKey);
    else memoryStore.delete(fullKey);
  };

  const notify = (): void => {
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch (err) {
        console.error('[swr-login] JWTCredential listener error:', err);
      }
    }
  };

  // Cross-tab sync via storage event (localStorage only)
  const storageHandler =
    storage === 'localStorage' && typeof window !== 'undefined'
      ? (e: StorageEvent) => {
          if (e.key?.startsWith(`${prefix}_`)) notify();
        }
      : null;
  if (storageHandler) {
    window.addEventListener('storage', storageHandler);
  }

  const credential: JWTCredential = {
    version: '1.0',
    storage,

    hasAuth: () => Boolean(get(KEYS.accessToken)),

    clear: async () => {
      remove(KEYS.accessToken);
      remove(KEYS.refreshToken);
      remove(KEYS.expiresAt);
      notify();
    },

    getAccessToken: () => get(KEYS.accessToken),

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    onExpire: undefined,

    setTokens: ({ accessToken, refreshToken, expiresAt }) => {
      set(KEYS.accessToken, accessToken);
      if (refreshToken !== undefined) set(KEYS.refreshToken, refreshToken);
      if (expiresAt !== undefined) set(KEYS.expiresAt, String(expiresAt));
      notify();
    },

    getRefreshToken: () => get(KEYS.refreshToken),

    getExpiresAt: () => {
      const v = get(KEYS.expiresAt);
      return v ? Number(v) : null;
    },
  };

  return credential;
}

/** @deprecated v0.7 alias. Use `JWTCredential`. Will be removed in v1.0. */
export const JWTAdapter = JWTCredential;
