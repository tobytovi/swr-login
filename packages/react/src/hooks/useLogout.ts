import { useCallback, useState } from 'react';
import { mutate } from 'swr';
import { useAuthContext } from '../context';
import { AUTH_KEY } from './useUser';

export interface UseLogoutOptions {
  /** Specific plugin to call logout on */
  pluginName?: string;
  /** Whether to broadcast logout to other tabs (default: true) */
  broadcast?: boolean;
}

export interface UseLogoutReturn {
  /** Execute logout */
  logout: (options?: UseLogoutOptions) => Promise<void>;
  /** Whether logout is in progress */
  isLoading: boolean;
}

/**
 * Hook to perform secure logout with cross-tab sync.
 *
 * Logout flow:
 * 1. Call plugin logout (if applicable)
 * 2. Clear stored tokens
 * 3. Clear SWR cache (mutate user to null)
 * 4. Broadcast logout to other tabs
 * 5. Transition state to 'unauthenticated'
 *
 * @example
 * ```tsx
 * const { logout, isLoading } = useLogout();
 *
 * <button onClick={() => logout()} disabled={isLoading}>
 *   Sign Out
 * </button>
 * ```
 */
export function useLogout(): UseLogoutReturn {
  const { pluginManager, stateMachine, broadcastSync } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);

  const logout = useCallback(
    async (options?: UseLogoutOptions) => {
      setIsLoading(true);

      try {
        // Call plugin logout
        await pluginManager.logout(options?.pluginName);

        // Clear SWR cache
        await mutate(AUTH_KEY, null, { revalidate: false });

        // Update state
        stateMachine.transition('unauthenticated');

        // Broadcast to other tabs
        const shouldBroadcast = options?.broadcast !== false;
        if (shouldBroadcast && broadcastSync) {
          broadcastSync.send('LOGOUT');
        }
      } catch (err) {
        console.error('[swr-login] Logout error:', err);
        // Even if logout API fails, clear local state
        await mutate(AUTH_KEY, null, { revalidate: false });
        stateMachine.transition('unauthenticated');
      } finally {
        setIsLoading(false);
      }
    },
    [pluginManager, stateMachine, broadcastSync],
  );

  return { logout, isLoading };
}
