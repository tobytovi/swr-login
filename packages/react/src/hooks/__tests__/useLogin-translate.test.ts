/**
 * Integration tests for the unified `translateLoginError` hook in
 * `useLogin`'s pipeline. Mirrors the "extract core logic" testing style of
 * `useLogin.test.ts`: re-implements the relevant portion of the hook so
 * that we can drive it from plain JS without React rendering.
 *
 * The shape of the extracted helper MUST stay aligned with the real
 * implementation in `useLogin.ts`. See the comments inline.
 */
import type { AuthResponse, LoginErrorPhase, SWRLoginConfig } from '@swr-login/core';
import { LoginRejection } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isTranslated, tryTranslateLoginError } from '../../internal/translate-login-error';

type MaybeUnknownContext = { variant?: string } | undefined;

interface RunParams {
  pluginManager: { login: (name: string, creds: unknown) => Promise<AuthResponse> };
  tokenManager: { clearTokens: () => void };
  stateMachine: { transition: (state: string) => void };
  config: Partial<SWRLoginConfig>;
  swrMutate: (key: string, data: unknown, opts: unknown) => Promise<void>;
  authKey: string;
  pluginName: string;
  credentials: unknown;
  loginContext?: MaybeUnknownContext;
}

/**
 * Drives the same control flow as `useLogin().login()` after the unified
 * translator was wired in. Kept intentionally close to the real
 * implementation so behavioural drift is caught by these tests.
 */
async function runLogin(params: RunParams): Promise<AuthResponse> {
  const {
    pluginManager,
    tokenManager,
    stateMachine,
    config,
    swrMutate,
    authKey,
    pluginName,
    credentials,
    loginContext,
  } = params;

  const applyTranslate = (rawErr: unknown, phase: LoginErrorPhase): never => {
    const translated = tryTranslateLoginError(
      config.translateLoginError,
      rawErr,
      phase,
      loginContext,
      pluginName,
    );
    if (translated) {
      tokenManager.clearTokens();
      stateMachine.transition('unauthenticated');
      throw translated;
    }
    throw rawErr;
  };

  let response: AuthResponse = undefined as unknown as AuthResponse;
  try {
    response = await pluginManager.login(pluginName, credentials);
  } catch (pluginErr) {
    applyTranslate(pluginErr, 'plugin_login');
  }

  let shouldSkipFetchUser = false;
  if (config.afterAuth) {
    try {
      await config.afterAuth({
        pluginName,
        authResponse: response,
        skipFetchUser: () => {
          shouldSkipFetchUser = true;
        },
        loginContext,
      });
    } catch (afterAuthErr) {
      const translated = tryTranslateLoginError(
        config.translateLoginError,
        afterAuthErr,
        'after_auth',
        loginContext,
        pluginName,
      );
      tokenManager.clearTokens();
      stateMachine.transition('unauthenticated');
      throw translated ?? afterAuthErr;
    }
  }

  if (!shouldSkipFetchUser && config.fetchUser && config.validateUserOnLogin !== false) {
    try {
      const user = await config.fetchUser({
        token: response.accessToken,
        loginContext,
      });
      await swrMutate(authKey, user, { revalidate: false });
    } catch (fetchUserErr) {
      const translated = tryTranslateLoginError(
        config.translateLoginError,
        fetchUserErr,
        'fetch_user',
        loginContext,
        undefined,
      );
      tokenManager.clearTokens();
      stateMachine.transition('unauthenticated');
      throw translated ?? fetchUserErr;
    }
  }

  stateMachine.transition('authenticated');
  return response;
}

// ── Setup ────────────────────────────────────────────────────────

const mockAuthResponse: AuthResponse = {
  user: { id: 'u1', name: 'Alice' },
  accessToken: 'token-xyz',
  expiresAt: Date.now() + 3600_000,
};

const AUTH_KEY = '__swr_login_user__';

let pluginManager: { login: ReturnType<typeof vi.fn> };
let tokenManager: { clearTokens: ReturnType<typeof vi.fn> };
let stateMachine: { transition: ReturnType<typeof vi.fn> };
let swrMutate: ReturnType<typeof vi.fn>;

beforeEach(() => {
  pluginManager = { login: vi.fn().mockResolvedValue(mockAuthResponse) };
  tokenManager = { clearTokens: vi.fn() };
  stateMachine = { transition: vi.fn() };
  swrMutate = vi.fn().mockResolvedValue(undefined);
});

// ── Phase × Hit/Miss Matrix ──────────────────────────────────────

