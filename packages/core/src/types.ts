/**
 * @module @swr-login/core
 * Core type definitions for swr-login authentication library.
 */

// ─── Auth State ──────────────────────────────────────────────

/** Authentication state machine states */
export type AuthState =
  | 'idle'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'unauthenticated'
  | 'error';

/** Auth state change event payload */
export interface AuthStateChange {
  from: AuthState;
  to: AuthState;
  timestamp: number;
}

// ─── User ────────────────────────────────────────────────────

/**
 * Base user type. Extend via generics for custom fields.
 *
 * @example
 * ```ts
 * interface MyUser extends User {
 *   company: string;
 *   department: string;
 * }
 * const { user } = useUser<MyUser>();
 * ```
 */
export interface User {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  roles?: string[];
  permissions?: string[];
  [key: string]: unknown;
}

// ─── Auth Response ───────────────────────────────────────────

/** Standardized response from any login plugin */
export interface AuthResponse {
  /** Authenticated user info */
  user: User;
  /** JWT access token */
  accessToken: string;
  /** Optional refresh token for silent renewal */
  refreshToken?: string;
  /** Token expiration timestamp (ms since epoch) */
  expiresAt: number;
}

// ─── Plugin System ───────────────────────────────────────────

/** Plugin type categories */
export type PluginType = 'password' | 'oauth' | 'otp' | 'magic-link' | 'web3' | 'passkey';

/** Context passed to plugins during lifecycle methods */
export interface PluginContext {
  /** Get current access token */
  getAccessToken: () => string | null;
  /** Get current refresh token */
  getRefreshToken: () => string | null;
  /** Store tokens after successful auth */
  setTokens: (tokens: {
    accessToken: string;
    refreshToken?: string;
    expiresAt: number;
  }) => void;
  /** Clear all stored tokens */
  clearTokens: () => void;
  /** Current window origin for postMessage validation */
  origin: string;
}

/**
 * Login plugin interface. All auth channel plugins must implement this.
 *
 * @typeParam TCredentials - Plugin-specific login credentials type
 *
 * @example
 * ```ts
 * const myPlugin: SWRLoginPlugin<{ username: string; password: string }> = {
 *   name: 'my-auth',
 *   type: 'password',
 *   async login(credentials, ctx) {
 *     const res = await fetch('/api/login', {
 *       method: 'POST',
 *       body: JSON.stringify(credentials),
 *     });
 *     return res.json();
 *   },
 * };
 * ```
 */
export interface SWRLoginPlugin<TCredentials = unknown> {
  /** Unique plugin identifier */
  name: string;
  /** Plugin category */
  type: PluginType;
  /** Optional initialization (e.g., load third-party SDK) */
  initialize?(ctx: PluginContext): void | Promise<void>;
  /** Execute login flow, return standardized auth response */
  login(credentials: TCredentials, ctx: PluginContext): Promise<AuthResponse>;
  /** Optional logout (e.g., clear third-party session) */
  logout?(ctx: PluginContext): Promise<void>;
}

// ─── Cache Adapter ───────────────────────────────────────────

/**
 * Cache adapter interface for decoupling from SWR.
 * Default implementation uses SWR; can be swapped for TanStack Query.
 */
export interface CacheAdapter {
  /** React Hook to access auth state */
  useAuth<T extends User = User>(): {
    user: T | null;
    isLoading: boolean;
    mutate: (data?: T | null) => Promise<void>;
  };
  /** Set user data in cache */
  setUser<T extends User = User>(user: T): Promise<void>;
  /** Clear user data from cache */
  clearUser(): Promise<void>;
  /** Force revalidation of user data */
  revalidate(): Promise<void>;
}

// ─── Token Adapter ───────────────────────────────────────────

/**
 * Token storage adapter interface.
 * Implementations: JWT (localStorage/sessionStorage/memory), Session, Cookie.
 */
export interface TokenAdapter {
  /** Retrieve stored access token */
  getAccessToken(): string | null;
  /** Store access token */
  setAccessToken(token: string): void;
  /** Retrieve stored refresh token */
  getRefreshToken(): string | null;
  /** Store refresh token */
  setRefreshToken(token: string): void;
  /** Retrieve token expiration timestamp */
  getExpiresAt(): number | null;
  /** Store token expiration timestamp */
  setExpiresAt(expiresAt: number): void;
  /** Clear all stored tokens */
  clear(): void;
}

// ─── Config ──────────────────────────────────────────────────

/** Security configuration options */
export interface SecurityConfig {
  /** Enable cross-tab sync via BroadcastChannel (default: true) */
  enableBroadcastSync?: boolean;
  /** Clear tokens when page is hidden (default: false) */
  clearOnHidden?: boolean;
  /** Delay before clearing tokens on hidden (ms, default: 300000) */
  clearOnHiddenDelay?: number;
}

/**
 * SWRLoginProvider configuration.
 *
 * @example
 * ```tsx
 * <SWRLoginProvider
 *   config={{
 *     adapter: JWTAdapter({ storage: 'localStorage' }),
 *     plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
 *     fetchUser: (token) => fetch('/api/me', {
 *       headers: { Authorization: `Bearer ${token}` },
 *     }).then(r => r.json()),
 *   }}
 * >
 *   <App />
 * </SWRLoginProvider>
 * ```
 */
export interface SWRLoginConfig {
  /** Token storage adapter */
  adapter: TokenAdapter;
  /** Registered auth plugins */
  plugins: SWRLoginPlugin[];
  /** Optional: custom function to fetch user data using access token */
  fetchUser?: (token: string) => Promise<User>;
  /** Optional: custom cache adapter (default: SWR) */
  cacheAdapter?: CacheAdapter;
  /** Callback fired after successful login */
  onLogin?: (user: User) => void;
  /** Callback fired after logout */
  onLogout?: () => void;
  /** Callback fired on auth errors */
  onError?: (error: Error) => void;
  /** Security options */
  security?: SecurityConfig;
}

// ─── Events ──────────────────────────────────────────────────

/** Auth event types */
export type AuthEventType =
  | 'login'
  | 'logout'
  | 'refresh'
  | 'error'
  | 'state-change'
  | 'token-expired';

/** Auth event payloads */
export interface AuthEventMap {
  login: { user: User };
  logout: undefined;
  refresh: { accessToken: string; expiresAt: number };
  error: { error: Error };
  'state-change': AuthStateChange;
  'token-expired': undefined;
}

// ─── Broadcast ───────────────────────────────────────────────

/** Cross-tab broadcast message types */
export type BroadcastMessageType = 'LOGIN' | 'LOGOUT' | 'TOKEN_REFRESH';

/** Cross-tab broadcast message */
export interface BroadcastMessage {
  type: BroadcastMessageType;
  payload?: unknown;
  timestamp: number;
  tabId: string;
}
