import {
  type AuthResponse,
  OAuthPopupError,
  type SWRLoginPlugin,
  generateCSRFState,
  generatePKCE,
  storePKCEVerifier,
  validateCSRFState,
} from '@swr-login/core';

export interface GoogleOAuthCredentials {
  /** Login mode: popup (no refresh) or redirect */
  mode?: 'popup' | 'redirect';
  /** Custom scopes (default: ['openid', 'profile', 'email']) */
  scopes?: string[];
  /** Login hint (email address) */
  loginHint?: string;
}

export interface GoogleOAuthPluginOptions {
  /** Google OAuth Client ID */
  clientId: string;
  /** Redirect URI for OAuth callback */
  redirectUri?: string;
  /** Backend token exchange endpoint */
  tokenEndpoint?: string;
  /** Authorization endpoint (default: Google's) */
  authorizeUrl?: string;
  /** Popup window dimensions */
  popupWidth?: number;
  popupHeight?: number;
}

const DEFAULT_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPES = ['openid', 'profile', 'email'];

/**
 * Google OAuth 2.0 login plugin with PKCE support.
 *
 * Supports two modes:
 * - **Popup** (default): Opens OAuth flow in a popup window. Main page stays intact.
 * - **Redirect**: Full-page redirect to Google, then back to your app.
 *
 * @example
 * ```ts
 * import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
 *
 * const plugin = GoogleOAuthPlugin({
 *   clientId: 'your-google-client-id.apps.googleusercontent.com',
 *   tokenEndpoint: '/api/auth/google/callback',
 * });
 * ```
 */
export function GoogleOAuthPlugin(
  options: GoogleOAuthPluginOptions,
): SWRLoginPlugin<GoogleOAuthCredentials> {
  const {
    clientId,
    redirectUri,
    tokenEndpoint = '/api/auth/google/callback',
    authorizeUrl = DEFAULT_AUTHORIZE_URL,
    popupWidth = 500,
    popupHeight = 600,
  } = options;

  const getRedirectUri = () =>
    redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');

  return {
    name: 'oauth-google',
    type: 'oauth',

    async login(credentials, ctx) {
      const mode = credentials.mode ?? 'popup';
      const scopes = credentials.scopes ?? DEFAULT_SCOPES;

      const pkce = await generatePKCE();
      storePKCEVerifier(pkce.codeVerifier);

      const state = generateCSRFState('google');

      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: getRedirectUri(),
        response_type: 'code',
        scope: scopes.join(' '),
        state,
        code_challenge: pkce.codeChallenge,
        code_challenge_method: pkce.codeChallengeMethod,
        access_type: 'offline',
        prompt: 'consent',
      });

      if (credentials.loginHint) {
        params.set('login_hint', credentials.loginHint);
      }

      const authUrl = `${authorizeUrl}?${params.toString()}`;

      if (mode === 'redirect') {
        window.location.href = authUrl;
        // Will never resolve - page navigates away
        return new Promise<AuthResponse>(() => {});
      }

      // Popup mode
      return new Promise<AuthResponse>((resolve, reject) => {
        const left = Math.round(window.screenX + (window.outerWidth - popupWidth) / 2);
        const top = Math.round(window.screenY + (window.outerHeight - popupHeight) / 2);

        const popup = window.open(
          authUrl,
          'swr-login-google',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},toolbar=no,menubar=no`,
        );

        if (!popup) {
          reject(new OAuthPopupError('Popup was blocked by the browser'));
          return;
        }

        // Poll for popup close and listen for postMessage
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

          if (!validateCSRFState(returnedState, 'google')) {
            reject(new OAuthPopupError('CSRF state validation failed'));
            return;
          }

          try {
            // Exchange code for tokens via backend
            const response = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                code,
                code_verifier: pkce.codeVerifier,
                redirect_uri: getRedirectUri(),
              }),
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

/**
 * Helper: Call this from your OAuth callback page to send the code back to the opener.
 *
 * @example
 * ```ts
 * // pages/auth/callback.tsx
 * import { handleGoogleCallback } from '@swr-login/plugin-oauth-google';
 *
 * useEffect(() => {
 *   handleGoogleCallback();
 * }, []);
 * ```
 */
export function handleGoogleCallback(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');

  if (window.opener) {
    window.opener.postMessage(
      {
        type: 'SWR_LOGIN_OAUTH_CALLBACK',
        code,
        state,
        error,
      },
      window.location.origin,
    );
  }
}
