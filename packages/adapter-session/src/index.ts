/**
 * @swr-login/adapter-session - sessionStorage Credential adapter (v0.9).
 *
 * Tokens auto-clear when the browser tab closes. Useful for high-security
 * SPAs that don't want persistence across tabs.
 */

import type { Credential } from '@swr-login/core';

export interface SessionAdapterOptions {
  /** Key prefix (default: `'swr_login'`). */
  prefix?: string;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface SessionCredential extends Credential {
  setTokens(tokens: TokenSet): void;
  getRefreshToken(): string | null;
  getExpiresAt(): number | null;
}

const KEYS = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  expiresAt: 'expires_at',
} as const;

export function SessionCredential(options: SessionAdapterOptions = {}): SessionCredential {
  const { prefix = 'swr_login' } = options;
  const makeKey = (k: string) => `${prefix}_${k}`;
  const listeners = new Set<() => void>();

  const has = () => typeof sessionStorage !== 'undefined';
  const get = (k: string) => (has() ? sessionStorage.getItem(makeKey(k)) : null);
  const set = (k: string, v: string) => {
    if (has()) sessionStorage.setItem(makeKey(k), v);
  };
  const remove = (k: string) => {
    if (has()) sessionStorage.removeItem(makeKey(k));
  };

  const notify = (): void => {
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch (err) {
        console.error('[swr-login] SessionCredential listener error:', err);
      }
    }
  };

  const credential: SessionCredential = {
    version: '1.0',
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

/** @deprecated v0.7 alias. Use `SessionCredential`. Will be removed in v1.0. */
export const SessionAdapter = SessionCredential;
