import {
  type AuthResponse,
  OAuthPopupError,
  type SWRLoginPlugin,
  generateCSRFState,
  validateCSRFState,
} from '@swr-login/core';

export interface GitHubOAuthCredentials {
  /** Login mode: popup (default) or redirect */
  mode?: 'popup' | 'redirect';
  /** Custom scopes (default: ['read:user', 'user:email']) */
  scopes?: string[];
  /** Allow signup on GitHub (default: true) */
  allowSignup?: boolean;
}

export interface GitHubOAuthPluginOptions {
  /** GitHub OAuth App Client ID */
  clientId: string;
  /** Redirect URI for OAuth callback */
  redirectUri?: string;
  /** Backend token exchange endpoint */
  tokenEndpoint?: string;
  /** Popup dimensions */
  popupWidth?: number;
  popupHeight?: number;
}

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
const DEFAULT_SCOPES = ['read:user', 'user:email'];

/**
 * GitHub OAuth login plugin.
 *
 * @example
 * ```ts
 * import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
 *
 * const plugin = GitHubOAuthPlugin({
 *   clientId: 'your-github-client-id',
 *   tokenEndpoint: '/api/auth/github/callback',
 * });
 * ```
 */
export function GitHubOAuthPlugin(
  options: GitHubOAuthPluginOptions,
): SWRLoginPlugin<GitHubOAuthCredentials> {
  const {
    clientId,
    redirectUri,
    tokenEndpoint = '/api/auth/github/callback',
    popupWidth = 500,
    popupHeight = 700,
  } = options;

  const getRedirectUri = () =>
    redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');

  return {
    name: 'oauth-github',
    type: 'oauth',

    async login(credentials, ctx) {
      const mode = credentials.mode ?? 'popup';
      const scopes = credentials.scopes ?? DEFAULT_SCOPES;
      const state = generateCSRFState('github');

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(),
        scope: scopes.join(' '),
        state,
        allow_signup: String(credentials.allowSignup ?? true),
      });

      const authUrl = `${GITHUB_AUTHORIZE_URL}?${params.toString()}`;

      if (mode === 'redirect') {
        window.location.href = authUrl;
        return new Promise<AuthResponse>(() => {});
      }

      // Popup mode
      return new Promise<AuthResponse>((resolve, reject) => {
        const left = Math.round(window.screenX + (window.outerWidth - popupWidth) / 2);
        const top = Math.round(window.screenY + (window.outerHeight - popupHeight) / 2);

        const popup = window.open(
          authUrl,
          'swr-login-github',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no`,
        );

        if (!popup) {
          reject(new OAuthPopupError('Popup was blocked by the browser'));
          return;
        }

        const pollTimer = setInterval(() => {
          if (popup.closed) {
            clearInterval(pollTimer);
            reject(new OAuthPopupError('Popup was closed by user'));
          }
        }, 500);

        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== ctx.origin) return;

          const { type, code, state: returnedState, error } = event.data ?? {};
          if (type !== 'SWR_LOGIN_OAUTH_CALLBACK') return;

          clearInterval(pollTimer);
          window.removeEventListener('message', handleMessage);
          popup.close();

          if (error) {
            reject(new OAuthPopupError(error));
            return;
          }

          if (!validateCSRFState(returnedState, 'github')) {
            reject(new OAuthPopupError('CSRF state validation failed'));
            return;
          }

          try {
            const response = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
            });

            if (!response.ok) {
              throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            const data = await response.json();
            const authResponse: AuthResponse = {
              user: data.user,
              accessToken: data.accessToken ?? data.access_token,
              refreshToken: data.refreshToken ?? data.refresh_token,
              expiresAt: data.expiresAt ?? data.expires_at ?? Date.now() + 3600 * 1000,
            };

            ctx.setTokens({
              accessToken: authResponse.accessToken,
              refreshToken: authResponse.refreshToken,
              expiresAt: authResponse.expiresAt,
            });

            resolve(authResponse);
          } catch (err) {
            reject(err);
          }
        };

        window.addEventListener('message', handleMessage);
      });
    },

    async logout(ctx) {
      ctx.clearTokens();
    },
  };
}

/** Helper for OAuth callback page */
export function handleGitHubCallback(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  if (window.opener) {
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
}
