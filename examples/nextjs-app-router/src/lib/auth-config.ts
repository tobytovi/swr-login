import { JWTAdapter } from '@swr-login/adapter-jwt';
import type { SWRLoginConfig } from '@swr-login/core';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
import { PasskeyPlugin } from '@swr-login/plugin-passkey';
import { PasswordPlugin } from '@swr-login/plugin-password';

/**
 * Shared auth configuration used by the SWRLoginProvider.
 *
 * In a real app, replace placeholder URLs with your actual API endpoints.
 */
export function createAuthConfig(): SWRLoginConfig {
  return {
    adapter: JWTAdapter({ storage: 'localStorage' }),
    plugins: [
      PasswordPlugin({
        loginUrl: '/api/auth/login',
        logoutUrl: '/api/auth/logout',
      }),
      GoogleOAuthPlugin({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? 'your-google-client-id',
        tokenEndpoint: '/api/auth/google/callback',
      }),
      GitHubOAuthPlugin({
        clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? 'your-github-client-id',
        tokenEndpoint: '/api/auth/github/callback',
      }),
      PasskeyPlugin({
        rpId: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
        registerOptionsUrl: '/api/auth/passkey/register-options',
        registerVerifyUrl: '/api/auth/passkey/register-verify',
        loginOptionsUrl: '/api/auth/passkey/login-options',
        loginVerifyUrl: '/api/auth/passkey/login-verify',
      }),
    ],
    fetchUser: async (token: string) => {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
    onLogin: (user) => {
      console.log('[swr-login] Logged in:', user);
    },
    onLogout: () => {
      console.log('[swr-login] Logged out');
    },
    onError: (error) => {
      console.error('[swr-login] Auth error:', error);
    },
  };
}
