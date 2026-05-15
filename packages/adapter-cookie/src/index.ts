/**
 * @swr-login/adapter-cookie - Cookie Credential adapter (v0.9).
 *
 * Best paired with a BFF (Backend-for-Frontend) that issues `HttpOnly` session
 * cookies. This adapter:
 *   - Reads a sentinel **non-HttpOnly** cookie (default `swr_login_session`)
 *     to decide `hasAuth()` and to expose `accessToken` if present.
 *   - Lets method packages set the sentinel + auxiliary tokens via
 *     `setTokens()` (mainly for BFFs that mirror metadata in JS-readable
 *     cookies).
 *   - Subscribes to `focus` / `visibilitychange` to detect external auth state
 *     changes (login on another tab, server-side logout, etc.).
 */

import type { Credential } from '@swr-login/core';

export interface CookieAdapterOptions {
  /** Cookie name prefix (default: `'swr_login'`). */
  prefix?: string;
  path?: string;
  sameSite?: 'Strict' | 'Lax' | 'None';
  secure?: boolean;
  domain?: string;
  /** Max age in seconds (default: 7 days). */
  maxAge?: number;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface CookieCredential extends Credential {
  setTokens(tokens: TokenSet): void;
  getRefreshToken(): string | null;
  getExpiresAt(): number | null;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, options: CookieAdapterOptions): void {
  if (typeof document === 'undefined') return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `path=${options.path ?? '/'}`,
    `SameSite=${options.sameSite ?? 'Strict'}`,
  ];
  if (options.secure !== false) parts.push('Secure');
  if (options.domain) parts.push(`domain=${options.domain}`);
  if (options.maxAge) parts.push(`max-age=${options.maxAge}`);
  document.cookie = parts.join('; ');
}

function deleteCookie(name: string, options: CookieAdapterOptions): void {
  if (typeof document === 'undefined') return;
  const parts = [`${name}=`, 'max-age=0', `path=${options.path ?? '/'}`];
  if (options.domain) parts.push(`domain=${options.domain}`);
  document.cookie = parts.join('; ');
}

export function CookieCredential(options: CookieAdapterOptions = {}): CookieCredential {
  const { prefix = 'swr_login' } = options;
  const makeKey = (k: string) => `${prefix}_${k}`;
  const listeners = new Set<() => void>();

  const notify = (): void => {
    for (const fn of Array.from(listeners)) {
      try {
        fn();
      } catch (err) {
        console.error('[swr-login] CookieCredential listener error:', err);
      }
    }
  };

  // Refresh probe on focus / visibility (cookies aren't reactive)
  const handleFocus = () => notify();
  if (typeof window !== 'undefined') {
    window.addEventListener('focus', handleFocus);
    window.addEventListener('visibilitychange', handleFocus);
  }

  const credential: CookieCredential = {
    version: '1.0',
    hasAuth: () => Boolean(getCookie(makeKey('access_token'))),
    clear: async () => {
      deleteCookie(makeKey('access_token'), options);
      deleteCookie(makeKey('refresh_token'), options);
      deleteCookie(makeKey('expires_at'), options);
      notify();
    },
    getAccessToken: () => getCookie(makeKey('access_token')),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    onExpire: undefined,

    setTokens: ({ accessToken, refreshToken, expiresAt }) => {
      setCookie(makeKey('access_token'), accessToken, options);
      if (refreshToken !== undefined) setCookie(makeKey('refresh_token'), refreshToken, options);
      if (expiresAt !== undefined) setCookie(makeKey('expires_at'), String(expiresAt), options);
      notify();
    },
    getRefreshToken: () => getCookie(makeKey('refresh_token')),
    getExpiresAt: () => {
      const v = getCookie(makeKey('expires_at'));
      return v ? Number(v) : null;
    },
  };

  return credential;
}

/** @deprecated v0.7 alias. Use `CookieCredential`. Will be removed in v1.0. */
export const CookieAdapter = CookieCredential;
