/**
 * Base authentication error class.
 * All swr-login errors extend this for consistent error handling.
 */
export class AuthError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/** Thrown when a network request fails */
export class NetworkError extends AuthError {
  public readonly statusCode?: number;

  constructor(message = 'Network request failed', statusCode?: number) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/** Thrown when access token has expired */
export class TokenExpiredError extends AuthError {
  constructor(message = 'Access token has expired') {
    super(message, 'TOKEN_EXPIRED');
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

/** Thrown when token refresh fails */
export class TokenRefreshError extends AuthError {
  constructor(message = 'Failed to refresh token') {
    super(message, 'TOKEN_REFRESH_FAILED');
    this.name = 'TokenRefreshError';
    Object.setPrototypeOf(this, TokenRefreshError.prototype);
  }
}

/** Thrown when a requested plugin is not found */
export class PluginNotFoundError extends AuthError {
  public readonly pluginName: string;

  constructor(pluginName: string) {
    super(`Plugin "${pluginName}" is not registered`, 'PLUGIN_NOT_FOUND');
    this.name = 'PluginNotFoundError';
    this.pluginName = pluginName;
    Object.setPrototypeOf(this, PluginNotFoundError.prototype);
  }
}

/** Thrown when plugin initialization fails */
export class PluginInitError extends AuthError {
  public readonly pluginName: string;
  public readonly originalError?: Error;

  constructor(pluginName: string, cause?: Error) {
    super(
      `Plugin "${pluginName}" failed to initialize${cause ? `: ${cause.message}` : ''}`,
      'PLUGIN_INIT_FAILED',
    );
    this.name = 'PluginInitError';
    this.pluginName = pluginName;
    this.originalError = cause;
    Object.setPrototypeOf(this, PluginInitError.prototype);
  }
}

/** Thrown when login credentials are invalid */
export class InvalidCredentialsError extends AuthError {
  constructor(message = 'Invalid credentials') {
    super(message, 'INVALID_CREDENTIALS');
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

/** Thrown when CSRF validation fails */
export class CSRFError extends AuthError {
  constructor(message = 'CSRF validation failed') {
    super(message, 'CSRF_ERROR');
    this.name = 'CSRFError';
    Object.setPrototypeOf(this, CSRFError.prototype);
  }
}

/** Thrown when OAuth popup is blocked or closed */
export class OAuthPopupError extends AuthError {
  constructor(message = 'OAuth popup was blocked or closed by user') {
    super(message, 'OAUTH_POPUP_ERROR');
    this.name = 'OAuthPopupError';
    Object.setPrototypeOf(this, OAuthPopupError.prototype);
  }
}

/** Thrown when a plugin type does not match the expected type */
export class PluginTypeMismatchError extends AuthError {
  public readonly pluginName: string;

  constructor(pluginName: string, expectedType: string) {
    super(`Plugin "${pluginName}" is not a ${expectedType} plugin`, 'PLUGIN_TYPE_MISMATCH');
    this.name = 'PluginTypeMismatchError';
    this.pluginName = pluginName;
    Object.setPrototypeOf(this, PluginTypeMismatchError.prototype);
  }
}

/** Thrown when a multi-step login step execution fails */
export class StepExecutionError extends AuthError {
  public readonly pluginName: string;
  public readonly stepIndex: number;
  public readonly stepName: string;
  public readonly originalError?: Error;

  constructor(pluginName: string, stepIndex: number, stepName: string, cause?: Error) {
    super(
      `Step "${stepName}" (index ${stepIndex}) of plugin "${pluginName}" failed${cause ? `: ${cause.message}` : ''}`,
      'STEP_EXECUTION_FAILED',
    );
    this.name = 'StepExecutionError';
    this.pluginName = pluginName;
    this.stepIndex = stepIndex;
    this.stepName = stepName;
    this.originalError = cause;
    Object.setPrototypeOf(this, StepExecutionError.prototype);
  }
}

/**
 * Unified business-defined login rejection.
 *
 * Returned (or thrown) by the user-supplied `translateLoginError` hook to
 * signal a *terminal, business-level* failure of the login flow. Once the
 * library observes a `LoginRejection`, it guarantees the following:
 *
 *   1. The error is propagated as the rejection value of `login()` /
 *      multi-step finalize without any further wrapping.
 *   2. Tokens are cleared via the `TokenManager`.
 *   3. The state machine is transitioned to `unauthenticated`.
 *   4. The SWR-side `onFetchUserError` callback is *not* invoked for this
 *      error (preventing double handling).
 *
 * The `payload` field is opaque to the library — consumers attach whatever
 * structured data their UI layer needs (reason codes, variants, i18n keys, …).
 *
 * `instanceof` checks remain reliable across bundle boundaries thanks to the
 * explicit `Object.setPrototypeOf` call.
 *
 * @example
 * ```ts
 * translateLoginError: (err, ctx) => {
 *   const variant = (ctx.loginContext as { variant?: 'teacher' | 'student' })?.variant;
 *   if (matchHttpCode(err) === 113) {
 *     return new LoginRejection(
 *       variant === 'student' ? 'Account disabled — please contact your teacher'
 *                              : 'Account disabled — please contact your administrator',
 *       { reason: 'account_disabled', variant, code: 113 }
 *     );
 *   }
 *   return null;
 * }
 * ```
 */
export class LoginRejection extends Error {
  /** Type guard that survives cross-bundle realm boundaries. */
  static is(e: unknown): e is LoginRejection {
    return e instanceof LoginRejection;
  }

  /** Opaque, business-defined payload. The library never inspects this. */
  public readonly payload?: unknown;

  constructor(message: string, payload?: unknown) {
    super(message);
    this.name = 'LoginRejection';
    this.payload = payload;
    Object.setPrototypeOf(this, LoginRejection.prototype);
  }
}

/** Thrown when step index is out of range */
export class StepOutOfRangeError extends AuthError {
  public readonly pluginName: string;
  public readonly stepIndex: number;
  public readonly totalSteps: number;

  constructor(pluginName: string, stepIndex: number, totalSteps: number) {
    super(
      `Step index ${stepIndex} is out of range for plugin "${pluginName}" (total steps: ${totalSteps})`,
      'STEP_OUT_OF_RANGE',
    );
    this.name = 'StepOutOfRangeError';
    this.pluginName = pluginName;
    this.stepIndex = stepIndex;
    this.totalSteps = totalSteps;
    Object.setPrototypeOf(this, StepOutOfRangeError.prototype);
  }
}
