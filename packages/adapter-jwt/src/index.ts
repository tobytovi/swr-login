import type { TokenAdapter } from '@swr-login/core';

export type JWTStorageStrategy = 'localStorage' | 'sessionStorage' | 'memory';

export interface JWTAdapterOptions {
  /** Storage strategy (default: 'localStorage') */
  storage?: JWTStorageStrategy;
  /** Key prefix for storage entries (default: 'swr_login') */
  prefix?: string;
}

const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: 'expires_at',
} as const;

/**
 * JWT Token storage adapter.
 *
 * Supports three storage strategies:
 * - `localStorage`: Persistent across browser sessions (default)
 * - `sessionStorage`: Cleared when tab closes
 * - `memory`: Cleared on page refresh (most secure for SPAs)
 *
 * @example
 * ```ts
 * import { JWTAdapter } from '@swr-login/adapter-jwt';
 *
 * // Default: localStorage
 * const adapter = JWTAdapter();
 *
 * // High security: memory-only
 * const secureAdapter = JWTAdapter({ storage: 'memory' });
 *
 * // Custom prefix
 * const customAdapter = JWTAdapter({ prefix: 'myapp' });
 * ```
 */
export function JWTAdapter(options: JWTAdapterOptions = {}): TokenAdapter {
  const { storage = 'localStorage', prefix = 'swr_login' } = options;

  const makeKey = (key: string) => `${prefix}_${key}`;

  // Memory storage fallback
  const memoryStore = new Map<string, string>();

  const getStorage = (): Storage | null => {
    if (storage === 'memory') return null;
    if (typeof window === 'undefined') return null;
    return storage === 'sessionStorage' ? sessionStorage : localStorage;
  };

  const get = (key: string): string | null => {
    const fullKey = makeKey(key);
    const store = getStorage();
    if (store) {
      return store.getItem(fullKey);
    }
    return memoryStore.get(fullKey) ?? null;
  };

  const set = (key: string, value: string): void => {
    const fullKey = makeKey(key);
    const store = getStorage();
    if (store) {
      store.setItem(fullKey, value);
    } else {
      memoryStore.set(fullKey, value);
    }
  };

  const remove = (key: string): void => {
    const fullKey = makeKey(key);
    const store = getStorage();
    if (store) {
      store.removeItem(fullKey);
    } else {
      memoryStore.delete(fullKey);
    }
  };

  return {
    getAccessToken: () => get(KEYS.accessToken),
    setAccessToken: (token) => set(KEYS.accessToken, token),
    getRefreshToken: () => get(KEYS.refreshToken),
    setRefreshToken: (token) => set(KEYS.refreshToken, token),
    getExpiresAt: () => {
      const val = get(KEYS.expiresAt);
      return val ? Number(val) : null;
    },
    setExpiresAt: (expiresAt) => set(KEYS.expiresAt, String(expiresAt)),
    clear: () => {
      remove(KEYS.accessToken);
      remove(KEYS.refreshToken);
      remove(KEYS.expiresAt);
    },
  };
}
