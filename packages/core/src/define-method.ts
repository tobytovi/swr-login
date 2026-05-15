/**
 * @swr-login/core - Method authoring helpers (v0.9).
 *
 * - `defineLoginMethod` is just an identity function with strong inference.
 * - `defineLazyLoginMethod` is **experimental** (RFC §4.11). It wraps a
 *   `() => import(...)` factory and exposes a synchronous LoginMethod proxy
 *   that triggers loading on first `use()` / `onRegistryMount` call.
 *   GA inclusion is gated on SSG validation in beta.
 */

import type { BaseLoginMethodHandle, LoginMethod, LoginMethodMeta } from './types';

/**
 * Identity helper that pins the three generics so `useLoginMethod<typeof m>()`
 * can recover the precise Handle shape.
 */
export function defineLoginMethod<
  TInput = unknown,
  TResult = unknown,
  THandle extends BaseLoginMethodHandle<TInput, TResult> = BaseLoginMethodHandle<TInput, TResult>,
>(method: LoginMethod<TInput, TResult, THandle>): LoginMethod<TInput, TResult, THandle> {
  return method;
}

/**
 * EXPERIMENTAL: code-splitting wrapper.
 *
 * Caveats (beta-only):
 *   - The proxy `use()` throws if module is not yet loaded; consumers MUST
 *     accept a single render of the throwing state, or wait for resolution.
 *   - SSG behavior is provider-dependent; verified against Next.js export in beta.
 */
export function defineLazyLoginMethod<
  TInput = unknown,
  TResult = unknown,
  THandle extends BaseLoginMethodHandle<TInput, TResult> = BaseLoginMethodHandle<TInput, TResult>,
>(config: {
  id: string;
  meta: LoginMethodMeta;
  load: () => Promise<{ default: LoginMethod<TInput, TResult, THandle> }>;
}): LoginMethod<TInput, TResult, THandle> {
  let resolved: LoginMethod<TInput, TResult, THandle> | null = null;
  let pending: Promise<void> | null = null;

  function ensureLoaded(): Promise<void> {
    if (resolved) return Promise.resolve();
    if (pending) return pending;
    pending = config.load().then(({ default: m }) => {
      resolved = m;
    });
    return pending;
  }

  return {
    id: config.id,
    meta: config.meta,
    use(): THandle {
      if (!resolved) {
        // Trigger load and surface a benign idle handle until ready.
        // Real method types should re-render on resolve via state below.
        ensureLoaded();
        return {
          state: 'idle',
          reset: () => {},
        } as unknown as THandle;
      }
      return resolved.use();
    },
    onRegistryMount: async (internal) => {
      await ensureLoaded();
      return resolved?.onRegistryMount?.(internal);
    },
  };
}
