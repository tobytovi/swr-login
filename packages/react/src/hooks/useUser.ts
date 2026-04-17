import type { User, UserChangeEvent, UserChangeSource } from '@swr-login/core';
import { useCallback, useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { useAuthContext } from '../context';

const AUTH_KEY = '__swr_login_user__';

/**
 * Time window (ms) during which a hint written by the Provider remains
 * valid. If SWR produces a change later than this after the hint was
 * written, we treat it as a passive `revalidate` instead.
 */
const USER_CHANGE_HINT_TTL_MS = 1000;

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
  /**
   * Why the most recent `user` transition happened.
   *
   * - `null`         — No user-change has been observed yet in this component
   *                    (e.g. before the first `fetchUser` resolves on mount).
   * - `'initial'`    — First time the Provider observed a user value
   *                    (including `null` for unauthenticated cold start).
   * - `'login'`      — Triggered by an explicit `login()` / multi-step finalize
   *                    / `injectAuth()` call.
   * - `'logout'`     — Triggered by an explicit `logout()` / `injectLogout()`.
   * - `'revalidate'` — SWR background revalidation produced a different user.
   * - `'external'`   — Cross-tab sync via BroadcastChannel / storage events.
   *
   * Use this to differentiate user-initiated transitions from passive ones,
   * e.g. to suppress a welcome toast on page refresh.
   */
  lastChangeSource: UserChangeSource | null;
  /**
   * Full event object for the most recent `user` transition, including
   * `previousUser` and `timestamp`. `null` before the first transition.
   *
   * See `lastChangeSource` for a quick discriminator.
   */
  lastChangeEvent: UserChangeEvent<T> | null;
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
 *
 * @example Distinguish user-change sources
 * ```tsx
 * const { user, lastChangeSource } = useUser();
 *
 * useEffect(() => {
 *   // Only auto-redirect when we detect an *existing* session on mount,
 *   // not when the user just pressed the "Login" button (the login form
 *   // is responsible for its own redirect there).
 *   if (user && lastChangeSource === 'initial') {
 *     showRedirectOverlay();
 *   }
 * }, [user, lastChangeSource]);
 * ```
 */
export function useUser<T extends User = User>(): UseUserReturn<T> {
  const { tokenManager, stateMachine, config, emitter, userChangeHint } = useAuthContext();

  // ── lastError 状态管理 ──────────────────────────────────────
  const lastErrorRef = useRef<Error | undefined>(undefined);
  const retryCountRef = useRef(0);
  const [, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  const clearError = useCallback(() => {
    lastErrorRef.current = undefined;
    forceUpdate();
  }, [forceUpdate]);

  // ── user-change 事件：previousUser 跟踪 + lastChangeSource 状态 ──
  // Use a sentinel (`undefined`) to mean "never observed a value yet",
  // separate from `null` which means "observed and was unauthenticated".
  const previousUserRef = useRef<T | null | undefined>(undefined);
  const [lastChangeEvent, setLastChangeEvent] = useState<UserChangeEvent<T> | null>(null);

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

  // ── user-change 派发（每当 SWR 的 data 稳定为 user/null 时触发一次）──
  useEffect(() => {
    // SWR 尚未完成首次解析：data === undefined → 跳过
    if (data === undefined) return;

    const prev = previousUserRef.current;
    // 值未变化（含对象引用 +  null → null）→ 不派发
    if (Object.is(prev, data)) return;

    // 选择 source：
    //   1) 首次（prev === undefined）→ 'initial'
    //   2) Provider 近期标记了 hint（TTL 内）→ 使用 hint.source
    //   3) 其余一律视为被动 revalidate
    let source: UserChangeSource;
    if (prev === undefined) {
      source = 'initial';
    } else {
      const now = Date.now();
      const hintFresh =
        userChangeHint.source !== null && now - userChangeHint.timestamp <= USER_CHANGE_HINT_TTL_MS;
      source = hintFresh ? (userChangeHint.source as UserChangeSource) : 'revalidate';
    }

    // NOTE: We intentionally do NOT clear the hint here. Multiple useUser()
    // consumers may each observe the same SWR data change within the same
    // tick; all of them should see the same source. The hint will naturally
    // expire via TTL before the next unrelated SWR revalidate arrives.

    const event: UserChangeEvent<T> = {
      source,
      user: data,
      previousUser: prev,
      timestamp: Date.now(),
    };

    previousUserRef.current = data;
    setLastChangeEvent(event);
    emitter.emit('user-change', event as UserChangeEvent);
  }, [data, emitter, userChangeHint]);

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
    lastChangeSource: lastChangeEvent?.source ?? null,
    lastChangeEvent,
  };
}

/** SWR cache key used for user data. Exported for advanced usage. */
export { AUTH_KEY };
