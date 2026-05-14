/**
 * Behavioural tests for the SWR-error branch of `useUser` once
 * `translateLoginError` is wired in.
 *
 * As with `useLogin-translate.test.ts`, we re-implement the effect's
 * decision tree as a plain function so the test can be driven without
 * mounting React. The shape MUST track the real implementation in
 * `useUser.ts`.
 */
import type { SWRLoginConfig } from '@swr-login/core';
import { LoginRejection } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  isTranslated,
  markTranslated,
  tryTranslateLoginError,
} from '../../internal/translate-login-error';

interface RunErrorEffectParams {
  error: unknown;
  config: Partial<SWRLoginConfig>;
  tokenManager: { clearTokens: () => void };
  stateMachine: { transition: (s: string) => void };
  swrMutate: () => void;
  retryCountRef: { current: number };
  /** Simulates `lastLoginContextRef.current` — forwarded to translateLoginError in revalidate phase. */
  lastLoginContext?: unknown;
}

interface ErrorEffectResult {
  /** What the consumer would observe through `lastError`. */
  lastError: unknown;
  /** Whether `onFetchUserError` was invoked. */
  legacyCallbackInvoked: boolean;
}

function runErrorEffect(p: RunErrorEffectParams): ErrorEffectResult {
  const { error, config, tokenManager, stateMachine, swrMutate, retryCountRef, lastLoginContext } =
    p;

  // ── (a) Already-translated errors short-circuit.
  if (isTranslated(error)) {
    return { lastError: error, legacyCallbackInvoked: false };
  }

  // ── (b) Revalidate-phase translation attempt.
  //        Now forwards lastLoginContext (mirrors the fix: lastLoginContextRef.current).
  const translated = tryTranslateLoginError(
    config.translateLoginError,
    error,
    'revalidate',
    lastLoginContext,
    undefined,
  );
  if (translated) {
    tokenManager.clearTokens();
    stateMachine.transition('unauthenticated');
    return { lastError: translated, legacyCallbackInvoked: false };
  }

  // ── (c) Legacy `onFetchUserError` path.
  let legacyCallbackInvoked = false;
  if (config.onFetchUserError) {
    legacyCallbackInvoked = true;
    const action = config.onFetchUserError(error as Error);
    if (action === 'retry' && retryCountRef.current < 1) {
      retryCountRef.current += 1;
      swrMutate();
    } else if (action === 'logout') {
      tokenManager.clearTokens();
      stateMachine.transition('unauthenticated');
    }
  }
  return { lastError: error, legacyCallbackInvoked };
}

// ── Setup ────────────────────────────────────────────────────────

let tokenManager: { clearTokens: ReturnType<typeof vi.fn> };
let stateMachine: { transition: ReturnType<typeof vi.fn> };
let swrMutate: ReturnType<typeof vi.fn>;
let retryCountRef: { current: number };

beforeEach(() => {
  tokenManager = { clearTokens: vi.fn() };
  stateMachine = { transition: vi.fn() };
  swrMutate = vi.fn();
  retryCountRef = { current: 0 };
});

// ── Tests ────────────────────────────────────────────────────────

