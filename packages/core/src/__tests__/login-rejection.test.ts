import { describe, expect, it } from 'vitest';
import { LoginRejection } from '../errors';

describe('LoginRejection', () => {
  it('extends Error and carries name/message/payload', () => {
    const r = new LoginRejection('Account disabled', { reason: 'account_disabled', code: 113 });

    expect(r).toBeInstanceOf(Error);
    expect(r).toBeInstanceOf(LoginRejection);
    expect(r.name).toBe('LoginRejection');
    expect(r.message).toBe('Account disabled');
    expect(r.payload).toEqual({ reason: 'account_disabled', code: 113 });
  });

  it('LoginRejection.is is a reliable type guard', () => {
    const r = new LoginRejection('x');
    const e = new Error('x');

    expect(LoginRejection.is(r)).toBe(true);
    expect(LoginRejection.is(e)).toBe(false);
    expect(LoginRejection.is(null)).toBe(false);
    expect(LoginRejection.is('string')).toBe(false);
    expect(LoginRejection.is({ name: 'LoginRejection' })).toBe(false);
  });

  it('serialises through JSON.stringify without throwing', () => {
    // SWR caches errors verbatim; ensure that round-trip via structured
    // logging tools (e.g. monitoring agents that call JSON.stringify on
    // the captured error) does not blow up.
    const r = new LoginRejection('msg', { code: 113 });

    expect(() =>
      JSON.stringify({ name: r.name, message: r.message, payload: r.payload }),
    ).not.toThrow();
  });

  it('payload is optional', () => {
    const r = new LoginRejection('no payload');
    expect(r.payload).toBeUndefined();
  });
});