describe('useLogin × translateLoginError', () => {
  it('plugin_login phase: translator hit → reject with LoginRejection, tokens cleared, state=unauthenticated', async () => {
    const rawErr = new Error('113 — account_disabled');
    pluginManager.login.mockRejectedValueOnce(rawErr);

    const translateLoginError = vi.fn((_err, ctx) => {
      expect(ctx.phase).toBe('plugin_login');
      expect(ctx.pluginName).toBe('password');
      expect(ctx.loginContext).toEqual({ variant: 'teacher' });
      return new LoginRejection('Account disabled', { code: 113, variant: ctx.loginContext });
    });

    let caught: unknown;
    try {
      await runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
        loginContext: { variant: 'teacher' },
      });
    } catch (e) {
      caught = e;
    }

    expect(LoginRejection.is(caught)).toBe(true);
    expect((caught as LoginRejection).message).toBe('Account disabled');
    expect(isTranslated(caught)).toBe(true);
    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(1);
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');
    expect(stateMachine.transition).not.toHaveBeenCalledWith('authenticated');
  });

  it('after_auth phase: translator hit → reject with LoginRejection (translator ran before rollback)', async () => {
    const rawErr = new Error('not a platform user');
    const afterAuth = vi.fn().mockRejectedValue(rawErr);

    const translateLoginError = vi.fn((_err, ctx) => {
      expect(ctx.phase).toBe('after_auth');
      expect(ctx.pluginName).toBe('password');
      return new LoginRejection('Not platform user', { reason: 'not_platform_user' });
    });

    let caught: unknown;
    try {
      await runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], afterAuth, translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      });
    } catch (e) {
      caught = e;
    }

    expect(LoginRejection.is(caught)).toBe(true);
    expect((caught as LoginRejection).message).toBe('Not platform user');
    expect(tokenManager.clearTokens).toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');
  });

  it('fetch_user phase: translator hit → reject with LoginRejection, no SWR mutate', async () => {
    const rawErr = new Error('112');
    const fetchUser = vi.fn().mockRejectedValue(rawErr);
    const translateLoginError = vi.fn((_err, ctx) => {
      expect(ctx.phase).toBe('fetch_user');
      // fetch_user phase has no plugin association
      expect(ctx.pluginName).toBeUndefined();
      return new LoginRejection('School disabled', { code: 112 });
    });

    let caught: unknown;
    try {
      await runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], fetchUser, translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      });
    } catch (e) {
      caught = e;
    }

    expect(LoginRejection.is(caught)).toBe(true);
    expect((caught as LoginRejection).message).toBe('School disabled');
    expect(swrMutate).not.toHaveBeenCalled();
    expect(tokenManager.clearTokens).toHaveBeenCalled();
  });

  it('translator returns null → falls back to legacy behaviour (login rejects with original error)', async () => {
    const rawErr = new Error('genuine network error');
    pluginManager.login.mockRejectedValueOnce(rawErr);

    const translateLoginError = vi.fn(() => null);

    await expect(
      runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      }),
    ).rejects.toBe(rawErr);

    // For plugin_login phase the legacy outer catch in the real hook would
    // still transition to 'error'. Here we only assert that we did NOT
    // transition to 'unauthenticated' or 'authenticated' from inside the
    // translator path.
    expect(stateMachine.transition).not.toHaveBeenCalledWith('unauthenticated');
    expect(stateMachine.transition).not.toHaveBeenCalledWith('authenticated');
  });

  it('translator throws → falls back gracefully and console.error is logged', async () => {
    const rawErr = new Error('boom');
    const fetchUser = vi.fn().mockRejectedValue(rawErr);
    const translateLoginError = vi.fn(() => {
      throw new Error('translator bug');
    });
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], fetchUser, translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      }),
    ).rejects.toBe(rawErr);

    expect(errSpy).toHaveBeenCalled();
    // Legacy rollback still applied
    expect(tokenManager.clearTokens).toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');

    errSpy.mockRestore();
  });

  it('no translator configured → behaviour identical to before (regression guard)', async () => {
    const fetchUser = vi.fn().mockRejectedValue(new Error('legacy'));

    await expect(
      runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], fetchUser },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      }),
    ).rejects.toThrow('legacy');

    expect(tokenManager.clearTokens).toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');
  });

  it('happy path with translator configured but never invoked', async () => {
    const fetchUser = vi.fn().mockResolvedValue({ id: 'u1' });
    const translateLoginError = vi.fn(() => null);

    const result = await runLogin({
      pluginManager,
      tokenManager,
      stateMachine,
      config: { plugins: [], fetchUser, translateLoginError },
      swrMutate,
      authKey: AUTH_KEY,
      pluginName: 'password',
      credentials: {},
    });

    expect(translateLoginError).not.toHaveBeenCalled();
    expect(result).toBe(mockAuthResponse);
    expect(stateMachine.transition).toHaveBeenCalledWith('authenticated');
  });

  it('translator receives loginContext verbatim (variant disambiguation)', async () => {
    const fetchUser = vi.fn().mockRejectedValue(new Error('113'));
    const translateLoginError = vi.fn((_err, ctx) => {
      const variant = (ctx.loginContext as { variant?: 'teacher' | 'student' })?.variant;
      return new LoginRejection(
        variant === 'student' ? 'Disabled (student message)' : 'Disabled (teacher message)',
        { variant },
      );
    });

    let caught: unknown;
    try {
      await runLogin({
        pluginManager,
        tokenManager,
        stateMachine,
        config: { plugins: [], fetchUser, translateLoginError },
        swrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
        loginContext: { variant: 'student' },
      });
    } catch (e) {
      caught = e;
    }

    expect((caught as LoginRejection).message).toBe('Disabled (student message)');
    expect((caught as LoginRejection).payload).toEqual({ variant: 'student' });
  });
});
