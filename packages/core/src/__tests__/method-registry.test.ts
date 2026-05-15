import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DuplicateMethodIdError } from '../errors';
import {
  buildMethodRegistry,
  checkIdSetStability,
  isMethodEnabled,
  slotMatches,
  validateMethodId,
} from '../method-registry';
import type { LoginMethod } from '../types';

function makeMethod(id: string, slot?: string | string[]): LoginMethod {
  return {
    id,
    meta: { label: id, slot },
    use: () => ({ state: 'idle', reset: () => {} }),
  };
}

describe('validateMethodId', () => {
  let originalNodeEnv: string | undefined;

  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('throws DuplicateMethodIdError when id seen twice', () => {
    const seen = new Set<string>();
    validateMethodId('foo/bar', seen);
    expect(() => validateMethodId('foo/bar', seen)).toThrow(DuplicateMethodIdError);
  });

  it('warns when id lacks namespace (dev mode)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    validateMethodId('flat-id');
    expect(spy).toHaveBeenCalled();
  });

  it('does not warn for local/* prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    validateMethodId('local/dev-mock');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not warn for test/* prefix', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    validateMethodId('test/fixture');
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not warn for valid scope/name', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    validateMethodId('aidemy/coding-password');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('buildMethodRegistry', () => {
  it('builds id-indexed map preserving order', () => {
    const a = makeMethod('test/a');
    const b = makeMethod('test/b');
    const reg = buildMethodRegistry([a, b]);
    expect(reg.ids()).toEqual(['test/a', 'test/b']);
    expect(reg.get('test/a')).toBe(a);
    expect(reg.has('test/b')).toBe(true);
  });

  it('throws DuplicateMethodIdError on duplicate ids', () => {
    expect(() => buildMethodRegistry([makeMethod('test/a'), makeMethod('test/a')])).toThrow(
      DuplicateMethodIdError,
    );
  });

  it('bySlot matches both string and string[] slot meta', () => {
    const reg = buildMethodRegistry([
      makeMethod('test/a', 'primary'),
      makeMethod('test/b', ['primary', 'compact']),
      makeMethod('test/c', 'secondary'),
    ]);
    expect(reg.bySlot('primary').map((m) => m.id)).toEqual(['test/a', 'test/b']);
    expect(reg.bySlot('compact').map((m) => m.id)).toEqual(['test/b']);
    expect(reg.bySlot('none')).toEqual([]);
  });
});

describe('slotMatches', () => {
  it('returns false when meta.slot is missing', () => {
    expect(slotMatches({ label: 'x' }, 'primary')).toBe(false);
  });
  it('handles string', () => {
    expect(slotMatches({ label: 'x', slot: 'primary' }, 'primary')).toBe(true);
    expect(slotMatches({ label: 'x', slot: 'primary' }, 'other')).toBe(false);
  });
  it('handles string[]', () => {
    expect(slotMatches({ label: 'x', slot: ['a', 'b'] }, 'b')).toBe(true);
    expect(slotMatches({ label: 'x', slot: ['a', 'b'] }, 'c')).toBe(false);
  });
});

describe('isMethodEnabled', () => {
  it('defaults to enabled when missing', () => {
    expect(isMethodEnabled({ label: 'x' })).toBe(true);
  });
  it('respects boolean', () => {
    expect(isMethodEnabled({ label: 'x', enabled: false })).toBe(false);
    expect(isMethodEnabled({ label: 'x', enabled: true })).toBe(true);
  });
  it('invokes function form lazily', () => {
    const fn = vi.fn(() => true);
    expect(isMethodEnabled({ label: 'x', enabled: fn })).toBe(true);
    expect(fn).toHaveBeenCalledOnce();
  });
  it('treats throwing function as disabled', () => {
    expect(
      isMethodEnabled({
        label: 'x',
        enabled: () => {
          throw new Error('boom');
        },
      }),
    ).toBe(false);
  });
});

describe('checkIdSetStability', () => {
  let originalNodeEnv: string | undefined;
  beforeEach(() => {
    originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    vi.restoreAllMocks();
  });

  it('does not warn when prev is null (first render)', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    checkIdSetStability(null, ['a/b']);
    expect(spy).not.toHaveBeenCalled();
  });

  it('warns when ids change', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    checkIdSetStability(['a/b'], ['a/c']);
    expect(spy).toHaveBeenCalled();
  });

  it('does not warn when ids match', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    checkIdSetStability(['a/b', 'a/c'], ['a/b', 'a/c']);
    expect(spy).not.toHaveBeenCalled();
  });
});
