import type { AuthResponse, LoginCallOptions } from '@swr-login/core';
import { isMultiStepPlugin } from '@swr-login/core';
import { useCallback, useState } from 'react';
import { mutate as swrGlobalMutate } from 'swr';
import { useAuthContext } from '../context';
import { AUTH_KEY } from './useUser';

export interface UseLoginOptions {
  /** Plugin name to use for login */
  pluginName?: string;
}

export interface UseLoginReturn<TCredentials = unknown> {
  /**
   * Trigger login with specified credentials.
   * If pluginName was not provided in options, it must be passed as first argument.
   *
   * The `options` argument is forwarded to `PluginManager.login()`. Specifically,
   * `options.context` is exposed to the underlying plugin via
   * `PluginContext.loginContext` (opaque pass-through). Use it to disambiguate
   * concurrent login flows or pass per-call hints to plugin hooks
   * (e.g., `coding-auth-password`'s `onPreReset`) without resorting to
   * module-level mutable variables.
   *
   * @example
   * ```tsx
   * // With useLogin('password')
   * await login({ user, pass }, { context: { variant: 'teacher' } });
   *
   * // Without preset pluginName
   * await login('password', { user, pass }, { context: { variant: 'teacher' } });
   * ```
   */
  login: (
    credentialsOrPluginName: TCredentials | string,
    credentialsOrOptions?: TCredentials | LoginCallOptions,
    options?: LoginCallOptions,
  ) => Promise<AuthResponse>;
  /** Whether a login request is in progress */
  isLoading: boolean;
  /** Last login error, if any */
  error: Error | null;
  /** Reset error state */
  reset: () => void;
}

/**
 * Hook to trigger login flow via a registered plugin.
 *
 * @param pluginName - Optional default plugin name
 *
 * @example
 * ```tsx
 * // With default plugin
 * const { login, isLoading, error } = useLogin('password');
 * await login({ username: 'alice', password: 'secret' });
 *
 * // Without default plugin (specify at call time)
 * const { login } = useLogin();
 * await login('oauth-google', { redirect: false });
 * ```
 */
export function useLogin<TCredentials = unknown>(
  pluginName?: string,
): UseLoginReturn<TCredentials> {
  const { pluginManager, tokenManager, stateMachine, config } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const login = useCallback(
    async (
      credentialsOrPluginName: TCredentials | string,
      credentialsOrOptions?: TCredentials | LoginCallOptions,
      maybeOptions?: LoginCallOptions,
    ): Promise<AuthResponse> => {
      let resolvedPlugin: string;
      let resolvedCredentials: TCredentials;
      let resolvedOptions: LoginCallOptions | undefined;

      if (typeof credentialsOrPluginName === 'string' && !pluginName) {
        // Form: login(pluginName, credentials?, options?)
        resolvedPlugin = credentialsOrPluginName;
        resolvedCredentials = (credentialsOrOptions ?? {}) as TCredentials;
        resolvedOptions = maybeOptions;
      } else if (pluginName) {
        // Form: login(credentials, options?)
        resolvedPlugin = pluginName;
        resolvedCredentials = credentialsOrPluginName as TCredentials;
        resolvedOptions = credentialsOrOptions as LoginCallOptions | undefined;
      } else {
        throw new Error(
          '[swr-login] Plugin name is required. Provide it to useLogin() or login().',
        );
      }

      setIsLoading(true);
      setError(null);
      stateMachine.transition('authenticating');

      // 检查是否为多步骤插件，给出友好错误提示
      const targetPlugin = pluginManager.getPlugin(resolvedPlugin);
      if (targetPlugin && isMultiStepPlugin(targetPlugin)) {
        const err = new Error(
          `[swr-login] Plugin "${resolvedPlugin}" is a multi-step plugin. Use useMultiStepLogin() instead of useLogin() for multi-step login flows.`,
        );
        setError(err);
        stateMachine.transition('error');
        setIsLoading(false);
        throw err;
      }

      try {
        const response = await pluginManager.login(
          resolvedPlugin,
          resolvedCredentials,
          resolvedOptions,
        );

        // ── afterAuth：在 plugin 成功后、fetchUser 之前执行自定义钩子 ──
        let shouldSkipFetchUser = false;
        if (config.afterAuth) {
          try {
            await config.afterAuth({
              pluginName: resolvedPlugin,
              authResponse: response,
              skipFetchUser: () => {
                shouldSkipFetchUser = true;
              },
            });
          } catch (afterAuthErr) {
            // afterAuth 抛错：回滚 token，login() reject
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            throw afterAuthErr;
          }
        }

        // ── validateUserOnLogin：在 plugin 成功后调用 fetchUser 验证用户状态 ──
        if (!shouldSkipFetchUser && config.fetchUser && config.validateUserOnLogin !== false) {
          try {
            const user = await config.fetchUser(response.accessToken);
            // 将 fetchUser 返回的用户写入 SWR 缓存，避免 useUser 重复请求
            await swrGlobalMutate(AUTH_KEY, user, { revalidate: false });
          } catch (fetchUserErr) {
            // fetchUser 失败：回滚 token，转为 unauthenticated
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            throw fetchUserErr;
          }
        }

        stateMachine.transition('authenticated');

        // Update cache adapter if available
        if (config.cacheAdapter) {
          await config.cacheAdapter.setUser(response.user);
        }

        return response;
      } catch (err) {
        const authError = err instanceof Error ? err : new Error('Login failed');
        setError(authError);
        stateMachine.transition('error');
        throw authError;
      } finally {
        setIsLoading(false);
      }
    },
    [pluginManager, tokenManager, stateMachine, config, pluginName],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { login, isLoading, error, reset };
}
