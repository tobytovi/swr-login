/**
 * @swr-login/react - useAuthInternal (v0.9).
 *
 * Method-author primitive. MUST be called inside `LoginMethod.use()` or
 * `onRegistryMount`. Dev-mode warns if called when method-call depth is 0.
 */

import type { AuthInternalContext } from '@swr-login/core';
import { useContext } from 'react';
import { AuthInternalContextCtx, useAuthRegistryContext } from '../context';

const isDev = (() => {
  const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
  return typeof proc !== 'undefined' && proc.env?.NODE_ENV !== 'production';
})();

let outsideCallWarned = false;

export function useAuthInternal(): AuthInternalContext {
  const ctx = useContext(AuthInternalContextCtx);
  if (!ctx) {
    throw new Error(
      '[swr-login] useAuthInternal must be called inside LoginMethod.use() (within <AuthHookRegistry>).',
    );
  }
  // Dev-mode call-stack-depth check: warn (once) when called outside method.use()
  if (isDev) {
    try {
      const { methodCallDepthRef } = useAuthRegistryContext();
      if (methodCallDepthRef.current === 0 && !outsideCallWarned) {
        outsideCallWarned = true;
        console.warn(
          '[swr-login] useAuthInternal() was called outside LoginMethod.use(). ' +
            'It is intended to be a method-author primitive — application code should ' +
            'use useSession / useCredential / useSessionEvent instead.',
        );
      }
    } catch {
      // Outside registry context entirely — fall through (the throw above would have caught it).
    }
  }
  return ctx;
}
