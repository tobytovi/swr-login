import type { AuthResponse, LoginCallOptions, LoginErrorPhase } from '@swr-login/core';
import { LoginRejection, isMultiStepPlugin } from '@swr-login/core';
import { useCallback, useState } from 'react';
import { mutate as swrGlobalMutate } from 'swr';
import { useAuthContext } from '../context';
import { tryTranslateLoginError } from '../internal/translate-login-error';
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

      // ── translateLoginError integration ────────────────────────────
      // Run the user-supplied translator; if it produces a `LoginRejection`
      // we apply the documented terminal-state side effects (clear tokens,
      // transition to `unauthenticated`, mark as translated) and rethrow it.
      // The marker lets the SWR-side `useUser` effect skip
      // `onFetchUserError` for the same error, preventing double handling.
      const applyTranslate = (rawErr: unknown, phase: LoginErrorPhase): never => {
        const translated = tryTranslateLoginError(
          config.translateLoginError,
          rawErr,
          phase,
          resolvedOptions?.context,
          resolvedPlugin,
        );
        if (translated) {
          tokenManager.clearTokens();
          stateMachine.transition('unauthenticated');
          throw translated;
        }
        // Not recognised by the translator — fall back to legacy path.
        throw rawErr;
      };

      try {
        // response is always assigned before use: if pluginManager.login
        // throws, applyTranslate() re-throws (return type `never`), so the
        // outer catch block is reached instead of any code below.
        // We initialise with `undefined` and cast to satisfy the type checker
        // without non-null assertions on every subsequent usage.
        let response: AuthResponse = undefined as unknown as AuthResponse;
        try {
          response = await pluginManager.login(
            resolvedPlugin,
            resolvedCredentials,
            resolvedOptions,
          );
        } catch (pluginErr) {
          // Phase 1: plugin's own `login()` (or any plugin-internal hook
          // such as `coding-auth-password`'s `onPreReset`) failed.
          applyTranslate(pluginErr, 'plugin_login');
        }

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
              loginContext: resolvedOptions?.context,
            });
          } catch (afterAuthErr) {
            // Phase 2: `afterAuth` threw. The translator gets first dibs;
            // if it does not recognise the error we keep the legacy
            // semantics — clear tokens, transition to unauthenticated,
            // and rethrow as-is so existing catch blocks still fire.
            const translated = tryTranslateLoginError(
              config.translateLoginError,
              afterAuthErr,
              'after_auth',
              resolvedOptions?.context,
              resolvedPlugin,
            );
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            throw translated ?? afterAuthErr;
          }
        }

        // ── validateUserOnLogin：在 plugin 成功后调用 fetchUser 验证用户状态 ──
        if (!shouldSkipFetchUser && config.fetchUser && config.validateUserOnLogin !== false) {
          try {
            const user = await config.fetchUser({
              token: response.accessToken,
              loginContext: resolvedOptions?.context,
            });
            // 将 fetchUser 返回的用户写入 SWR 缓存，避免 useUser 重复请求
            await swrGlobalMutate(AUTH_KEY, user, { revalidate: false });
          } catch (fetchUserErr) {
            // Phase 3: login-time `fetchUser` threw. Translator first; if
            // unmatched, fall back to the existing rollback behaviour.
            const translated = tryTranslateLoginError(
              config.translateLoginError,
              fetchUserErr,
              'fetch_user',
              resolvedOptions?.context,
              undefined,
            );
            tokenManager.clearTokens();
            stateMachine.transition('unauthenticated');
            throw translated ?? fetchUserErr;
          }
        }

        stateMachine.transition('authenticated');

        // Update cache adapter if available
        if (config.cacheAdapter) {
          await config.cacheAdapter.setUser(response.user);
        }

        return response;
      } catch (err) {
        // A `LoginRejection` is already a fully terminal, business-level
        // error: tokens cleared, state transitioned. We must NOT clobber
        // that by transitioning to `error`, otherwise consumers that rely
        // on `unauthenticated` (e.g. AuthGuard) would see the wrong state.
        if (LoginRejection.is(err)) {
          setError(err);
          setIsLoading(false);
          throw err;
        }
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
