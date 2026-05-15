/**
 * @swr-login/react v0.9 - Public API.
 *
 * Plugin-as-Hook React bindings. Pairs with `@swr-login/core` v0.9.
 */

// ─── Provider ─────────────────────────────────────────────────
export { AuthHookRegistry, SWRLoginProvider } from './provider';

// ─── Hooks ────────────────────────────────────────────────────
export { useSession } from './hooks/useSession';
export type { UseSessionReturn } from './hooks/useSession';

export { useCredential } from './hooks/useCredential';
export { useAuthInternal } from './hooks/useAuthInternal';

export { useLoginMethods } from './hooks/useLoginMethods';
export type { UseLoginMethodsFilter } from './hooks/useLoginMethods';

export { useLoginMethod } from './hooks/useLoginMethod';

export { useSessionEvent } from './hooks/useSessionEvent';
export type { SessionEventHandler } from './hooks/useSessionEvent';

export { useLogout } from './hooks/useLogout';
export type { UseLogoutReturn } from './hooks/useLogout';

// ─── Components ───────────────────────────────────────────────
export { AuthGuard } from './components/AuthGuard';
export type { AuthGuardProps } from './components/AuthGuard';

export { Slot } from './components/Slot';
export type { SlotProps } from './components/Slot';

// ─── Re-export core types for convenience ─────────────────────
export type {
  AuthEvent,
  AuthEventKind,
  AuthHookRegistryProps,
  AuthInternalContext,
  BaseLoginMethodHandle,
  Credential,
  LoginMethod,
  LoginMethodMeta,
  SecurityConfig,
  SessionChangeEvent,
} from '@swr-login/core';
