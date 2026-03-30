import { type AuthResponse, NetworkError, type SWRLoginPlugin } from '@swr-login/core';

export interface PasskeyCredentials {
  /** Action: 'register' to create a new passkey, 'login' to authenticate */
  action?: 'register' | 'login';
  /** User identifier for registration (email or username) */
  username?: string;
  /** Display name for registration */
  displayName?: string;
}

export interface PasskeyPluginOptions {
  /** Backend endpoint to get registration options */
  registerOptionsUrl: string;
  /** Backend endpoint to verify registration */
  registerVerifyUrl: string;
  /** Backend endpoint to get authentication options */
  loginOptionsUrl: string;
  /** Backend endpoint to verify authentication */
  loginVerifyUrl: string;
  /** Relying Party ID (default: current domain) */
  rpId?: string;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * WebAuthn/Passkey login plugin.
 *
 * Supports:
 * - **Registration**: Create a new passkey (fingerprint, Face ID, security key)
 * - **Authentication**: Login with an existing passkey
 *
 * Requires backend endpoints that implement the WebAuthn server-side protocol.
 *
 * @example
 * ```ts
 * import { PasskeyPlugin } from '@swr-login/plugin-passkey';
 *
 * const plugin = PasskeyPlugin({
 *   registerOptionsUrl: '/api/auth/passkey/register/options',
 *   registerVerifyUrl: '/api/auth/passkey/register/verify',
 *   loginOptionsUrl: '/api/auth/passkey/login/options',
 *   loginVerifyUrl: '/api/auth/passkey/login/verify',
 * });
 * ```
 */
export function PasskeyPlugin(options: PasskeyPluginOptions): SWRLoginPlugin<PasskeyCredentials> {
  const { registerOptionsUrl, registerVerifyUrl, loginOptionsUrl, loginVerifyUrl } = options;

  return {
    name: 'passkey',
    type: 'passkey',

    async login(credentials, ctx) {
      const action = credentials.action ?? 'login';

      if (!window.PublicKeyCredential) {
        throw new Error('WebAuthn is not supported in this browser');
      }

      if (action === 'register') {
        return await handleRegister(credentials, ctx);
      }

      return await handleLogin(ctx);
    },

    async logout(ctx) {
      ctx.clearTokens();
    },
  };

  async function handleRegister(
    credentials: PasskeyCredentials,
    ctx: import('@swr-login/core').PluginContext,
  ): Promise<AuthResponse> {
    // 1. Get registration options from server
    const optionsRes = await fetch(registerOptionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: credentials.username,
        displayName: credentials.displayName ?? credentials.username,
      }),
    });

    if (!optionsRes.ok) {
      throw new NetworkError('Failed to get registration options', optionsRes.status);
    }

    const optionsData = await optionsRes.json();

    // 2. Create credentials via WebAuthn API
    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      ...optionsData,
      challenge: base64urlToBuffer(optionsData.challenge),
      user: {
        ...optionsData.user,
        id: base64urlToBuffer(optionsData.user.id),
      },
      excludeCredentials: optionsData.excludeCredentials?.map(
        (cred: { id: string; type: string }) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        }),
      ),
    };

    const credential = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Passkey creation was cancelled');
    }

    const attestationResponse = credential.response as AuthenticatorAttestationResponse;

    // 3. Verify with server
    const verifyRes = await fetch(registerVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          attestationObject: bufferToBase64url(attestationResponse.attestationObject),
          clientDataJSON: bufferToBase64url(attestationResponse.clientDataJSON),
        },
      }),
    });

    if (!verifyRes.ok) {
      throw new NetworkError('Passkey registration verification failed', verifyRes.status);
    }

    const data = await verifyRes.json();
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

    return authResponse;
  }

  async function handleLogin(ctx: import('@swr-login/core').PluginContext): Promise<AuthResponse> {
    // 1. Get authentication options from server
    const optionsRes = await fetch(loginOptionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!optionsRes.ok) {
      throw new NetworkError('Failed to get login options', optionsRes.status);
    }

    const optionsData = await optionsRes.json();

    // 2. Get credentials via WebAuthn API
    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      ...optionsData,
      challenge: base64urlToBuffer(optionsData.challenge),
      allowCredentials: optionsData.allowCredentials?.map((cred: { id: string; type: string }) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      })),
    };

    const credential = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential;

    if (!credential) {
      throw new Error('Passkey authentication was cancelled');
    }

    const assertionResponse = credential.response as AuthenticatorAssertionResponse;

    // 3. Verify with server
    const verifyRes = await fetch(loginVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: credential.id,
        rawId: bufferToBase64url(credential.rawId),
        type: credential.type,
        response: {
          authenticatorData: bufferToBase64url(assertionResponse.authenticatorData),
          clientDataJSON: bufferToBase64url(assertionResponse.clientDataJSON),
          signature: bufferToBase64url(assertionResponse.signature),
          userHandle: assertionResponse.userHandle
            ? bufferToBase64url(assertionResponse.userHandle)
            : null,
        },
      }),
    });

    if (!verifyRes.ok) {
      throw new NetworkError('Passkey authentication verification failed', verifyRes.status);
    }

    const data = await verifyRes.json();
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

    return authResponse;
  }
}

/**
 * Check if WebAuthn/Passkey is supported in the current browser.
 */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
