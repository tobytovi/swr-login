import { useCallback, useState } from 'react';
import type { AuthResponse } from '@swr-login/core';
import { useAuthContext } from '../context';

export interface UseLoginOptions {
  /** Plugin name to use for login */
  pluginName?: string;
}

export interface UseLoginReturn<TCredentials = unknown> {
  /**
   * Trigger login with specified credentials.
   * If pluginName was not provided in options, it must be passed as first argument.
   */
  login: (
    credentialsOrPluginName: TCredentials | string,
    credentials?: TCredentials,
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
  const { pluginManager, stateMachine, config } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const login = useCallback(
    async (
      credentialsOrPluginName: TCredentials | string,
      maybeCredentials?: TCredentials,
    ): Promise<AuthResponse> => {
      let resolvedPlugin: string;
      let resolvedCredentials: TCredentials;

      if (typeof credentialsOrPluginName === 'string' && !pluginName) {
        resolvedPlugin = credentialsOrPluginName;
        resolvedCredentials = (maybeCredentials ?? {}) as TCredentials;
      } else if (pluginName) {
        resolvedPlugin = pluginName;
        resolvedCredentials = credentialsOrPluginName as TCredentials;
      } else {
        throw new Error('[swr-login] Plugin name is required. Provide it to useLogin() or login().');
      }

      setIsLoading(true);
      setError(null);
      stateMachine.transition('authenticating');

      try {
        const response = await pluginManager.login(resolvedPlugin, resolvedCredentials);
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
    [pluginManager, stateMachine, config, pluginName],
  );

  const reset = useCallback(() => {
    setError(null);
  }, []);

  return { login, isLoading, error, reset };
}
