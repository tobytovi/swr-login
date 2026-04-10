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
export type PluginType =
  | 'password'
  | 'oauth'
  | 'otp'
  | 'magic-link'
  | 'web3'
  | 'passkey'
  | 'multi-step';

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

// ─── Multi-Step Plugin ────────────────────────────────────────

/**
 * 单个登录步骤定义。
 * 每个步骤接收上一步的输出（或初始凭证）作为输入，返回数据传递给 UI 或下一步。
 *
 * @typeParam TInput - 步骤输入类型
 * @typeParam TOutput - 步骤输出类型
 */
export interface LoginStep<TInput = unknown, TOutput = unknown> {
  /** 步骤唯一名称，用于 UI 路由（如 'verify-code'、'select-student'） */
  name: string;
  /** 执行步骤逻辑 */
  execute(input: TInput, ctx: PluginContext): Promise<TOutput>;
}

/**
 * 多步骤登录插件接口。
 * 支持声明式定义多步骤流程，每个步骤之间可以有 UI 交互和页面跳转。
 *
 * 适用场景：班级码登录、MFA、短信验证码、企业 SSO + 部门选择等。
 *
 * @typeParam TInitialInput - 第一步的输入类型（初始凭证）
 *
 * @example
 * ```ts
 * const classCodePlugin: MultiStepLoginPlugin<{ classCode: string }> = {
 *   name: 'class-code',
 *   type: 'multi-step',
 *   steps: [
 *     { name: 'verify-code', execute: async (input, ctx) => { ... } },
 *     { name: 'select-student', execute: async (input, ctx) => { ... } },
 *     { name: 'get-token', execute: async (input, ctx) => { ... } },
 *   ],
 *   async finalizeAuth(lastStepOutput, ctx) { ... },
 *   async login(credentials, ctx) {
 *     throw new Error('Use useMultiStepLogin() for multi-step plugins');
 *   },
 * };
 * ```
 */
export interface MultiStepLoginPlugin<TInitialInput = unknown>
  extends SWRLoginPlugin<TInitialInput> {
  type: 'multi-step';
  /** 声明所有步骤（按顺序执行） */
  steps: LoginStep[];
  /**
   * 最终步骤完成后，将结果转换为 AuthResponse。
   * 如果不提供，则最后一个步骤的输出必须符合 AuthResponse 格式。
   */
  finalizeAuth?(lastStepOutput: unknown, ctx: PluginContext): Promise<AuthResponse>;
}

/**
 * 类型守卫：判断插件是否为多步骤插件。
 */
export function isMultiStepPlugin(plugin: SWRLoginPlugin): plugin is MultiStepLoginPlugin {
  return plugin.type === 'multi-step' && 'steps' in plugin;
}

// ─── Auth Injector ───────────────────────────────────────────

/**
 * 从外部注入登录态到 swr-login 体系。
 * 适用于多步骤登录、第三方 SDK 登录等无法通过插件 login() 完成的场景。
 */
export interface AuthInjector {
  /**
   * 注入外部登录态，使 swr-login 全局状态感知到登录。
   * 会自动触发 token 存储、状态机转换、事件发射和缓存更新。
   */
  injectAuth(response: AuthResponse): Promise<void>;

  /**
   * 从外部触发登出，清除所有登录态。
   */
  injectLogout(): Promise<void>;
}

// ─── After Auth Context ──────────────────────────────────────

/**
 * Context passed to the `afterAuth` hook after a successful plugin login,
 * before `fetchUser` is called.
 *
 * Use this to perform role-based validation, redirect logic, analytics,
 * or to skip `fetchUser` entirely for certain login flows.
 */
export interface AfterAuthContext {
  /** Name of the plugin that performed the login */
  pluginName: string;
  /** The AuthResponse returned by the plugin's login() method */
  authResponse: AuthResponse;
  /**
   * Call this to skip the subsequent `fetchUser` call.
   * When called, `login()` will resolve immediately with the AuthResponse
   * without invoking `fetchUser` or writing user data to the SWR cache.
   */
  skipFetchUser: () => void;
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
  /**
   * Hook invoked after a successful plugin login, before `fetchUser` is called.
   *
   * Use this to perform role-based validation, redirect to a different app,
   * or skip `fetchUser` for certain login flows.
   *
   * - Return normally → continue to `fetchUser` (if configured)
   * - Call `context.skipFetchUser()` → skip `fetchUser`, `login()` resolves immediately
   * - Throw an error → tokens are cleared, `login()` rejects with that error
   *
   * Only runs during `login()` calls, not during SWR background revalidation.
   *
   * @example
   * ```ts
   * afterAuth: async ({ pluginName, authResponse, skipFetchUser }) => {
   *   if (pluginName === 'coding-password') {
   *     const role = await checkUserRole(authResponse.accessToken);
   *     if (role === 'teacher') {
   *       skipFetchUser(); // teachers don't need studentInfoGet
   *       window.location.href = '/teacher-admin';
   *       return;
   *     }
   *   }
   *   // default: continue to fetchUser
   * },
   * ```
   */
  afterAuth?: (context: AfterAuthContext) => Promise<void>;
  /**
   * Whether to automatically call `fetchUser` after a successful plugin login
   * to validate the user's status before considering the login complete.
   *
   * When enabled (default), `login()` will reject if `fetchUser` throws,
   * allowing you to catch "account disabled" or similar errors in one place.
   *
   * @default true
   */
  validateUserOnLogin?: boolean;
  /**
   * Callback invoked when `fetchUser` throws an error (both during login
   * validation and SWR background revalidation).
   *
   * Return a strategy string to control how the framework handles the error:
   * - `'retry'`  — Re-invoke `fetchUser` once (max 1 retry to prevent loops).
   * - `'logout'` — Clear tokens and transition to `unauthenticated`.
   * - `'ignore'` — Keep current state; the error is stored in `lastError`.
   *
   * If not provided, the default SWR behavior applies (`shouldRetryOnError: false`,
   * error is passed through to `useUser().error`).
   */
  onFetchUserError?: (error: Error) => 'retry' | 'logout' | 'ignore';
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
