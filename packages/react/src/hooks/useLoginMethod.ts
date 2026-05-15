/**
 * @swr-login/react - useLoginMethod (v0.9).
 *
 * Look up a method's handle by id. The method has already been invoked by
 * the parent `<MethodSlotList>`, so this hook is a synchronous map lookup
 * + a `useSyncExternalStore` re-render trigger when handle identity changes.
 *
 * Three-generic inference recovers the precise Handle:
 *
 * @example
 * ```ts
 * import type { passwordMethod } from './methods/password';
 * const handle = useLoginMethod<typeof passwordMethod>('aidemy/coding-password');
 * //    ^? PasswordHandle, includes resetPasswordRequired etc.
 * ```
 */

import { type LoginMethod, MethodNotFoundError } from '@swr-login/core';
import { useSyncExternalStore } from 'react';
import { useAuthRegistryContext } from '../context';

export function useLoginMethod<M extends LoginMethod>(id: string): ReturnType<M['use']> {
  const { handlesRef, registry } = useAuthRegistryContext();
  if (!registry.has(id)) {
    throw new MethodNotFoundError(id);
  }
  // We use a single global handles version channel; subscribe through the
  // sessionStore is too coarse. Instead expose a tiny dedicated mechanism:
  // `useSyncExternalStore` on the registry's handles map version counter
  // wired by AuthHookRegistry's setState.
  const handle = useSyncExternalStore(
    (listener) => {
      // Subscribe to handles map updates via an interval-free pattern: we
      // subscribe to the underlying React render flow by reading a counter
      // ref and re-running when it changes. This works because
      // `<AuthHookRegistry>` triggers a state update on each handle change.
      const off = handlesChangeBus.subscribe(listener);
      return off;
    },
    () => handlesRef.current?.get(id),
    () => undefined,
  );
  if (handle === undefined) {
    // First render before MethodSlot has populated the map. Caller may
    // render once with idle-default; we throw a clear error instead so
    // misuse (id typo) surfaces immediately.
    throw new MethodNotFoundError(id);
  }
  return handle as ReturnType<M['use']>;
}

/** @internal Tiny pub-sub used by `useLoginMethod` to coalesce re-renders. */
class HandlesChangeBus {
  private listeners = new Set<() => void>();
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  notify(): void {
    for (const fn of Array.from(this.listeners)) {
      try {
        fn();
      } catch {
        // ignore
      }
    }
  }
}

/** @internal Singleton bus consumed by `useLoginMethod` + `AuthHookRegistry`. */
export const handlesChangeBus = new HandlesChangeBus();
