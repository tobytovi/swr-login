/**
 * aidemy password method — demonstrates custom Handle fields (RFC §8.2).
 *
 * Key showcase:
 *   - Custom PasswordHandle extends BaseLoginMethodHandle with extra fields
 *   - resetPasswordRequired uses React state to pause submit + await UI
 *   - provideNewPassword unblocks the suspended submit
 */
'use client';

import { useState } from 'react';
import { type BaseLoginMethodHandle, LoginRejection, defineLoginMethod } from 'swr-login';
import { useAuthInternal } from 'swr-login';

export interface PasswordInput {
  account: string;
  password: string;
  variant: 'teacher' | 'student';
}

export interface PasswordResult {
  user: AppUser;
}

export interface AppUser {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  email?: string;
}

/**
 * Custom Handle: extends the base contract with reset-password flow fields.
 *
 * These extra fields allow the UI to react to mid-submit state without
 * any framework-level multi-step coordination.
 */
export interface PasswordHandle extends BaseLoginMethodHandle<PasswordInput, PasswordResult> {
  /** True while the server requires the user to set a new password. */
  resetPasswordRequired: boolean;
  /**
   * Call with a new password string to continue the login flow,
   * or `null` to skip reset (if server allows it).
   */
  provideNewPassword: (newPwd: string | null) => void;
}

// ─── Mock API helpers (replace with real fetch in production) ──

async function mockPasswordLogin(
  input: PasswordInput,
  signal: AbortSignal,
): Promise<{ accessToken: string; needResetPassword: boolean; userId: string }> {
  await new Promise((res) => setTimeout(res, 600));
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
  if (input.password === 'wrong') {
    throw new LoginRejection('密码错误', {
      code: 'ERR_INVALID_CREDENTIALS',
      reason: 'invalid_credentials',
      methodId: 'aidemy/coding-password',
    });
  }
  return {
    accessToken: `mock-token-${Date.now()}`,
    needResetPassword: input.password === 'reset_me',
    userId: `user-${input.account}`,
  };
}

async function mockResetPassword(_newPwd: string): Promise<void> {
  await new Promise((res) => setTimeout(res, 400));
}

function buildUser(userId: string, variant: 'teacher' | 'student'): AppUser {
  return {
    id: userId,
    name: variant === 'teacher' ? 'Teacher Demo' : 'Student Demo',
    role: variant,
    email: `${userId}@aidemy.example`,
  };
}

// ─── Method definition ─────────────────────────────────────────

export const passwordMethod = defineLoginMethod<PasswordInput, PasswordResult, PasswordHandle>({
  id: 'aidemy/coding-password',
  meta: {
    label: '账号密码登录',
    order: 0,
    slot: 'primary',
  },
  use(): PasswordHandle {
    const { refreshSession, publishEvent, createMethodAbort } = useAuthInternal();
    const [state, setState] = useState<PasswordHandle['state']>('idle');
    const [error, setError] = useState<LoginRejection | undefined>();
    // null = not in reset flow; function = awaiting user input
    const [resetCallback, setResetCallback] = useState<((pwd: string | null) => void) | null>(null);

    const submit = async (input: PasswordInput): Promise<PasswordResult> => {
      const abort = createMethodAbort();
      setState('pending');
      setError(undefined);

      try {
        const res = await mockPasswordLogin(input, abort.signal);

        // ── Reset-password gate ──────────────────────────────
        if (res.needResetPassword) {
          const newPwd = await new Promise<string | null>((resolve) => {
            setResetCallback(() => resolve);
          });
          setResetCallback(null);
          if (newPwd) {
            await mockResetPassword(newPwd);
          }
        }

        const user = buildUser(res.userId, input.variant);
        await refreshSession();
        publishEvent({
          kind: 'login',
          methodId: 'aidemy/coding-password',
          payload: { variant: input.variant },
          timestamp: Date.now(),
        });
        setState('success');
        return { user };
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') {
          setState('idle');
          throw err;
        }
        const rej = LoginRejection.is(err)
          ? err
          : new LoginRejection('登录失败', {
              code: 'ERR_PASSWORD_LOGIN_FAILED',
              reason: 'password_login_failed',
              cause: err,
              methodId: 'aidemy/coding-password',
            });
        setError(rej);
        setState('error');
        throw rej;
      }
    };

    return {
      submit,
      state,
      error,
      reset: () => {
        setError(undefined);
        setState('idle');
        setResetCallback(null);
      },
      resetPasswordRequired: resetCallback !== null,
      provideNewPassword: (pwd) => resetCallback?.(pwd),
    };
  },
});
