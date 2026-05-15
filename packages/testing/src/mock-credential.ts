/**
 * @swr-login/testing - createMockCredential.
 *
 * Returns an in-memory Credential implementation that satisfies the v1.0
 * contract. Useful in unit tests to verify method behavior without touching
 * browser storage.
 */

import type { Credential } from '@swr-login/core';

export interface MockCredential extends Credential {
  /** Inspect the in-memory access token. */
  readonly currentToken: string | null;
  /** Imperatively set the access token (e.g. simulate login). */
  setToken(token: string | null): void;
}

export function createMockCredential(initialToken: string | null = null): MockCredential {
  let token = initialToken;
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const fn of Array.from(listeners)) fn();
  };

  return {
    version: '1.0',
    get currentToken() {
      return token;
    },
    hasAuth: () => Boolean(token),
    clear: async () => {
      token = null;
      notify();
    },
    getAccessToken: () => token,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setToken: (next: string | null) => {
      token = next;
      notify();
    },
  };
}
