/**
 * @swr-login/method-passkey v0.9 - WebAuthn / Passkey login method.
 *
 * Two flows surfaced on the handle:
 *   - `submit({ action: 'login' })` — authenticate with an existing passkey
 *   - `submit({ action: 'register', username })` — create a new passkey
 *
 * The backend is expected to expose four endpoints:
 *   - `POST registerOptionsUrl` / `POST registerVerifyUrl`
 *   - `POST loginOptionsUrl` / `POST loginVerifyUrl`
 *
 * See README for the canonical request/response shape.
 */

import {
  type BaseLoginMethodHandle,
  type LoginMethod,
  LoginRejection,
  NetworkError,
  defineLoginMethod,
} from '@swr-login/core';
import { useAuthInternal } from '@swr-login/react';
import { useState } from 'react';

export interface PasskeyInput {
  action?: 'register' | 'login';
  username?: string;
  displayName?: string;
}

export interface PasskeyResponse {
  user: unknown;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface PasskeyHandle extends BaseLoginMethodHandle<PasskeyInput, PasskeyResponse> {
  submit: (input?: PasskeyInput) => Promise<PasskeyResponse>;
}

export interface PasskeyMethodConfig {
  registerOptionsUrl?: string;
  registerVerifyUrl?: string;
  loginOptionsUrl?: string;
  loginVerifyUrl?: string;
  /** Relying-party id (default: current host). */
  rpId?: string;
  id?: string;
  label?: string;
  slot?: string | string[];
  order?: number;
}

const METHOD_ID_DEFAULT = 'swr-login/passkey';

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(s: string): ArrayBuffer {
  const base64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function createPasskeyMethod(
  config: PasskeyMethodConfig = {},
): LoginMethod<PasskeyInput, PasskeyResponse, PasskeyHandle> {
  const {
    registerOptionsUrl = '/api/auth/passkey/register/options',
    registerVerifyUrl = '/api/auth/passkey/register/verify',
    loginOptionsUrl = '/api/auth/passkey/login/options',
    loginVerifyUrl = '/api/auth/passkey/login/verify',
    id = METHOD_ID_DEFAULT,
    label = 'Continue with passkey',
    slot = 'primary',
    order,
  } = config;

  return defineLoginMethod<PasskeyInput, PasskeyResponse, PasskeyHandle>({
    id,
    meta: { label, slot, order },

    use(): PasskeyHandle {
      const { credential, refreshSession, publishEvent } = useAuthInternal();
      const [state, setState] = useState<PasskeyHandle['state']>('idle');
      const [error, setError] = useState<LoginRejection | Error | undefined>();

      const submit = async (input?: PasskeyInput): Promise<PasskeyResponse> => {
        setState('pending');
        setError(undefined);
        try {
          if (typeof window === 'undefined' || !window.PublicKeyCredential) {
            throw new LoginRejection('WebAuthn is not supported in this browser', {
              code: 'ERR_PASSKEY_UNSUPPORTED',
              reason: 'webauthn_unsupported',
              methodId: id,
            });
          }
          const action = input?.action ?? 'login';
          const result = action === 'register' ? await register(input) : await login();

          // Persist tokens
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
              accessToken: result.accessToken,
              refreshToken: result.refreshToken,
              expiresAt: result.expiresAt,
            });
          }
          await refreshSession();
          publishEvent({
            kind: 'login',
            methodId: id,
            payload: { action },
            timestamp: Date.now(),
          });
          setState('success');
          return result;
        } catch (err) {
          const rejection = LoginRejection.is(err)
            ? err
            : new LoginRejection(err instanceof Error ? err.message : 'Passkey login failed', {
                code: 'ERR_PASSKEY_FAILED',
                reason: 'passkey_failed',
                methodId: id,
                cause: err,
              });
          setError(rejection);
          setState('error');
          throw rejection;
        }
      };

      return {
        submit,
        state,
        error,
        reset: () => {
          setError(undefined);
          setState('idle');
        },
      };
    },
  });

  async function register(input?: PasskeyInput): Promise<PasskeyResponse> {
    const optionsRes = await fetch(registerOptionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        username: input?.username,
        displayName: input?.displayName ?? input?.username,
      }),
    });
    if (!optionsRes.ok) throw new NetworkError('Failed to get registration options');
    const optionsData = await optionsRes.json();

    const publicKeyOptions: PublicKeyCredentialCreationOptions = {
      ...optionsData,
      challenge: base64urlToBuffer(optionsData.challenge),
      user: { ...optionsData.user, id: base64urlToBuffer(optionsData.user.id) },
      excludeCredentials: optionsData.excludeCredentials?.map(
        (cred: { id: string; type: string }) => ({
          ...cred,
          id: base64urlToBuffer(cred.id),
        }),
      ),
    };

    const cred = (await navigator.credentials.create({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;
    if (!cred) throw new Error('Passkey creation was cancelled');
    const att = cred.response as AuthenticatorAttestationResponse;

    const verifyRes = await fetch(registerVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: cred.id,
        rawId: bufferToBase64url(cred.rawId),
        type: cred.type,
        response: {
          attestationObject: bufferToBase64url(att.attestationObject),
          clientDataJSON: bufferToBase64url(att.clientDataJSON),
        },
      }),
    });
    if (!verifyRes.ok) throw new NetworkError('Passkey registration verification failed');
    const data = await verifyRes.json();
    return {
      user: data.user,
      accessToken: data.accessToken ?? data.access_token,
      refreshToken: data.refreshToken ?? data.refresh_token,
      expiresAt: data.expiresAt ?? data.expires_at,
    };
  }

  async function login(): Promise<PasskeyResponse> {
    const optionsRes = await fetch(loginOptionsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!optionsRes.ok) throw new NetworkError('Failed to get login options');
    const optionsData = await optionsRes.json();

    const publicKeyOptions: PublicKeyCredentialRequestOptions = {
      ...optionsData,
      challenge: base64urlToBuffer(optionsData.challenge),
      allowCredentials: optionsData.allowCredentials?.map((cred: { id: string; type: string }) => ({
        ...cred,
        id: base64urlToBuffer(cred.id),
      })),
    };
    const cred = (await navigator.credentials.get({
      publicKey: publicKeyOptions,
    })) as PublicKeyCredential | null;
    if (!cred) throw new Error('Passkey authentication was cancelled');
    const ass = cred.response as AuthenticatorAssertionResponse;

    const verifyRes = await fetch(loginVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: cred.id,
        rawId: bufferToBase64url(cred.rawId),
        type: cred.type,
        response: {
          authenticatorData: bufferToBase64url(ass.authenticatorData),
          clientDataJSON: bufferToBase64url(ass.clientDataJSON),
          signature: bufferToBase64url(ass.signature),
          userHandle: ass.userHandle ? bufferToBase64url(ass.userHandle) : null,
        },
      }),
    });
    if (!verifyRes.ok) throw new NetworkError('Passkey authentication verification failed');
    const data = await verifyRes.json();
    return {
      user: data.user,
      accessToken: data.accessToken ?? data.access_token,
      refreshToken: data.refreshToken ?? data.refresh_token,
      expiresAt: data.expiresAt ?? data.expires_at,
    };
  }
}

export const passkeyMethod = createPasskeyMethod();

/** @deprecated v0.7 alias. Will be removed in v1.0. */
export const PasskeyPlugin = createPasskeyMethod;

/** Check if WebAuthn / Passkey is available. */
export async function isPasskeySupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
