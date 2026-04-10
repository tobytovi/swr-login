import type { TokenAdapter } from '@swr-login/core';
import { useCallback } from 'react';
import { useAuthContext } from '../context';

export interface UseAdapterReturn {
  /**
   * Synchronously check whether the adapter currently holds a valid auth credential.
   *
   * Uses `adapter.hasAuth()` if the adapter implements it,
   * otherwise falls back to `adapter.getAccessToken() !== null`.
   *
   * This is a **synchronous, non-reactive** check — it reads the adapter's
   * current state at call time. It does NOT trigger re-renders when the
   * underlying token changes. For reactive auth state, use `useUser()`.
   *
   * Typical use cases:
   * - Conditional rendering before SWR hydration completes
   * - Route guard pre-checks
   * - Analytics / logging
   *
   * @example
   * ```tsx
   * const { hasAuth } = useAdapter();
   *
   * // 首页自动跳转
   * useEffect(() => {
   *   if (hasAuth()) {
   *     router.push('/dashboard');
   *   }
   * }, []);
   * ```
   */
  hasAuth: () => boolean;

  /**
   * Direct reference to the underlying `TokenAdapter` instance.
   *
   * Escape hatch for advanced scenarios where you need low-level
   * access to token storage (e.g. reading refresh token, manually
   * clearing tokens outside of the normal logout flow).
   *
   * Prefer `hasAuth()` and the higher-level hooks (`useUser`, `useLogin`)
   * for most use cases.
   */
  adapter: TokenAdapter;
}

/**
 * Hook to access the token adapter and its utility methods.
 *
 * Provides a convenient `hasAuth()` check that works synchronously,
 * useful for UI decisions that need to happen before SWR data is available.
 *
 * @example
 * ```tsx
 * function HomePage() {
 *   const { hasAuth } = useAdapter();
 *   const router = useRouter();
 *
 *   useEffect(() => {
 *     if (hasAuth()) {
 *       router.push('/dashboard');
 *     }
 *   }, []);
 *
 *   return <LoginPage />;
 * }
 * ```
 */
export function useAdapter(): UseAdapterReturn {
  const { config } = useAuthContext();
  const adapter = config.adapter;

  const hasAuth = useCallback((): boolean => {
    if (typeof adapter.hasAuth === 'function') {
      return adapter.hasAuth();
    }
    // Fallback: 检查 accessToken 是否存在
    return adapter.getAccessToken() !== null;
  }, [adapter]);

  return { hasAuth, adapter };
}
