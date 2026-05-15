/**
 * @swr-login/method-oauth-google v0.9 - Google OAuth 2.0 + PKCE login method.
 *
 * Strategy: redirect-based authorization flow with PKCE (S256).
 * `redirect()` builds the authorize URL (storing the code_verifier in
 * sessionStorage) and navigates. `onRegistryMount` detects the callback,
 * exchanges the code with the backend `tokenEndpoint`, persists tokens, and
 * publishes a `login` event.
 */

import {
  CSRFError,
  type LoginMethod,
  OAuthPopupError,
  defineLoginMethod,
  generateCSRFState,
  generatePKCE,
  retrievePKCEVerifier,
  storePKCEVerifier,
  validateCSRFState,
} from '@swr-login/core';

const DEFAULT_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const DEFAULT_SCOPES = ['openid', 'profile', 'email'];
const STATE_KEY = 'google';

export interface GoogleOAuthMethodConfig {
  clientId?: string;
  redirectUri?: string;
  tokenEndpoint?: string;
  authorizeUrl?: string;
  scopes?: string[];
  loginHint?: string;
  id?: string;
  label?: string;
  slot?: string | string[];
  order?: number;
}

interface GoogleHandle {
  state: 'idle' | 'pending' | 'success' | 'error';
  reset(): void;
  redirect(): Promise<void>;
}

const METHOD_ID_DEFAULT = 'swr-login/oauth-google';

export function createGoogleOAuthMethod(
  config: GoogleOAuthMethodConfig = {},
): LoginMethod<void, void, GoogleHandle> {
  const {
    clientId = '',
    redirectUri,
    tokenEndpoint = '/api/auth/google/callback',
    authorizeUrl = DEFAULT_AUTHORIZE_URL,
    scopes = DEFAULT_SCOPES,
    loginHint,
    id = METHOD_ID_DEFAULT,
    label = 'Continue with Google',
    slot = 'oauth',
    order,
  } = config;

  const getRedirectUri = (): string =>
    redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '');

  return defineLoginMethod<void, void, GoogleHandle>({
    id,
    meta: { label, slot, order },

    use(): GoogleHandle {
      const redirect = async (): Promise<void> => {
        if (typeof window === 'undefined') return;
        if (!clientId) {
          console.error('[swr-login] GoogleOAuthMethod requires `clientId`.');
          return;
        }
        const pkce = await generatePKCE();
        storePKCEVerifier(pkce.codeVerifier);
        const state = generateCSRFState(STATE_KEY);

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
        if (loginHint) params.set('login_hint', loginHint);

        window.location.href = `${authorizeUrl}?${params.toString()}`;
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

      if (!validateCSRFState(stateParam, STATE_KEY)) {
        publishEvent({
          kind: 'external',
          methodId: id,
          payload: new CSRFError('Google OAuth state mismatch'),
          timestamp: Date.now(),
        });
        return;
      }

      const verifier = retrievePKCEVerifier();
      try {
        const res = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            code,
            code_verifier: verifier,
            redirect_uri: getRedirectUri(),
          }),
        });
        if (!res.ok) {
          throw new OAuthPopupError(`Google token exchange failed: ${res.statusText}`);
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
          payload: { provider: 'google' },
          timestamp: Date.now(),
        });
      } catch (err) {
        publishEvent({ kind: 'external', methodId: id, payload: err, timestamp: Date.now() });
      } finally {
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());
      }
    },
  });
}

export const googleOAuthMethod = createGoogleOAuthMethod();

/** @deprecated v0.7 alias. Will be removed in v1.0. */
export const GoogleOAuthPlugin = createGoogleOAuthMethod;

/** @deprecated Popup-mode shim from v0.7. v0.9 uses redirect mode. */
export function handleGoogleCallback(): void {
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
