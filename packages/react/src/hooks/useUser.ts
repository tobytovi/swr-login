import type { User } from '@swr-login/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
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
   * Sticky error from the last `fetchUser` failure.
   *
   * Unlike `error`, this value is **not** cleared when the auth state
   * transitions (e.g. from `authenticated` → `unauthenticated`).
   * It persists until `fetchUser` succeeds again or `clearError()` is called.
   *
   * Useful for distinguishing "not logged in" from "account disabled" in
   * AuthGuard or error-boundary components.
   */
  lastError: Error | undefined;
  /**
   * Manually reset `lastError` to `undefined`.
   */
  clearError: () => void;
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
  const { tokenManager, stateMachine, config } = useAuthContext();

  // ── lastError 状态管理 ──────────────────────────────────────
  const lastErrorRef = useRef<Error | undefined>(undefined);
  const retryCountRef = useRef(0);
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const clearError = useCallback(() => {
    lastErrorRef.current = undefined;
    forceUpdate();
  }, [forceUpdate]);

  const fetcher = async (): Promise<T | null> => {
    const token = tokenManager.getAccessToken();
    if (!token) return null;

    if (tokenManager.isExpired()) {
      try {
        await tokenManager.refresh();
      } catch {
        // refresh 失败，但 token 可能仍然有效（如 cookie-based 场景）
        // 如果 token 已被清除则放弃，否则继续尝试 fetchUser 让服务端验证
        const remainingToken = tokenManager.getAccessToken();
        if (!remainingToken) return null;
      }
    }

    if (config.fetchUser) {
      const currentToken = tokenManager.getAccessToken();
      if (!currentToken) return null;
      return (await config.fetchUser(currentToken)) as T;
    }

    return null;
  };

  const {
    data,
    error,
    isLoading,
    mutate: swrMutate,
  } = useSWR<T | null>(AUTH_KEY, fetcher, {
    revalidateOnFocus: config.swrOptions?.revalidateOnFocus ?? true,
    revalidateOnReconnect: config.swrOptions?.revalidateOnReconnect ?? true,
    shouldRetryOnError: false,
    ...(config.swrOptions?.dedupingInterval !== undefined && {
      dedupingInterval: config.swrOptions.dedupingInterval,
    }),
    ...(config.swrOptions?.focusThrottleInterval !== undefined && {
      focusThrottleInterval: config.swrOptions.focusThrottleInterval,
    }),
    ...(config.swrOptions?.refreshInterval !== undefined && {
      refreshInterval: config.swrOptions.refreshInterval,
    }),
  });

  // ── 同步 lastError + onFetchUserError 回调 ─────────────────
  useEffect(() => {
    if (error) {
      lastErrorRef.current = error;
      forceUpdate();

      // 调用 onFetchUserError 回调（如果已配置）
      if (config.onFetchUserError) {
        const action = config.onFetchUserError(error);

        if (action === 'retry' && retryCountRef.current < 1) {
          retryCountRef.current += 1;
          // 触发 SWR 重新请求
          swrMutate();
        } else if (action === 'logout') {
          tokenManager.clearTokens();
          stateMachine.transition('unauthenticated');
        }
        // 'ignore' → 仅保留 lastError，不做额外操作
      }
    } else if (data !== undefined && !error) {
      // fetchUser 成功（data 可以是 null 或 user），重置 lastError 和重试计数
      if (lastErrorRef.current !== undefined) {
        lastErrorRef.current = undefined;
        forceUpdate();
      }
      retryCountRef.current = 0;
    }
  }, [error, data, forceUpdate, config, tokenManager, stateMachine, swrMutate]);

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
    lastError: lastErrorRef.current,
    clearError,
    mutate,
  };
}

/** SWR cache key used for user data. Exported for advanced usage. */
export { AUTH_KEY };
