import { NetworkError, type AuthResponse, type SWRLoginPlugin } from '@swr-login/core';

/** Credentials for password-based login */
export interface PasswordCredentials {
  /** Username, email, or phone number */
  username: string;
  /** User's password */
  password: string;
  /** Optional: remember me flag */
  rememberMe?: boolean;
}

export interface PasswordPluginOptions {
  /** URL of your login API endpoint */
  loginUrl: string;
  /** URL of your logout API endpoint (optional) */
  logoutUrl?: string;
  /** Custom fetch options (e.g., headers) */
  fetchOptions?: RequestInit;
  /**
   * Transform server response to AuthResponse.
   * Override if your API has a different response shape.
   */
  transformResponse?: (data: unknown) => AuthResponse;
}

/**
 * Password login plugin for username/password authentication.
 *
 * @example
 * ```ts
 * import { PasswordPlugin } from '@swr-login/plugin-password';
 *
 * const plugin = PasswordPlugin({
 *   loginUrl: '/api/auth/login',
 *   logoutUrl: '/api/auth/logout',
 * });
 *
 * // Use with SWRLoginProvider
 * <SWRLoginProvider config={{ plugins: [plugin], ... }}>
 * ```
 */
export function PasswordPlugin(options: PasswordPluginOptions): SWRLoginPlugin<PasswordCredentials> {
  const { loginUrl, logoutUrl, fetchOptions = {}, transformResponse } = options;

  return {
    name: 'password',
    type: 'password',

    async login(credentials, ctx) {
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...((fetchOptions.headers as Record<string, string>) ?? {}),
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
        ...fetchOptions,
      });

      if (!response.ok) {
        throw new NetworkError(
          `Login failed: ${response.statusText}`,
          response.status,
        );
      }

      const data = await response.json();

      if (transformResponse) {
        const authResponse = transformResponse(data);
        ctx.setTokens({
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          expiresAt: authResponse.expiresAt,
        });
        return authResponse;
      }

      // Default: expect standard AuthResponse shape
      const authResponse: AuthResponse = {
        user: data.user,
        accessToken: data.accessToken ?? data.access_token ?? data.token,
        refreshToken: data.refreshToken ?? data.refresh_token,
        expiresAt: data.expiresAt ?? data.expires_at ?? Date.now() + 3600 * 1000,
      };

      ctx.setTokens({
        accessToken: authResponse.accessToken,
        refreshToken: authResponse.refreshToken,
        expiresAt: authResponse.expiresAt,
      });

      return authResponse;
    },

    async logout(ctx) {
      if (logoutUrl) {
        try {
          await fetch(logoutUrl, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              ...((fetchOptions.headers as Record<string, string>) ?? {}),
            },
          });
        } catch {
          // Swallow logout API errors - local cleanup is more important
        }
      }
      ctx.clearTokens();
    },
  };
}
