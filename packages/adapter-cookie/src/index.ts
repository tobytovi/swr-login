import type { TokenAdapter } from '@swr-login/core';

export interface CookieAdapterOptions {
  /** Cookie name prefix (default: 'swr_login') */
  prefix?: string;
  /** Cookie path (default: '/') */
  path?: string;
  /** SameSite attribute (default: 'Strict') */
  sameSite?: 'Strict' | 'Lax' | 'None';
  /** Secure flag - only send over HTTPS (default: true) */
  secure?: boolean;
  /** Cookie domain (default: current domain) */
  domain?: string;
  /** Max age in seconds (default: 7 days) */
  maxAge?: number;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}=([^;]*)`));
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

/**
 * Cookie storage adapter.
 *
 * Best used with the BFF (Backend-for-Frontend) pattern where the server
 * sets HttpOnly cookies. This adapter handles non-HttpOnly cookies for
 * client-side token management.
 *
 * For maximum security, use HttpOnly cookies set by your BFF server
 * and use this adapter only for the expiration timestamp.
 *
 * @example
 * ```ts
 * import { CookieAdapter } from '@swr-login/adapter-cookie';
 *
 * const adapter = CookieAdapter({
 *   secure: true,
 *   sameSite: 'Strict',
 *   maxAge: 7 * 24 * 60 * 60, // 7 days
 * });
 * ```
 */
export function CookieAdapter(options: CookieAdapterOptions = {}): TokenAdapter {
  const { prefix = 'swr_login' } = options;

  const makeKey = (key: string) => `${prefix}_${key}`;

  return {
    getAccessToken: () => getCookie(makeKey('access_token')),
    setAccessToken: (token) => setCookie(makeKey('access_token'), token, options),
    getRefreshToken: () => getCookie(makeKey('refresh_token')),
    setRefreshToken: (token) => setCookie(makeKey('refresh_token'), token, options),
    getExpiresAt: () => {
      const val = getCookie(makeKey('expires_at'));
      return val ? Number(val) : null;
    },
    setExpiresAt: (expiresAt) => setCookie(makeKey('expires_at'), String(expiresAt), options),
    clear: () => {
      deleteCookie(makeKey('access_token'), options);
      deleteCookie(makeKey('refresh_token'), options);
      deleteCookie(makeKey('expires_at'), options);
    },
  };
}
