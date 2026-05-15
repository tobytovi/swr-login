/**
 * @swr-login/method-mock v0.9 - Mock login method.
 *
 * Resolves to a configurable user object after a configurable delay.
 * Useful for local development, Storybook, and integration tests.
 */

import { type BaseLoginMethodHandle, type LoginMethod, defineLoginMethod } from '@swr-login/core';
import { useAuthInternal } from '@swr-login/react';
import { useState } from 'react';

export interface MockMethodConfig<TUser = { id: string; name: string }> {
  /** The user object resolved by `submit()`. */
  user?: TUser;
  /** Synthetic latency in milliseconds (default `100`). */
  delay?: number;
  /** Override the default token. */
  token?: string;
  /** Override the method id (default: `'swr-login/mock'`). */
  id?: string;
  /** Override the meta label (default: `'Mock login (dev)'`). */
  label?: string;
  slot?: string | string[];
}

export interface MockHandle<TUser> extends BaseLoginMethodHandle<undefined, TUser> {
  submit: (input?: undefined) => Promise<TUser>;
}

const DEFAULT_USER = { id: 'mock-user', name: 'Mock User' };
const DEFAULT_TOKEN = 'mock-token';

export function createMockMethod<TUser = typeof DEFAULT_USER>(
  config: MockMethodConfig<TUser> = {},
): LoginMethod<undefined, TUser, MockHandle<TUser>> {
  const {
    user = DEFAULT_USER as unknown as TUser,
    delay = 100,
    token = DEFAULT_TOKEN,
    id = 'local/mock',
    label = 'Mock login (dev)',
    slot = 'primary',
  } = config;

  return defineLoginMethod<undefined, TUser, MockHandle<TUser>>({
    id,
    meta: { label, slot, env: ['development', 'test'] },
    use(): MockHandle<TUser> {
      const { credential, refreshSession, publishEvent, createMethodAbort } = useAuthInternal();
      const [state, setState] = useState<MockHandle<TUser>['state']>('idle');

      const submit = async (): Promise<TUser> => {
        const ac = createMethodAbort();
        setState('pending');
        await new Promise((r) => setTimeout(r, delay));
        if (ac.signal.aborted) {
          setState('idle');
          throw new DOMException('aborted', 'AbortError');
        }
        const setter = (credential as { setTokens?: (t: { accessToken: string }) => void })
          .setTokens;
        if (typeof setter === 'function') setter({ accessToken: token });
        await refreshSession();
        publishEvent({ kind: 'login', methodId: id, timestamp: Date.now() });
        setState('success');
        return user;
      };

      return {
        submit,
        state,
        reset: () => setState('idle'),
      };
    },
  });
}

/** Zero-config default mock method (resolves to `{ id: 'mock-user' }`). */
export const mockMethod = createMockMethod();
