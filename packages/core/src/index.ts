/**
 * @swr-login/core v0.9 - Plugin-as-Hook public API.
 *
 * Layer-1 primitives consumed by `@swr-login/react` and method packages.
 */

// ─── Types ────────────────────────────────────────────────────
export type {
  // Method
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
  // Migration aliases
  UserChangeEvent,
  UserChangeSource,
} from './types';

// ─── Errors ───────────────────────────────────────────────────
export {
  AuthError,
  NetworkError,
  InvalidCredentialsError,
  CSRFError,
  OAuthPopupError,
  MethodNotFoundError,
  DuplicateMethodIdError,
  LoginRejection,
} from './errors';

// ─── Core Classes ─────────────────────────────────────────────
export { EventBus } from './event-bus';
export { SessionStore } from './session-store';
export type { FetchSessionFn, SessionStoreOptions } from './session-store';
export {
  MethodRegistry,
  buildMethodRegistry,
  validateMethodId,
  checkIdSetStability,
  slotMatches,
  isMethodEnabled,
} from './method-registry';
export { BroadcastSync } from './broadcast-sync';
export type { BroadcastListener } from './broadcast-sync';

// ─── Method Authoring ─────────────────────────────────────────
export { defineLoginMethod, defineLazyLoginMethod } from './define-method';

// ─── Security Utilities ───────────────────────────────────────
export { generatePKCE, storePKCEVerifier, retrievePKCEVerifier } from './security/pkce';
export type { PKCECodePair } from './security/pkce';
export { generateCSRFState, validateCSRFState, clearCSRFStates } from './security/csrf';

// ─── Config Helpers ───────────────────────────────────────────
export { createAuthConfig } from './create-auth-config';

// ─── Utilities ────────────────────────────────────────────────
export {
  generateRandomString,
  base64urlEncode,
  sha256,
  isTokenExpired,
  generateTabId,
  safeJsonParse,
  noop,
} from './utils';
