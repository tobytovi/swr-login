/**
 * @swr-login/react - useLogout (v0.9).
 *
 * Retains the v0.7 surface for migration ease. Behavior:
 *   - Calls `credential.clear()` (drops persisted tokens)
 *   - Marks the SessionStore unauthenticated
 *   - Publishes `{ kind: 'logout' }` (which broadcasts cross-tab + fires
 *     `useSessionEvent('logout')` subscribers)
 */

import { useCallback, useState } from 'react';
import { useAuthRegistryContext } from '../context';

export interface UseLogoutReturn {
  logout: () => Promise<void>;
  isLoading: boolean;
}

export function useLogout(): UseLogoutReturn {
  const { credential, sessionStore, eventBus } = useAuthRegistryContext();
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await credential.clear();
      sessionStore.clear();
      eventBus.publish({ kind: 'logout' });
    } finally {
      setIsLoading(false);
    }
  }, [credential, sessionStore, eventBus]);

  return { logout, isLoading };
}
