/**
 * useUserChange / useUserChangeEffect / useUserChangeOn smoke tests
 *
 * 验证：
 *   - hooks 可在 Provider 上下文下正确注册到 emitter.on('user-change')
 *   - listener 收到的事件内容正确
 *   - useUserChangeOn 能按 source 过滤
 *   - 卸载时 unsubscribe 被调用
 */
import type { UserChangeEvent } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock emitter：允许手动触发事件 ──────────────────────────────

type Handler = (payload: unknown) => void;
const emitterHandlers = new Map<string, Set<Handler>>();
const mockEmitter = {
  on: vi.fn((event: string, handler: Handler) => {
    if (!emitterHandlers.has(event)) emitterHandlers.set(event, new Set());
    // biome-ignore lint/style/noNonNullAssertion: just set above
    emitterHandlers.get(event)!.add(handler);
    return () => emitterHandlers.get(event)?.delete(handler);
  }),
  off: vi.fn(),
  emit: vi.fn((event: string, payload: unknown) => {
    for (const h of emitterHandlers.get(event) ?? []) h(payload);
  }),
};

vi.mock('../../context', () => ({
  useAuthContext: () => ({
    emitter: mockEmitter,
    config: { plugins: [] },
    tokenManager: { getAccessToken: () => null },
    stateMachine: { transition: vi.fn() },
    pluginManager: {},
    broadcastSync: null,
    userChangeHint: { source: null, timestamp: 0 },
  }),
}));

// Mock react hooks（持久化 useState，捕获 useEffect）
let stateStore: Array<unknown> = [];
let stateCursor = 0;
let effectCallbacks: Array<() => undefined | (() => void)> = [];
let effectCleanups: Array<() => void> = [];
let refStore: Array<{ current: unknown }> = [];
let refCursor = 0;

function reset() {
  emitterHandlers.clear();
  stateStore = [];
  stateCursor = 0;
  effectCallbacks = [];
  effectCleanups = [];
  refStore = [];
  refCursor = 0;
}

function flushEffects() {
  for (const cb of effectCallbacks) {
    const cleanup = cb();
    if (typeof cleanup === 'function') effectCleanups.push(cleanup);
  }
  effectCallbacks = [];
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useState: (init: unknown) => {
      if (stateCursor >= stateStore.length) {
        stateStore.push(typeof init === 'function' ? (init as () => unknown)() : init);
      }
      const idx = stateCursor++;
      return [
        stateStore[idx],
        (next: unknown) => {
          stateStore[idx] =
            typeof next === 'function' ? (next as (v: unknown) => unknown)(stateStore[idx]) : next;
        },
      ];
    },
    useRef: (init: unknown) => {
      if (refCursor >= refStore.length) refStore.push({ current: init });
      return refStore[refCursor++];
    },
    useEffect: (fn: () => undefined | (() => void)) => {
      effectCallbacks.push(fn);
    },
  };
});

import { useUserChange, useUserChangeEffect, useUserChangeOn } from '../../hooks/useUserChange';

function resetReactCursors() {
  stateCursor = 0;
  refCursor = 0;
  effectCallbacks = [];
}

// ── 测试 ────────────────────────────────────────────────────────

describe('useUserChange', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it('未触发事件前返回 null', () => {
    resetReactCursors();
    const result = useUserChange();
    flushEffects();

    expect(result).toBeNull();
    expect(mockEmitter.on).toHaveBeenCalledWith('user-change', expect.any(Function));
  });

  it('emit user-change 后下次渲染返回事件对象', () => {
    resetReactCursors();
    useUserChange();
    flushEffects();

    // 模拟事件派发
    const event: UserChangeEvent = {
      source: 'login',
      user: { id: 'u1' },
      previousUser: null,
      timestamp: Date.now(),
    };
    mockEmitter.emit('user-change', event);

    // 重新渲染读取 state
    resetReactCursors();
    const result = useUserChange();

    expect(result).toEqual(event);
  });

  it('卸载时 unsubscribe 被调用', () => {
    resetReactCursors();
    useUserChange();
    flushEffects();

    expect(emitterHandlers.get('user-change')?.size).toBe(1);

    // 执行 cleanup
    for (const cleanup of effectCleanups) cleanup();
    expect(emitterHandlers.get('user-change')?.size).toBe(0);
  });
});

describe('useUserChangeEffect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it('收到事件时触发 listener，且不需要重新订阅', () => {
    const listener = vi.fn();

    resetReactCursors();
    useUserChangeEffect(listener);
    flushEffects();

    const event: UserChangeEvent = {
      source: 'logout',
      user: null,
      previousUser: { id: 'u1' },
      timestamp: Date.now(),
    };
    mockEmitter.emit('user-change', event);

    expect(listener).toHaveBeenCalledWith(event);
  });

  it('每次渲染更新 listener 引用（无需 useCallback）', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    resetReactCursors();
    useUserChangeEffect(listener1);
    flushEffects();

    // 第二次渲染使用新的 listener
    resetReactCursors();
    useUserChangeEffect(listener2);

    const event: UserChangeEvent = {
      source: 'revalidate',
      user: { id: 'u2' },
      previousUser: { id: 'u1' },
      timestamp: Date.now(),
    };
    mockEmitter.emit('user-change', event);

    // 只有最新的 listener 被调用
    expect(listener1).not.toHaveBeenCalled();
    expect(listener2).toHaveBeenCalledWith(event);
  });

  it('listener 抛错不会中断其它订阅者', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    const throwing = vi.fn(() => {
      throw new Error('boom');
    });

    resetReactCursors();
    useUserChangeEffect(throwing);
    flushEffects();

    expect(() => {
      mockEmitter.emit('user-change', {
        source: 'login',
        user: null,
        previousUser: undefined,
        timestamp: 0,
      });
    }).not.toThrow();

    expect(consoleErr).toHaveBeenCalled();
    consoleErr.mockRestore();
  });
});

describe('useUserChangeOn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reset();
  });

  it('只有匹配的 source 才触发 listener（单 source）', () => {
    const listener = vi.fn();

    resetReactCursors();
    useUserChangeOn('login', listener);
    flushEffects();

    mockEmitter.emit('user-change', {
      source: 'revalidate',
      user: null,
      previousUser: null,
      timestamp: 0,
    });
    expect(listener).not.toHaveBeenCalled();

    mockEmitter.emit('user-change', {
      source: 'login',
      user: { id: 'u1' },
      previousUser: null,
      timestamp: 0,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('支持 source 数组，任一匹配即触发', () => {
    const listener = vi.fn();

    resetReactCursors();
    useUserChangeOn(['login', 'external'], listener);
    flushEffects();

    mockEmitter.emit('user-change', {
      source: 'login',
      user: { id: 'u1' },
      previousUser: null,
      timestamp: 0,
    });
    mockEmitter.emit('user-change', {
      source: 'external',
      user: { id: 'u2' },
      previousUser: { id: 'u1' },
      timestamp: 0,
    });
    mockEmitter.emit('user-change', {
      source: 'revalidate',
      user: { id: 'u3' },
      previousUser: { id: 'u2' },
      timestamp: 0,
    });

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
