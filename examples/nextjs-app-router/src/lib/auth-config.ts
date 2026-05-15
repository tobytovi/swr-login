'use client';

import type { AuthHookRegistryProps } from 'swr-login';
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createGitHubOAuthMethod } from 'swr-login/methods/oauth-github';
import { createPasskeyMethod } from 'swr-login/methods/passkey';
import { createPasswordMethod } from 'swr-login/methods/password';

export type User = {
  id: string;
  name: string;
  email: string;
  roles?: string[];
};

/**
 * Build the credential and methods array for <AuthHookRegistry>.
 * Called once in Providers (useMemo), so instances are stable.
 */
export function createAuthSetup(): Pick<
  AuthHookRegistryProps,
  'credential' | 'methods' | 'fetchSession' | 'onSessionChange' | 'security'
> {
  const credential = createJWTCredential({ storage: 'localStorage' });

  const methods = [
    createPasswordMethod({
      loginUrl: '/api/auth/login',
      label: 'Username & Password',
      slot: 'primary',
    }),
    createGitHubOAuthMethod({
      clientId: process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID ?? 'your-github-client-id',
      callbackUrl: '/api/auth/github/callback',
      slot: 'social',
    }),
    createPasskeyMethod({
      rpId: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      registerOptionsUrl: '/api/auth/passkey/register-options',
      registerVerifyUrl: '/api/auth/passkey/register-verify',
      loginOptionsUrl: '/api/auth/passkey/login-options',
      loginVerifyUrl: '/api/auth/passkey/login-verify',
      slot: 'social',
    }),
  ];

  async function fetchSession(token: { accessToken: string | null }) {
    if (!token.accessToken) return null;
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });
    if (!res.ok) return null;
    return res.json() as Promise<User>;
  }

  function onSessionChange(event: { kind: string; user: unknown }) {
    console.log('[swr-login]', event.kind, event.user);
  }

  return {
    credential,
    methods,
    fetchSession,
    onSessionChange,
    security: { enableBroadcastSync: true },
  };
}
