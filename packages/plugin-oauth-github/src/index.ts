/**
 * @swr-login/method-oauth-github v0.9 - GitHub OAuth 2.0 login method.
 *
 * Strategy: redirect-based authorization flow (Auth Code w/ optional PKCE).
 *   - `redirect()` navigates to GitHub's authorize URL.
 *   - `onRegistryMount` detects `?code=&state=` on return, exchanges with the
 *     backend `tokenEndpoint`, persists tokens via the credential, and
 *     publishes a `login` event before clearing the URL parameters.
 *
 * Both a factory (`createGitHubOAuthMethod`) and a default instance
 * (`githubOAuthMethod`) are exported per RFC §6.3.
 */

import {
  CSRFError,
  type LoginMethod,
  OAuthPopupError,
  defineLoginMethod,
  generateCSRFState,
  validateCSRFState,
} from '@swr-login/core';

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const DEFAULT_SCOPES = ['read:user', 'user:email'];
const STATE_KEY = 'github';

export interface GitHubOAuthMethodConfig {
  /** GitHub OAuth App Client ID. Required at runtime. */
  clientId?: string;
  /** Redirect URI registered with GitHub (default: `${origin}/auth/callback`). */
  redirectUri?: string;
  /** Backend endpoint that exchanges `code` for tokens. */
  tokenEndpoint?: string;
  /** OAuth scopes (default: `['read:user', 'user:email']`). */
  scopes?: string[];
  /** Allow GitHub signup (default: true). */
  allowSignup?: boolean;
  /** Override the method id (default: `'swr-login/oauth-github'`). */
  id?: string;
  /** Override the meta label (default: `'Continue with GitHub'`). */
  label?: string;
  slot?: string | string[];
  order?: number;
}

interface GitHubHandle {
  state: 'idle' | 'pending' | 'success' | 'error';
  error?: Error;
  reset(): void;
  /** Begin the redirect-based authorization flow. */
  redirect(): void;
}

const METHOD_ID_DEFAULT = 'swr-login/oauth-github';

export function createGitHubOAuthMethod(
  config: GitHubOAuthMethodConfig = {},
): LoginMethod<void, void, GitHubHandle> {
  const {
    clientId = '',
    redirectUri,
    tokenEndpoint = '/api/auth/github/callback',
    scopes = DEFAULT_SCOPES,
    allowSignup = true,
    id = METHOD_ID_DEFAULT,
    label = 'Continue with GitHub',
    slot = 'oauth',
    order,
  } = config;

  const getRedirectUri = (): string =>
    redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');

  return defineLoginMethod<void, void, GitHubHandle>({
    id,
    meta: { label, slot, order },

    use(): GitHubHandle {
      const redirect = (): void => {
        if (typeof window === 'undefined') return;
        if (!clientId) {
          console.error('[swr-login] GitHubOAuthMethod requires `clientId`.');
          return;
        }
        const state = generateCSRFState(STATE_KEY);
        const params = new URLSearchParams({
          client_id: clientId,
          redirect_uri: getRedirectUri(),
          scope: scopes.join(' '),
          state,
          allow_signup: String(allowSignup),
        });
        window.location.href = `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;
      };

      return {
        state: 'idle',
        reset: () => {},
        redirect,
      };
    },

    onRegistryMount: async ({ credential, refreshSession, publishEvent }) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      if (!code || !stateParam) return;

      // Verify CSRF state belongs to GitHub flow (no-op if missing).
      if (!validateCSRFState(stateParam, STATE_KEY)) {
        publishEvent({
          kind: 'external',
          methodId: id,
          payload: new CSRFError('GitHub OAuth state mismatch'),
          timestamp: Date.now(),
        });
        return;
      }

      try {
        const res = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
        });
        if (!res.ok) {
          throw new OAuthPopupError(`GitHub token exchange failed: ${res.statusText}`);
        }
        const data = await res.json();
        const setter = (
          credential as {
            setTokens?: (t: {
              accessToken: string;
              refreshToken?: string;
              expiresAt?: number;
            }) => void;
          }
        ).setTokens;
        if (typeof setter === 'function') {
          setter({
            accessToken: data.accessToken ?? data.access_token,
            refreshToken: data.refreshToken ?? data.refresh_token,
            expiresAt: data.expiresAt ?? data.expires_at,
          });
        }
        await refreshSession();
        publishEvent({
          kind: 'login',
          methodId: id,
          payload: { provider: 'github' },
          timestamp: Date.now(),
        });
      } catch (err) {
        publishEvent({ kind: 'external', methodId: id, payload: err, timestamp: Date.now() });
      } finally {
        // Always clean URL params, even if exchange failed (avoid replays).
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());
      }
    },
  });
}

/** Zero-config default GitHub OAuth method. Requires runtime `clientId`. */
export const githubOAuthMethod = createGitHubOAuthMethod();

/** @deprecated v0.7 alias. Will be removed in v1.0. */
export const GitHubOAuthPlugin = createGitHubOAuthMethod;

/**
 * Helper for the OAuth callback page (popup-mode legacy).
 *
 * @deprecated v0.7 popup-mode shim. v0.9 uses redirect mode by default and
 * this helper is no longer needed; kept for migration.
 */
export function handleGitHubCallback(): void {
  if (typeof window === 'undefined' || !window.opener) return;
  const params = new URLSearchParams(window.location.search);
  window.opener.postMessage(
    {
      type: 'SWR_LOGIN_OAUTH_CALLBACK',
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error'),
    },
    window.location.origin,
  );
}
