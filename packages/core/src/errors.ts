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
