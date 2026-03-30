import useSWR from 'swr';
import type { User } from '@swr-login/core';
import { useAuthContext } from '../context';

const AUTH_KEY = '__swr_login_user__';

export interface UseUserReturn<T extends User = User> {
  /** Current authenticated user, or null if not logged in */
  user: T | null;
  /** Whether user data is being fetched */
  isLoading: boolean;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Error from fetching user data */
  error: Error | undefined;
  /**
   * Manually update cached user data.
   * Call with `null` to clear, or with a user object to update.
   */
  mutate: (data?: T | null) => Promise<void>;
}

/**
 * Hook to access current user data via SWR cache.
 *
 * Uses SWR's stale-while-revalidate strategy:
 * - Immediately returns cached user data
 * - Revalidates in the background using the configured fetchUser function
 * - Automatically syncs across all components using this hook
 *
 * @example
 * ```tsx
 * const { user, isLoading, isAuthenticated } = useUser<MyUser>();
 *
 * if (isLoading) return <Spinner />;
 * if (!isAuthenticated) return <LoginPage />;
 * return <Dashboard user={user} />;
 * ```
 */
export function useUser<T extends User = User>(): UseUserReturn<T> {
  const { tokenManager, config } = useAuthContext();

  const fetcher = async (): Promise<T | null> => {
    const token = tokenManager.getAccessToken();
    if (!token) return null;

    if (tokenManager.isExpired()) {
      try {
        await tokenManager.refresh();
      } catch {
        return null;
      }
    }

    if (config.fetchUser) {
      const currentToken = tokenManager.getAccessToken();
      if (!currentToken) return null;
      return (await config.fetchUser(currentToken)) as T;
    }

    return null;
  };

  const { data, error, isLoading, mutate: swrMutate } = useSWR<T | null>(AUTH_KEY, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    shouldRetryOnError: false,
  });

  const mutate = async (newData?: T | null): Promise<void> => {
    if (newData === undefined) {
      await swrMutate();
    } else {
      await swrMutate(newData, { revalidate: false });
    }
  };

  return {
    user: data ?? null,
    isLoading,
    isAuthenticated: !!data,
    error,
    mutate,
  };
}

/** SWR cache key used for user data. Exported for advanced usage. */
export { AUTH_KEY };
