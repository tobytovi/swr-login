import type { TokenAdapter } from '@swr-login/core';

export interface SessionAdapterOptions {
  /** Key prefix (default: 'swr_login') */
  prefix?: string;
}

/**
 * Session storage adapter.
 * Tokens are automatically cleared when the browser tab is closed.
 *
 * @example
 * ```ts
 * import { SessionAdapter } from '@swr-login/adapter-session';
 *
 * const adapter = SessionAdapter();
 * ```
 */
export function SessionAdapter(options: SessionAdapterOptions = {}): TokenAdapter {
  const { prefix = 'swr_login' } = options;

  const makeKey = (key: string) => `${prefix}_${key}`;

  const get = (key: string): string | null => {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(makeKey(key));
  };

  const set = (key: string, value: string): void => {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(makeKey(key), value);
  };

  const remove = (key: string): void => {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(makeKey(key));
  };

  return {
    getAccessToken: () => get('access_token'),
    setAccessToken: (token) => set('access_token', token),
    getRefreshToken: () => get('refresh_token'),
    setRefreshToken: (token) => set('refresh_token', token),
    getExpiresAt: () => {
      const val = get('expires_at');
      return val ? Number(val) : null;
    },
    setExpiresAt: (expiresAt) => set('expires_at', String(expiresAt)),
    clear: () => {
      remove('access_token');
      remove('refresh_token');
      remove('expires_at');
    },
  };
}