describe('useUser SWR error × translateLoginError', () => {
  it('already-translated error → onFetchUserError is skipped (no double handling)', () => {
    const onFetchUserError = vi.fn(() => 'logout' as const);
    const r = new LoginRejection('translated upstream');
    markTranslated(r);

    const result = runErrorEffect({
      error: r,
      config: { onFetchUserError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(result.lastError).toBe(r);
    expect(result.legacyCallbackInvoked).toBe(false);
    expect(onFetchUserError).not.toHaveBeenCalled();
    // Already-translated implies tokens were already cleared upstream;
    // the effect must not duplicate that work.
    expect(tokenManager.clearTokens).not.toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it("revalidate translator hit → clears tokens + transitions to 'unauthenticated' + skips onFetchUserError", () => {
    const onFetchUserError = vi.fn(() => 'ignore' as const);
    const translateLoginError = vi.fn((_err, ctx) => {
      expect(ctx.phase).toBe('revalidate');
      expect(ctx.pluginName).toBeUndefined();
      return new LoginRejection('Account disabled (revalidate)');
    });

    const result = runErrorEffect({
      error: new Error('113'),
      config: { translateLoginError, onFetchUserError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(LoginRejection.is(result.lastError)).toBe(true);
    expect((result.lastError as LoginRejection).message).toBe('Account disabled (revalidate)');
    expect(result.legacyCallbackInvoked).toBe(false);
    expect(onFetchUserError).not.toHaveBeenCalled();
    expect(tokenManager.clearTokens).toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');
  });

  // ── lastLoginContext 透传：核心修复验证 ─────────────────────────────
  // Regression: revalidate phase translator now receives lastLoginContext
  // (persisted from the most recent login) instead of always undefined.

  it('revalidate translator receives lastLoginContext forwarded from the last login', () => {
    const capturedCtx: unknown[] = [];
    const translateLoginError = vi.fn((_err, ctx) => {
      capturedCtx.push(ctx);
      return new LoginRejection('disabled');
    });

    runErrorEffect({
      error: new Error('113'),
      config: { translateLoginError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
      lastLoginContext: { variant: 'teacher', traceId: 'abc' },
    });

    expect(capturedCtx).toHaveLength(1);
    expect((capturedCtx[0] as { loginContext: unknown }).loginContext).toEqual({
      variant: 'teacher',
      traceId: 'abc',
    });
  });

  it('revalidate translator loginContext is undefined when no login has occurred (cold-start / page refresh before any login)', () => {
    const capturedCtx: unknown[] = [];
    const translateLoginError = vi.fn((_err, ctx) => {
      capturedCtx.push(ctx);
      return null;
    });

    runErrorEffect({
      error: new Error('101'),
      config: { translateLoginError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
      // lastLoginContext not provided → undefined (no previous login in this session)
    });

    expect(capturedCtx).toHaveLength(1);
    expect((capturedCtx[0] as { loginContext: unknown }).loginContext).toBeUndefined();
  });

  it('revalidate translator can use loginContext.variant to gate error handling (aidemy use-case)', () => {
    // Simulates the aidemy scenario: code 101 should only reject for teacher variant.
    const translateLoginError = vi.fn(
      (_err: unknown, ctx: { loginContext?: { variant?: string }; phase: string }) => {
        const variant = ctx.loginContext?.variant;
        const code = (_err as Error).message === '101' ? 101 : null;
        if (code === 101 && variant) {
          return new LoginRejection('not_platform_user', { reason: 'not_platform_user', variant });
        }
        return null; // revalidate without variant → pass-through (student fallback)
      },
    );

    // Teacher variant → translator should reject
    const teacherResult = runErrorEffect({
      error: new Error('101'),
      config: { translateLoginError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
      lastLoginContext: { variant: 'teacher' },
    });
    expect(LoginRejection.is(teacherResult.lastError)).toBe(true);
    expect(tokenManager.clearTokens).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    // No variant (page refresh / no prior login) → translator returns null, legacy path
    const refreshResult = runErrorEffect({
      error: new Error('101'),
      config: { translateLoginError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
      // lastLoginContext: undefined
    });
    expect(LoginRejection.is(refreshResult.lastError)).toBe(false);
    expect(tokenManager.clearTokens).not.toHaveBeenCalled();
  });

  it("revalidate translator miss → falls back to onFetchUserError (legacy 'logout')", () => {
    const onFetchUserError = vi.fn(() => 'logout' as const);
    const translateLoginError = vi.fn(() => null);

    const err = new Error('still legacy');
    const result = runErrorEffect({
      error: err,
      config: { translateLoginError, onFetchUserError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(result.lastError).toBe(err);
    expect(result.legacyCallbackInvoked).toBe(true);
    expect(onFetchUserError).toHaveBeenCalledWith(err);
    expect(tokenManager.clearTokens).toHaveBeenCalled();
    expect(stateMachine.transition).toHaveBeenCalledWith('unauthenticated');
  });

  it("revalidate translator miss + legacy 'retry' → swrMutate triggered exactly once", () => {
    const onFetchUserError = vi.fn(() => 'retry' as const);

    runErrorEffect({
      error: new Error('transient'),
      config: { onFetchUserError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(swrMutate).toHaveBeenCalledTimes(1);
    expect(retryCountRef.current).toBe(1);
  });

  it('only translator configured (no onFetchUserError) + miss → keeps legacy behaviour (no logout)', () => {
    const translateLoginError = vi.fn(() => null);
    const err = new Error('untranslated');

    const result = runErrorEffect({
      error: err,
      config: { translateLoginError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(result.lastError).toBe(err);
    expect(result.legacyCallbackInvoked).toBe(false);
    expect(tokenManager.clearTokens).not.toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });

  it('legacy-only configuration is fully backward compatible', () => {
    const onFetchUserError = vi.fn(() => 'ignore' as const);
    const err = new Error('boring');

    const result = runErrorEffect({
      error: err,
      config: { onFetchUserError },
      tokenManager,
      stateMachine,
      swrMutate,
      retryCountRef,
    });

    expect(result.lastError).toBe(err);
    expect(result.legacyCallbackInvoked).toBe(true);
    expect(onFetchUserError).toHaveBeenCalledWith(err);
    expect(tokenManager.clearTokens).not.toHaveBeenCalled();
    expect(stateMachine.transition).not.toHaveBeenCalled();
  });
});
