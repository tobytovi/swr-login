/**
 * @swr-login/method-password v0.9 - Username/password login method.
 *
 * Both a factory function (`createPasswordMethod(config)`) and a
 * zero-config default instance (`passwordMethod`) are exported per
 * RFC §6.3 (official-method requirement).
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

export interface PasswordCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface PasswordResponse {
  user: unknown;
  accessToken: string;
  refreshToken?: string;
  /** Unix epoch milliseconds. */
  expiresAt?: number;
}

export interface PasswordHandle
  extends BaseLoginMethodHandle<PasswordCredentials, PasswordResponse> {
  submit: (input: PasswordCredentials) => Promise<PasswordResponse>;
}

export interface PasswordMethodConfig {
  /** Login API endpoint. Default: `'/api/auth/login'`. */
  loginUrl?: string;
  /** Optional logout API endpoint. */
  logoutUrl?: string;
  /** Custom fetch options merged into the request. */
  fetchOptions?: RequestInit;
  /** Transform server response into `PasswordResponse`. */
  transformResponse?: (data: unknown) => PasswordResponse;
  /**
   * Custom error mapper. When omitted, network/4xx errors are translated to
   * `LoginRejection` with `code: 'ERR_PASSWORD_LOGIN_FAILED'`.
   */
  translateError?: (raw: unknown) => LoginRejection;
  /**
   * Override the method id (default: `'swr-login/password'`). Useful for
   * vendor-namespaced derivatives.
   */
  id?: string;
  /** Override the meta label (default: `'Username & password'`). */
  label?: string;
  slot?: string | string[];
  order?: number;
}

const METHOD_ID_DEFAULT = 'swr-login/password';

/**
 * Create a configured password login method.
 *
 * @example
 * ```ts
 * import { createPasswordMethod } from '@swr-login/method-password';
 *
 * export const passwordMethod = createPasswordMethod({
 *   loginUrl: '/api/auth/login',
 * });
 * ```
 */
export function createPasswordMethod(
  config: PasswordMethodConfig = {},
): LoginMethod<PasswordCredentials, PasswordResponse, PasswordHandle> {
  const {
    loginUrl = '/api/auth/login',
    logoutUrl,
    fetchOptions = {},
    transformResponse,
    translateError,
    id = METHOD_ID_DEFAULT,
    label = 'Username & password',
    slot = 'primary',
    order,
  } = config;

  // logoutUrl is informational; useLogout() calls credential.clear() locally.
  // A future hook could allow methods to declare a server-side logout endpoint.
  void logoutUrl;

  return defineLoginMethod<PasswordCredentials, PasswordResponse, PasswordHandle>({
    id,
    meta: {
      label,
      slot,
      order,
    },
    use(): PasswordHandle {
      const { credential, refreshSession, publishEvent, createMethodAbort } = useAuthInternal();
      const [state, setState] = useState<PasswordHandle['state']>('idle');
      const [error, setError] = useState<LoginRejection | Error | undefined>();

      const submit = async (input: PasswordCredentials): Promise<PasswordResponse> => {
        const ac = createMethodAbort();
        setState('pending');
        setError(undefined);
        try {
          const res = await fetch(loginUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...((fetchOptions.headers as Record<string, string>) ?? {}),
            },
            body: JSON.stringify(input),
            credentials: 'include',
            signal: ac.signal,
            ...fetchOptions,
          });
          if (!res.ok) {
            throw new NetworkError(`Login failed: ${res.statusText}`);
          }
          const raw = await res.json();
          const auth = transformResponse
            ? transformResponse(raw)
            : ({
                user: raw.user,
                accessToken: raw.accessToken ?? raw.access_token ?? raw.token,
                refreshToken: raw.refreshToken ?? raw.refresh_token,
                expiresAt: raw.expiresAt ?? raw.expires_at,
              } as PasswordResponse);

          // Persist tokens via the credential adapter when supported.
          const setter = (
            credential as Credential & {
              setTokens?: (t: {
                accessToken: string;
                refreshToken?: string;
                expiresAt?: number;
              }) => void;
            }
          ).setTokens;
          if (typeof setter === 'function') {
            setter({
              accessToken: auth.accessToken,
              refreshToken: auth.refreshToken,
              expiresAt: auth.expiresAt,
            });
          }

          await refreshSession();
          publishEvent({
            kind: 'login',
            methodId: id,
            payload: { username: input.username },
            timestamp: Date.now(),
          });
          setState('success');
          return auth;
        } catch (err) {
          if ((err as { name?: string })?.name === 'AbortError') {
            setState('idle');
            throw err;
          }
          const rejection = translateError
            ? translateError(err)
            : LoginRejection.is(err)
              ? err
              : new LoginRejection('Password login failed', {
                  code: 'ERR_PASSWORD_LOGIN_FAILED',
                  reason: 'password_login_failed',
                  methodId: id,
                  cause: err,
                });
          setError(rejection);
          setState('error');
          throw rejection;
        }
      };

      const reset = () => {
        setError(undefined);
        setState('idle');
      };

      return {
        submit,
        state,
        error,
        reset,
        cancel: () => {
          // Submit-scoped abort is method-internal; consumers cancel by reset.
          reset();
        },
      };
    },
    onRegistryMount: undefined,
  });
}

/**
 * Zero-config default password method. Targets `/api/auth/login`.
 *
 * @example
 * ```ts
 * import { passwordMethod } from '@swr-login/method-password';
 * <AuthHookRegistry methods={[passwordMethod]} ... />
 * ```
 */
export const passwordMethod = createPasswordMethod();

// Type aliases for ergonomic re-export
type Credential = import('@swr-login/core').Credential;

/** @deprecated v0.7 alias. Will be removed in v1.0. */
export const PasswordPlugin = createPasswordMethod;
