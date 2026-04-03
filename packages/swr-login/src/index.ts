// ─── swr-login ────────────────────────────────────────────────
// Unified entry package for the swr-login ecosystem.
// Re-exports everything from @swr-login/core and @swr-login/react.
//
// Adapters and plugins are available via sub-path imports:
//   import { JWTAdapter } from 'swr-login/adapters/jwt'
//   import { PasswordPlugin } from 'swr-login/plugins/password'
// ──────────────────────────────────────────────────────────────

// ─── Core (types, errors, classes, utilities) ─────────────────
export {
  // Errors
  AuthError,
  NetworkError,
  TokenExpiredError,
  TokenRefreshError,
  PluginNotFoundError,
  PluginInitError,
  InvalidCredentialsError,
  CSRFError,
  OAuthPopupError,
  // Core Classes
  AuthEventEmitter,
  AuthStateMachine,
  TokenManager,
  PluginManager,
  BroadcastSync,
  // Config Helpers
  createAuthConfig,
  // Security Utilities
  generatePKCE,
  storePKCEVerifier,
  retrievePKCEVerifier,
  generateCSRFState,
  validateCSRFState,
  clearCSRFStates,
  // Multi-step
  isMultiStepPlugin,
  // Utilities
  generateRandomString,
  base64urlEncode,
  sha256,
  isTokenExpired,
  generateTabId,
  safeJsonParse,
} from '@swr-login/core';

export type {
  AuthState,
  AuthStateChange,
  User,
  AuthResponse,
  PluginType,
  PluginContext,
  SWRLoginPlugin,
  CacheAdapter,
  TokenAdapter,
  SWRLoginConfig,
  SecurityConfig,
  AuthEventType,
  AuthEventMap,
  BroadcastMessageType,
  BroadcastMessage,
  RefreshFunction,
  PKCECodePair,
  // Multi-step types
  LoginStep,
  MultiStepLoginPlugin,
  AuthInjector,
} from '@swr-login/core';

// ─── React (Provider, Hooks, Components) ──────────────────────
export {
  // Provider
  SWRLoginProvider,
  // Hooks
  useLogin,
  useMultiStepLogin,
  useAuthInjector,
  useUser,
  AUTH_KEY,
  useLogout,
  useSession,
  usePermission,
  // Components
  AuthGuard,
  // Context (advanced)
  useAuthContext,
} from '@swr-login/react';

export type {
  SWRLoginProviderProps,
  UseLoginReturn,
  UseLoginOptions,
  UseMultiStepLoginReturn,
  UseUserReturn,
  UseLogoutReturn,
  UseLogoutOptions,
  SessionInfo,
  UsePermissionReturn,
  AuthGuardProps,
  AuthContextValue,
} from '@swr-login/react';

// ─── Presets ──────────────────────────────────────────────────
export { presets } from './presets';

export type {
  BasePresetOptions,
  PasswordPresetOptions,
  SocialPresetOptions,
  SocialProviders,
  PasskeyPresetOptions,
  FullPresetOptions,
  FullPasswordConfig,
  FullPasskeyConfig,
} from './presets';
