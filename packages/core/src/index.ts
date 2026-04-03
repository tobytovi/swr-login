// ─── Types ────────────────────────────────────────────────────
export type {
  AuthState,
  AuthStateChange,
  User,
  AuthResponse,
  PluginType,
  PluginContext,
  SWRLoginPlugin,
  LoginStep,
  MultiStepLoginPlugin,
  AuthInjector,
  CacheAdapter,
  TokenAdapter,
  SWRLoginConfig,
  SecurityConfig,
  AuthEventType,
  AuthEventMap,
  BroadcastMessageType,
  BroadcastMessage,
} from './types';
export { isMultiStepPlugin } from './types';

// ─── Errors ───────────────────────────────────────────────────
export {
  AuthError,
  NetworkError,
  TokenExpiredError,
  TokenRefreshError,
  PluginNotFoundError,
  PluginInitError,
  PluginTypeMismatchError,
  InvalidCredentialsError,
  CSRFError,
  OAuthPopupError,
  StepExecutionError,
  StepOutOfRangeError,
} from './errors';

// ─── Core Classes ─────────────────────────────────────────────
export { AuthEventEmitter } from './event-emitter';
export { AuthStateMachine } from './state-machine';
export { TokenManager } from './token-manager';
export type { RefreshFunction } from './token-manager';
export { PluginManager } from './plugin-manager';
export { BroadcastSync } from './broadcast-sync';

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
} from './utils';
