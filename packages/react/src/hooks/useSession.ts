/**
 * @swr-login/react - useSession (v0.9).
 *
 * Reads the SessionStore via `useSyncExternalStore`. SSR-safe by virtue of
 * the store's `getServerSnapshot` returning `{ user: null, status: 'loading' }`.
 *
 * Note: per RFC §4.10, **does NOT** expose `accessToken`. Use
 * `useCredential().getAccessToken()` for HTTP authorization.
 */

import { useCallback, useSyncExternalStore } from 'react';
import { useAuthRegistryContext } from '../context';

export interface UseSessionReturn<TUser = unknown> {
  user: TUser | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  /** Force-refresh the session (re-runs `fetchSession`). */
  mutate: () => Promise<void>;
}

export function useSession<TUser = unknown>(): UseSessionReturn<TUser> {
  const { sessionStore } = useAuthRegistryContext();
  const snapshot = useSyncExternalStore(
    sessionStore.subscribe,
    sessionStore.getSnapshot,
    sessionStore.getServerSnapshot,
  );
  const mutate = useCallback(() => sessionStore.refresh(), [sessionStore]);
  return {
    user: snapshot.user as TUser | null,
    status: snapshot.status,
    mutate,
  };
}
