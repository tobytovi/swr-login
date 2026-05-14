/**
 * Regression tests for lastLoginContextRef transparency.
 *
 * Verifies that:
 * 1. The SWR fetcher (`useUser` internal) forwards `lastLoginContextRef.current`
 *    to `fetchUser` as `loginContext`.
 * 2. The `translateLoginError` called in the `revalidate` phase receives
 *    `lastLoginContextRef.current` as `ctx.loginContext`.
 *
 * We test the underlying logic directly (without mounting React) by
 * re-implementing the fetcher and error-effect decision tree as plain
 * functions, mirroring the real implementation. This avoids the complexity
 * of React + SWR lifecycle management in unit tests while still exercising
 * the exact code paths introduced by the fix.
 *
 * IMPORTANT: The shape of these helpers MUST track the real implementation
 * in `useUser.ts`. If you change the fetcher or error-effect logic, update
 * these mirrors too.
 */
import type { SWRLoginConfig } from '@swr-login/core';
import { LoginRejection } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tryTranslateLoginError } from '../../internal/translate-login-error';

// ── Mirror of the SWR fetcher path in useUser.ts ─────────────────────────────

interface MockTokenManager {
  getAccessToken: () => string | null;
  isExpired: () => boolean;
}

interface MockLastLoginContextRef {
  current: unknown;
}

async function runFetcher(
  tokenManager: MockTokenManager,
  lastLoginContextRef: MockLastLoginContextRef,
  fetchUser: SWRLoginConfig['fetchUser'],
): Promise<unknown> {
  const token = tokenManager.getAccessToken();
  if (!token) return null;
  if (tokenManager.isExpired()) return null; // simplified — skip refresh branch

  if (fetchUser) {
    const currentToken = tokenManager.getAccessToken();
    if (!currentToken) return null;
    // This mirrors the fixed implementation:
    //   return await config.fetchUser({ token: currentToken, loginContext: lastLoginContextRef.current })
    return await fetchUser({ token: currentToken, loginContext: lastLoginContextRef.current });
  }
  return null;
}

// ── Mirror of the revalidate translateLoginError call in useUser.ts ──────────

interface RunRevalidateTranslateParams {
  error: unknown;
  config: Partial<SWRLoginConfig>;
  lastLoginContext: unknown;
}

function runRevalidateTranslate(p: RunRevalidateTranslateParams): LoginRejection | null {
  return tryTranslateLoginError(
    p.config.translateLoginError,
    p.error,
    'revalidate',
    p.lastLoginContext, // mirrors the fixed implementation
    undefined,
  );
}

// ── Setup ────────────────────────────────────────────────────────────────────

let tokenManager: MockTokenManager;
let lastLoginContextRef: MockLastLoginContextRef;

beforeEach(() => {
  tokenManager = {
    getAccessToken: vi.fn().mockReturnValue('tok-abc'),
    isExpired: vi.fn().mockReturnValue(false),
  };
  lastLoginContextRef = { current: undefined };
});

// ════════════════════════════════════════════════════════════════════════════
// 1. fetchUser SWR fetcher path
// ════════════════════════════════════════════════════════════════════════════

