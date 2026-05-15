import { describe, expect, it, vi } from 'vitest';
import { defineLazyLoginMethod, defineLoginMethod } from '../define-method';
import type { LoginMethod } from '../types';

describe('defineLoginMethod', () => {
  it('returns the same object reference (identity helper)', () => {
    const m: LoginMethod = {
      id: 'test/x',
      meta: { label: 'X' },
      use: () => ({ state: 'idle', reset: () => {} }),
    };
    expect(defineLoginMethod(m)).toBe(m);
  });

  it('preserves three-generic Handle inference', () => {
    interface Input {
      name: string;
    }
    interface Result {
      ok: true;
    }
    interface Handle {
      submit?: (i: Input) => Promise<Result>;
      state: 'idle' | 'pending' | 'success' | 'error';
      reset: () => void;
      extra: () => void;
    }
    const m = defineLoginMethod<Input, Result, Handle>({
      id: 'test/typed',
      meta: { label: 'typed' },
      use: () => ({ state: 'idle', reset: () => {}, extra: () => {} }),
    });
    // Compile-time only: ReturnType<m.use> must include `extra`
    const handle = m.use();
    expect(typeof handle.extra).toBe('function');
  });
});

describe('defineLazyLoginMethod (experimental)', () => {
  it('lazy-loads on first onRegistryMount and forwards id/meta synchronously', async () => {
    const realMethod: LoginMethod = {
      id: 'test/lazy-real',
      meta: { label: 'lazy real' },
      use: () => ({ state: 'idle', reset: () => {} }),
      onRegistryMount: vi.fn(),
    };
    const load = vi.fn(async () => ({ default: realMethod }));
    const lazy = defineLazyLoginMethod({
      id: 'test/lazy',
      meta: { label: 'lazy' },
      load,
    });

    expect(lazy.id).toBe('test/lazy');
    expect(lazy.meta.label).toBe('lazy');
    expect(load).not.toHaveBeenCalled();

    const internal = {
      credential: {
        version: '1.0',
        hasAuth: () => false,
        clear: async () => {},
        subscribe: () => () => {},
      },
      refreshSession: async () => {},
      publishEvent: () => {},
      registrySignal: new AbortController().signal,
      createMethodAbort: () => new AbortController(),
    } as Parameters<NonNullable<LoginMethod['onRegistryMount']>>[0];

    await lazy.onRegistryMount?.(internal);
    expect(load).toHaveBeenCalledOnce();
    expect(realMethod.onRegistryMount).toHaveBeenCalledOnce();
  });

  it('use() returns idle handle before resolution', () => {
    const lazy = defineLazyLoginMethod({
      id: 'test/lazy-2',
      meta: { label: 'l' },
      load: () => new Promise(() => {}), // never resolves
    });
    const handle = lazy.use();
    expect(handle.state).toBe('idle');
    expect(typeof handle.reset).toBe('function');
  });
});
