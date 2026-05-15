/**
 * @swr-login/react - Internal React contexts (v0.9).
 *
 * Two contexts:
 *   - `AuthRegistryContext` — public-ish: holds `MethodRegistry`, `Credential`,
 *      session store, event bus, security config. Consumed by all public hooks.
 *   - `AuthInternalContextCtx` — exposes `AuthInternalContext` to method
 *      authors. The `useAuthInternal` hook adds dev-mode call-stack guards.
 *
 * The depth counter (`useMethodCallDepthRef`) is the heart of dev-mode
 * detection: `MethodSlot` increments before `method.use()` and decrements
 * after; `useAuthInternal` warns when depth === 0.
 */

import type {
  AuthInternalContext,
  Credential,
  EventBus,
  MethodRegistry,
  SecurityConfig,
  SessionStore,
} from '@swr-login/core';
import { type RefObject, createContext, useContext } from 'react';

/** @internal Mutable counter ref used by MethodSlot + useAuthInternal. */
export interface MethodCallDepthRef {
  current: number;
}

/** Registry-level context (cheap, no per-method state). */
export interface AuthRegistryContextValue {
  registry: MethodRegistry;
  credential: Credential;
  sessionStore: SessionStore;
  eventBus: EventBus;
  security: SecurityConfig | undefined;
  /** @internal */
  methodCallDepthRef: MethodCallDepthRef;
  /** @internal — handles map populated by MethodSlot for `useLoginMethod`. */
  handlesRef: RefObject<Map<string, unknown>>;
  /** @internal — registry-wide AbortController for `onRegistryMount`. */
  registryAbortRef: RefObject<AbortController | null>;
}

export const AuthRegistryContext = createContext<AuthRegistryContextValue | null>(null);

export function useAuthRegistryContext(): AuthRegistryContextValue {
  const ctx = useContext(AuthRegistryContext);
  if (!ctx) {
    throw new Error(
      '[swr-login] hooks must be used within <AuthHookRegistry>. ' +
        'Wrap your app with <AuthHookRegistry> first.',
    );
  }
  return ctx;
}

/**
 * Method-author context — exposes framework primitives to method authors.
 * Provided by the AuthHookRegistry. The `useAuthInternal` hook adds dev-mode
 * call-stack guards on top of `useContext(AuthInternalContextCtx)`.
 */
export const AuthInternalContextCtx = createContext<AuthInternalContext | null>(null);
