import { describe, expect, it } from 'vitest';
import { LoginRejection } from '../errors';

describe('LoginRejection (v0.9)', () => {
  it('carries code (machine) + reason (semantic) + methodId + payload', () => {
    const r = new LoginRejection('Account disabled', {
      code: 'ERR_ACCOUNT_DISABLED',
      reason: 'account_disabled',
      methodId: 'aidemy/coding-password',
      payload: { hint: 'contact admin' },
    });

    expect(r).toBeInstanceOf(Error);
    expect(r).toBeInstanceOf(LoginRejection);
    expect(r.name).toBe('LoginRejection');
    expect(r.message).toBe('Account disabled');
    expect(r.code).toBe('ERR_ACCOUNT_DISABLED');
    expect(r.reason).toBe('account_disabled');
    expect(r.methodId).toBe('aidemy/coding-password');
    expect(r.payload).toEqual({ hint: 'contact admin' });
  });

  it('LoginRejection.is is a reliable type guard', () => {
    expect(LoginRejection.is(new LoginRejection('x'))).toBe(true);
    expect(LoginRejection.is(new Error('x'))).toBe(false);
    expect(LoginRejection.is(null)).toBe(false);
    expect(LoginRejection.is('string')).toBe(false);
    expect(LoginRejection.is({ name: 'LoginRejection' })).toBe(false);
  });

  it('preserves cause when provided', () => {
    const cause = new Error('underlying');
    const r = new LoginRejection('wrapped', { cause });
    expect(r.originalError).toBe(cause);
    // ES2022 Error.cause
    expect((r as Error & { cause?: unknown }).cause).toBe(cause);
  });

  it('all fields optional except message', () => {
    const r = new LoginRejection('bare');
    expect(r.code).toBeUndefined();
    expect(r.reason).toBeUndefined();
    expect(r.methodId).toBeUndefined();
    expect(r.payload).toBeUndefined();
  });

  it('serialises basic fields through JSON.stringify without throwing', () => {
    const r = new LoginRejection('msg', { code: 'ERR_X', reason: 'x' });
    expect(() =>
      JSON.stringify({ name: r.name, message: r.message, code: r.code, reason: r.reason }),
    ).not.toThrow();
  });
});