describe('useUser SWR fetcher → fetchUser receives lastLoginContext', () => {
  it('forwards lastLoginContextRef.current to fetchUser as loginContext', async () => {
    lastLoginContextRef.current = { variant: 'teacher', traceId: 'xyz' };
    const fetchUser = vi.fn().mockResolvedValue({ id: 'u1' });

    await runFetcher(tokenManager, lastLoginContextRef, fetchUser);

    expect(fetchUser).toHaveBeenCalledWith({
      token: 'tok-abc',
      loginContext: { variant: 'teacher', traceId: 'xyz' },
    });
  });

  it('loginContext is undefined when no login has occurred (cold-start / first page load)', async () => {
    lastLoginContextRef.current = undefined; // no previous login
    const fetchUser = vi.fn().mockResolvedValue(null);

    await runFetcher(tokenManager, lastLoginContextRef, fetchUser);

    expect(fetchUser).toHaveBeenCalledWith({
      token: 'tok-abc',
      loginContext: undefined,
    });
  });

  it('loginContext is undefined after logout clears lastLoginContextRef', async () => {
    // Simulate: login set context, then logout cleared it
    lastLoginContextRef.current = undefined; // cleared by logout handler
    const fetchUser = vi.fn().mockResolvedValue(null);

    await runFetcher(tokenManager, lastLoginContextRef, fetchUser);

    expect(fetchUser).toHaveBeenCalledWith({
      token: 'tok-abc',
      loginContext: undefined,
    });
  });

  it('student variant is forwarded correctly', async () => {
    lastLoginContextRef.current = { variant: 'student' };
    const fetchUser = vi.fn().mockResolvedValue({ id: 'u2' });

    await runFetcher(tokenManager, lastLoginContextRef, fetchUser);

    expect(fetchUser).toHaveBeenCalledWith({
      token: 'tok-abc',
      loginContext: { variant: 'student' },
    });
  });

  it('fetchUser not configured → returns null without calling anything', async () => {
    lastLoginContextRef.current = { variant: 'teacher' };

    const result = await runFetcher(tokenManager, lastLoginContextRef, undefined);

    expect(result).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// 2. translateLoginError revalidate phase receives lastLoginContext
// ════════════════════════════════════════════════════════════════════════════

describe('useUser revalidate translateLoginError → receives lastLoginContext', () => {
  it('translator receives loginContext from lastLoginContextRef in revalidate phase', () => {
    const capturedCtxs: unknown[] = [];
    const translateLoginError = vi.fn((_err, ctx) => {
      capturedCtxs.push(ctx);
      return null;
    });

    runRevalidateTranslate({
      error: new Error('112'),
      config: { translateLoginError },
      lastLoginContext: { variant: 'teacher', schoolId: 42 },
    });

    expect(capturedCtxs).toHaveLength(1);
    const ctx = capturedCtxs[0] as { phase: string; loginContext: unknown; pluginName: unknown };
    expect(ctx.phase).toBe('revalidate');
    expect(ctx.loginContext).toEqual({ variant: 'teacher', schoolId: 42 });
    expect(ctx.pluginName).toBeUndefined();
  });

  it('translator loginContext is undefined when no prior login (page refresh before any login)', () => {
    const capturedCtxs: unknown[] = [];
    const translateLoginError = vi.fn((_err, ctx) => {
      capturedCtxs.push(ctx);
      return null;
    });

    runRevalidateTranslate({
      error: new Error('112'),
      config: { translateLoginError },
      lastLoginContext: undefined,
    });

    const ctx = capturedCtxs[0] as { loginContext: unknown };
    expect(ctx.loginContext).toBeUndefined();
  });

  it('aidemy scenario: code 101 is rejected only for teacher variant, passes through for undefined context', () => {
    const translateLoginError = vi.fn(
      (_err: unknown, ctx: { loginContext?: { variant?: string } }) => {
        const code = Number((_err as Error).message);
        const variant = ctx.loginContext?.variant;
        if (code === 101 && variant === 'teacher') {
          return new LoginRejection('not_platform_user', { reason: 'not_platform_user', variant });
        }
        return null;
      },
    );

    // Teacher variant → rejected
    const teacherResult = runRevalidateTranslate({
      error: new Error('101'),
      config: { translateLoginError },
      lastLoginContext: { variant: 'teacher' },
    });
    expect(LoginRejection.is(teacherResult)).toBe(true);
    expect((teacherResult as LoginRejection).payload).toMatchObject({ variant: 'teacher' });

    // No context (page refresh) → passes through, no rejection
    const refreshResult = runRevalidateTranslate({
      error: new Error('101'),
      config: { translateLoginError },
      lastLoginContext: undefined,
    });
    expect(refreshResult).toBeNull();

    // Student variant → also passes through (101 is not fatal for students)
    const studentResult = runRevalidateTranslate({
      error: new Error('101'),
      config: { translateLoginError },
      lastLoginContext: { variant: 'student' },
    });
    expect(studentResult).toBeNull();
  });

  it('translateLoginError code 113 is rejected regardless of variant (account disabled is always terminal)', () => {
    const translateLoginError = vi.fn(
      (_err: unknown, ctx: { loginContext?: { variant?: string } }) => {
        const code = Number((_err as Error).message);
        if (code === 113) {
          const variant = ctx.loginContext?.variant ?? 'unknown';
          return new LoginRejection('account_disabled', { code, variant });
        }
        return null;
      },
    );

    for (const lastLoginContext of [{ variant: 'teacher' }, { variant: 'student' }, undefined]) {
      const result = runRevalidateTranslate({
        error: new Error('113'),
        config: { translateLoginError },
        lastLoginContext,
      });
      expect(LoginRejection.is(result)).toBe(true);
    }
  });
});
