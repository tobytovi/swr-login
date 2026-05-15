/**
 * @swr-login/core - Public type system (v0.9 Plugin-as-Hook).
 *
 * Source of truth for the framework contract. Mirrors RFC §15 附录.
 */

// ─── Method ───────────────────────────────────────────────

/**
 * Base shape of the handle returned by `LoginMethod.use()`.
 *
 * - `submit` is **optional**: redirect-based or multi-step methods may omit it
 *   and expose method-specific fields instead.
 * - `state` is the unified UI state across all methods.
 */
export interface BaseLoginMethodHandle<TInput = unknown, TResult = unknown> {
  submit?: (input: TInput) => Promise<TResult>;
  state: 'idle' | 'pending' | 'success' | 'error';
  error?: import('./errors').LoginRejection | Error;
  reset(): void;
  cancel?(): void;
}

/**
 * Login method metadata used by Slot resolution and registry filtering.
 *
 * - `slot` accepts string OR string[] (a method may render in multiple slots).
 * - `enabled` / `env` are evaluated lazily by `useLoginMethods({ enabledOnly })`.
 */
export interface LoginMethodMeta {
  label: string | (() => string);
  icon?: string | import('react').ComponentType<{ size?: number }>;
  order?: number;
  slot?: string | string[];
  enabled?: boolean | (() => boolean);
  env?: ('production' | 'development' | 'test')[];
  multiStep?: boolean;
  extra?: Record<string, unknown>;
}

/**
 * Three-generic LoginMethod: the central contract of v0.9.
 *
 * - `use()` MUST follow React Hook rules.
 * - `onRegistryMount` runs **before any use()** is invoked, in `methods` array
 *   order, awaited serially. Rejections are caught and reported via
 *   `publishEvent({ kind: 'external', payload: error })`. Returning a cleanup
 *   function is honored on Registry unmount.
 *
 * @example
 * ```ts
 * const passwordMethod: LoginMethod<PasswordInput, PasswordResult, PasswordHandle> = {
 *   id: 'swr-login/password',
 *   meta: { label: '账号密码', slot: 'primary' },
 *   use(): PasswordHandle { ... },
 * };
 * ```
 */
export interface LoginMethod<
  TInput = unknown,
  TResult = unknown,
  THandle extends BaseLoginMethodHandle<TInput, TResult> = BaseLoginMethodHandle<TInput, TResult>,
> {
  readonly id: string;
  readonly meta: LoginMethodMeta;
  use(): THandle;
  onRegistryMount?: (internal: AuthInternalContext) => OnRegistryMountResult;
}

/**
 * Return value from `onRegistryMount`. Can be:
 *   - a cleanup function (called on Registry unmount)
 *   - undefined / void (no cleanup)
 *   - a Promise resolving to either of the above (async onRegistryMount)
 */
// biome-ignore lint/suspicious/noConfusingVoidType: void needed for async fn compatibility
export type OnRegistryMountResult =
  | (() => void)
  | undefined
  // biome-ignore lint/suspicious/noConfusingVoidType: void needed for async fn compatibility
  | Promise<(() => void) | undefined | void>;

// ─── Credential v1.0 ──────────────────────────────────────

/**
 * Credential v1.0 — pluggable authentication storage contract.
 *
 * Replaces v0.7 `TokenAdapter`. Implementations:
 *   - `@swr-login/adapter-jwt` — localStorage tokens
 *   - `@swr-login/adapter-cookie` — HTTP-only cookie session
 *   - `@swr-login/adapter-session` — sessionStorage tokens
 */
export interface Credential {
  readonly version: '1.0';
  /** Synchronous probe — must NOT perform I/O. */
  hasAuth(): boolean;
  /** Drop persisted credential. */
  clear(): Promise<void>;
  /** Optional: bearer token accessor for HTTP authorization headers. */
  getAccessToken?(): string | null;
  /**
   * Subscribe to credential mutations (e.g. cross-tab sync, manual refresh).
   * Return an unsubscribe function.
   */
  subscribe(listener: () => void): () => void;
  /**
   * Optional: 401 interceptor entry-point. When invoked, the framework will
   * publish `{ kind: 'session_lost' }` and clear local session state.
   */
  onExpire?: () => void;
}

// ─── Internal Context (exposed via useAuthInternal) ────────

/**
 * Framework primitives exposed to method authors.
 *
 * MUST only be accessed inside `LoginMethod.use()` or `onRegistryMount`.
 * Dev-mode warns if `useAuthInternal()` is called outside method scope.
 */
export interface AuthInternalContext {
  credential: Credential;
  /** Re-fetch session via `fetchSession`. */
  refreshSession: () => Promise<void>;
  /** Publish an auth event to all subscribers (logged-in tabs included). */
  publishEvent: (event: AuthEvent) => void;
  /** Aborted when the entire `<AuthHookRegistry>` unmounts. */
  registrySignal: AbortSignal;
  /**
   * Create a method-scoped AbortController. Recommended for in-flight
   * `submit()` cancellation.
   */
  createMethodAbort: () => AbortController;
}

// ─── Events ───────────────────────────────────────────────

export type AuthEventKind = 'login' | 'logout' | 'session_lost' | 'session_refresh' | 'external';

export interface AuthEvent {
  kind: AuthEventKind;
  methodId?: string;
  payload?: unknown;
  /** Auto-injected by event-bus when omitted. */
  timestamp: number;
}

/**
 * High-level event delivered to `onSessionChange` and `useSessionEvent`.
 * Carries the user transition delta in addition to the raw event metadata.
 */
export interface SessionChangeEvent {
  kind: AuthEventKind;
  user: unknown | null;
  previousUser: unknown | null;
  methodId?: string;
  timestamp: number;
}

// ─── Session Store ────────────────────────────────────────

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionSnapshot<TUser = unknown> {
  user: TUser | null;
  status: SessionStatus;
}

// ─── Registry Props ───────────────────────────────────────

/**
 * Cross-tab sync / hidden-clear configuration.
 */
export interface SecurityConfig {
  enableBroadcastSync?: boolean;
  clearOnHidden?: boolean;
  broadcastChannel?: string;
}

/**
 * Props for `<AuthHookRegistry>` (formerly `<SWRLoginProvider>`).
 *
 * - `methods` — declarative array; ID set MUST be stable across renders.
 * - `fetchSession` — called after every successful login / refresh.
 * - `onSessionChange` — sync OR async; awaited if a Promise is returned.
 */
export interface AuthHookRegistryProps {
  credential: Credential;
  methods: LoginMethod[];
  fetchSession?: (token: { accessToken: string | null }) => Promise<unknown>;
  onSessionChange?: (event: SessionChangeEvent) => void | Promise<void>;
  security?: SecurityConfig;
  children: import('react').ReactNode;
}

// ─── Re-export legacy-friendly type aliases for migration ──

/** @deprecated Use `SessionChangeEvent`. Will be removed in v1.0. */
export type UserChangeEvent = SessionChangeEvent;
/** @deprecated Use `AuthEventKind`. Will be removed in v1.0. */
export type UserChangeSource = AuthEventKind;
