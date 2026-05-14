import { LoginRejection } from '@swr-login/core';
import { describe, expect, it, vi } from 'vitest';
import { isTranslated, markTranslated, tryTranslateLoginError } from '../translate-login-error';

describe('translate-login-error helper', () => {
  describe('markTranslated / isTranslated', () => {
    it('is false on a freshly constructed rejection', () => {
      const r = new LoginRejection('x');
      expect(isTranslated(r)).toBe(false);
    });

    it('flips to true after markTranslated and is non-enumerable', () => {
      const r = new LoginRejection('x', { code: 1 });
      markTranslated(r);

      expect(isTranslated(r)).toBe(true);
      // The marker must not pollute serialisation/enumeration.
      expect(Object.keys(r)).not.toContain('__swrLoginTranslated');
      const cloned = JSON.parse(JSON.stringify({ message: r.message, payload: r.payload, ...r }));
      expect(cloned).not.toHaveProperty('__swrLoginTranslated');
    });

    it('is idempotent (calling twice is safe)', () => {
      const r = new LoginRejection('x');
      markTranslated(r);
      expect(() => markTranslated(r)).not.toThrow();
      expect(isTranslated(r)).toBe(true);
    });

    it('isTranslated tolerates non-objects', () => {
      expect(isTranslated(null)).toBe(false);
      expect(isTranslated(undefined)).toBe(false);
      expect(isTranslated('string')).toBe(false);
      expect(isTranslated(42)).toBe(false);
    });
  });

  describe('tryTranslateLoginError', () => {
    it('returns null when no translator is configured', () => {
      const result = tryTranslateLoginError(
        undefined,
        new Error('x'),
        'plugin_login',
        undefined,
        'p',
      );
      expect(result).toBeNull();
    });

    it('returns null when the translator yields null/undefined', () => {
      const r1 = tryTranslateLoginError(() => null, new Error('x'), 'plugin_login', undefined, 'p');
      const r2 = tryTranslateLoginError(
        () => undefined,
        new Error('x'),
        'plugin_login',
        undefined,
        'p',
      );
      expect(r1).toBeNull();
      expect(r2).toBeNull();
    });

    it('returns null when the translator yields a non-LoginRejection value', () => {
      // Defensive: the type allows only LoginRejection | null | undefined,
      // but a poorly-typed user code might return a plain object. We
      // should still treat this as "no translation" rather than crash.
      const result = tryTranslateLoginError(
        // @ts-expect-error simulating bad user code
        () => ({ message: 'fake' }),
        new Error('x'),
        'plugin_login',
        undefined,
        'p',
      );
      expect(result).toBeNull();
    });

    it('forwards the full context to the translator', () => {
      const spy = vi.fn(() => null);
      tryTranslateLoginError(
        spy,
        new Error('boom'),
        'after_auth',
        { variant: 'teacher' },
        'password',
      );

      expect(spy).toHaveBeenCalledTimes(1);
      const callArgs = spy.mock.calls[0];
      if (!callArgs) throw new Error('spy was not called');
      const [err, ctx] = callArgs;
      expect((err as Error).message).toBe('boom');
      expect(ctx).toEqual({
        phase: 'after_auth',
        loginContext: { variant: 'teacher' },
        pluginName: 'password',
      });
    });

    it('returns the LoginRejection (already marked) on success', () => {
      const rejection = new LoginRejection('disabled', { code: 113 });
      const result = tryTranslateLoginError(
        () => rejection,
        new Error('x'),
        'plugin_login',
        undefined,
        'p',
      );
      expect(result).toBe(rejection);
      expect(isTranslated(rejection)).toBe(true);
    });

    it('swallows translator exceptions and logs to console.error', () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const result = tryTranslateLoginError(
        () => {
          throw new Error('translator bug');
        },
        new Error('original'),
        'plugin_login',
        undefined,
        'p',
      );
      expect(result).toBeNull();
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
