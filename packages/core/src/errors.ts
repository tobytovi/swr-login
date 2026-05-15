/**
 * @swr-login/core - Error hierarchy (v0.9).
 *
 * Reduced from v0.7's 12-class taxonomy to a focused set:
 *   - `AuthError` (base)
 *   - `NetworkError`, `CSRFError`, `OAuthPopupError`, `InvalidCredentialsError`
 *   - `MethodNotFoundError`, `DuplicateMethodIdError`
 *   - `LoginRejection` — the canonical method-throwable error
 *
 * Removed: `TokenRefreshError`, `TokenExpiredError`, `Step*`, `Plugin*Error`.
 * Token lifecycle now lives inside Credential implementations.
 */

/** Base class for all swr-login errors. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Network failure during login / refresh / fetchSession. */
export class NetworkError extends AuthError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

/** Server-rejected credentials (401 etc.). */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

/** OAuth state mismatch (CSRF protection). */
export class CSRFError extends AuthError {
  constructor(message = 'CSRF state validation failed') {
    super(message);
    this.name = 'CSRFError';
  }
}

/** OAuth popup blocked or closed by user. */
export class OAuthPopupError extends AuthError {
  constructor(message: string) {
    super(message);
    this.name = 'OAuthPopupError';
  }
}

/** Method id was not found in the registry. */
export class MethodNotFoundError extends AuthError {
  constructor(public readonly methodId: string) {
    super(`[swr-login] LoginMethod "${methodId}" was not found in the registry.`);
    this.name = 'MethodNotFoundError';
  }
}

/** Two methods with the same `id` were registered. */
export class DuplicateMethodIdError extends AuthError {
  constructor(public readonly methodId: string) {
    super(`[swr-login] Duplicate LoginMethod id "${methodId}" detected.`);
    this.name = 'DuplicateMethodIdError';
  }
}

/**
 * Canonical login failure thrown by `LoginMethod.use().submit()`.
 *
 * Carries both a machine-readable `code` (e.g. `ERR_PASSWORD_LOGIN_FAILED`)
 * and a semantic `reason` (e.g. `password_login_failed`) — see RFC §15.
 *
 * @example
 * ```ts
 * throw new LoginRejection('Account disabled', {
 *   code: 'ERR_ACCOUNT_DISABLED',
 *   reason: 'account_disabled',
 *   methodId: 'aidemy/coding-password',
 *   payload: { hint: 'contact admin' },
 * });
 * ```
 */
export class LoginRejection extends AuthError {
  /** Machine-readable error code (UPPER_SNAKE_CASE). */
  readonly code?: string;
  /** Semantic name (lower_snake_case). */
  readonly reason?: string;
  readonly methodId?: string;
  readonly originalError?: unknown;
  readonly payload?: unknown;

  constructor(
    message: string,
    options?: {
      code?: string;
      reason?: string;
      methodId?: string;
      cause?: unknown;
      payload?: unknown;
    },
  ) {
    super(message);
    this.name = 'LoginRejection';
    this.code = options?.code;
    this.reason = options?.reason;
    this.methodId = options?.methodId;
    this.originalError = options?.cause;
    this.payload = options?.payload;
    // Manually set cause for ES2020 targets (Error.cause introduced in ES2022)
    if (options?.cause !== undefined) {
      (this as { cause?: unknown }).cause = options.cause;
    }
  }

  /** Type guard. */
  static is(err: unknown): err is LoginRejection {
    return err instanceof LoginRejection;
  }
}
