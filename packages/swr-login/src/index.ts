/**
 * swr-login v0.9 — Unified entry package.
 *
 * Re-exports `@swr-login/core` and `@swr-login/react` public APIs.
 *
 * Method and adapter packages are available via sub-path imports:
 *   import { passwordMethod } from 'swr-login/methods/password'
 *   import { jwtCredential }  from 'swr-login/adapters/jwt'
 */

// ─── Core ─────────────────────────────────────────────────────
export {
  // Errors
  LoginRejection,
  AuthError,
  NetworkError,
  InvalidCredentialsError,
  CSRFError,
  OAuthPopupError,
  MethodNotFoundError,
  DuplicateMethodIdError,
  // Core classes
  EventBus,
  SessionStore,
  MethodRegistry,
  BroadcastSync,
  // Method authoring helpers
  defineLoginMethod,
  defineLazyLoginMethod,
  // Registry utilities
  buildMethodRegistry,
  validateMethodId,
  checkIdSetStability,
  slotMatches,
  isMethodEnabled,
  // Security utilities
  generatePKCE,
  storePKCEVerifier,
  retrievePKCEVerifier,
  generateCSRFState,
  validateCSRFState,
  clearCSRFStates,
  // Utilities
  generateRandomString,
  base64urlEncode,
  sha256,
  isTokenExpired,
  generateTabId,
  safeJsonParse,
  noop,
  // Config helpers
  createAuthConfig,
} from '@swr-login/core';

export type {
  // Method contract
  LoginMethod,
  LoginMethodMeta,
  BaseLoginMethodHandle,
  // Credential
  Credential,
  // Internal context
  AuthInternalContext,
  // Events
  AuthEvent,
  AuthEventKind,
  SessionChangeEvent,
  // Session store
  SessionStatus,
  SessionSnapshot,
  // Registry props
  AuthHookRegistryProps,
  SecurityConfig,
  // Session store options
  FetchSessionFn,
  SessionStoreOptions,
  // PKCE
  PKCECodePair,
  // Broadcast
  BroadcastListener,
  // Migration aliases
  UserChangeEvent,
  UserChangeSource,
} from '@swr-login/core';

// ─── React ────────────────────────────────────────────────────
export {
  // Provider
  AuthHookRegistry,
  /** @deprecated Use AuthHookRegistry. */
  SWRLoginProvider,
  // Hooks
  useSession,
  useCredential,
  useAuthInternal,
  useLoginMethods,
  useLoginMethod,
  useSessionEvent,
  useLogout,
  // Components
  AuthGuard,
  Slot,
} from '@swr-login/react';

export type {
  UseSessionReturn,
  UseLoginMethodsFilter,
  SessionEventHandler,
  UseLogoutReturn,
  AuthGuardProps,
  SlotProps,
} from '@swr-login/react';
