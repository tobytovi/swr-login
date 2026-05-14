import type {
  AuthEventEmitter,
  AuthStateMachine,
  BroadcastSync,
  PluginManager,
  SWRLoginConfig,
  TokenManager,
  UserChangeSource,
} from '@swr-login/core';
import { createContext, useContext } from 'react';

/**
 * Mutable hint object shared between the Provider and `useUser()` to describe
 * *why* the next user-change event is expected to happen.
 *
 * The Provider writes into this object as it observes `login` / `logout` /
 * `external` events; `useUser()` reads and clears it when the SWR cache value
 * actually transitions. Unset/expired hint → the change is a passive
 * `revalidate` or the very first `initial` load.
 *
 * Using a mutable ref-like object (instead of React state) avoids re-renders
 * and is safe because it is written synchronously from event callbacks and
 * read synchronously during `useUser()`'s `useEffect`.
 *
 * @internal
 */
export interface UserChangeHint {
  source: UserChangeSource | null;
  /** `Date.now()` when the hint was written. Stale hints (>1s) are ignored. */
  timestamp: number;
}

/**
 * Mutable container that holds the `loginContext` value from the most recent
 * successful `login()` call.
 *
 * Written by `useLogin` when the plugin resolves (before `fetchUser`).
 * Read by `useUser`'s SWR fetcher to forward `loginContext` to `fetchUser`
 * and to `translateLoginError` in the `revalidate` phase, so that both
 * the background-revalidation `fetchUser` call and the revalidate-phase
 * error translator receive the same `loginContext` as the original login.
 *
 * Cleared on `logout` (so that after logout, revalidate no longer leaks
 * the previous session's context).
 *
 * Using a mutable ref-like object (instead of React state) avoids re-renders
 * and is safe because writes happen synchronously inside the `login()` callback
 * and reads happen inside the SWR fetcher callback.
 *
 * @internal
 */
export interface LastLoginContextRef {
  /** The last `loginContext` passed to `login(creds, { context })`, or `undefined`. */
  current: unknown;
}

/** Internal context value passed through SWRLoginProvider */
export interface AuthContextValue {
  pluginManager: PluginManager;
  tokenManager: TokenManager;
  emitter: AuthEventEmitter;
  stateMachine: AuthStateMachine;
  broadcastSync: BroadcastSync | null;
  config: SWRLoginConfig;
  /** @internal shared hint for the next user-change source */
  userChangeHint: UserChangeHint;
  /**
   * @internal persisted `loginContext` from the last successful login.
   * Forwarded to `fetchUser` and `translateLoginError` during SWR revalidation.
   */
  lastLoginContextRef: LastLoginContextRef;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Internal hook to access auth context.
 * Must be used within SWRLoginProvider.
 * @throws Error if used outside of SWRLoginProvider
 */
export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error(
      '[swr-login] useAuthContext must be used within <SWRLoginProvider>. ' +
        'Wrap your app with <SWRLoginProvider> to use swr-login hooks.',
    );
  }
  return ctx;
}
