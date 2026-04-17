/**
 * user-change 事件派发 & lastChangeSource 返回值测试
 *
 * 测试策略：
 *   仿照 useUser.test.ts 的 mock 风格（mock react hooks + swr + context），
 *   但不使用 real react 渲染，而是多次调用 useUser() 模拟重渲染。
 *   重点验证 source 推断逻辑：initial / login / logout / revalidate / external。
 */
import type { SWRLoginConfig, UserChangeEvent } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock 依赖 ──────────────────────────────────────────────────

const mockTokenManager = {
  getAccessToken: vi.fn().mockReturnValue('test-token'),
  getRefreshToken: vi.fn().mockReturnValue(null),
  setTokens: vi.fn(),
  clearTokens: vi.fn(),
  isExpired: vi.fn().mockReturnValue(false),
  refresh: vi.fn(),
};

const mockStateMachine = {
  transition: vi.fn(),
  getState: vi.fn().mockReturnValue('authenticated'),
};

let mockConfig: Partial<SWRLoginConfig> = { plugins: [] };
const mockEmitterEmit = vi.fn();
const mockEmitter = {
  on: vi.fn().mockReturnValue(() => {}),
  off: vi.fn(),
  emit: mockEmitterEmit,
};

// 在测试间通过修改此对象模拟 Provider 写入 hint
const mockUserChangeHint: { source: string | null; timestamp: number } = {
  source: null,
  timestamp: 0,
};

vi.mock('../../context', () => ({
  useAuthContext: () => ({
    tokenManager: mockTokenManager,
    stateMachine: mockStateMachine,
    config: mockConfig,
    pluginManager: { login: vi.fn() },
    emitter: mockEmitter,
    broadcastSync: null,
    userChangeHint: mockUserChangeHint,
  }),
}));

// Mock SWR
let swrData: unknown = undefined;
let swrError: Error | undefined = undefined;
let swrIsLoading = false;
const mockSwrMutate = vi.fn();

vi.mock('swr', () => ({
  default: () => ({
    data: swrData,
    error: swrError,
    isLoading: swrIsLoading,
    mutate: mockSwrMutate,
  }),
}));

// 持久化 React hook state 跨调用（模拟重渲染）
// refs 和 state 以调用顺序编号
let refStore: Array<{ current: unknown }> = [];
let refCursor = 0;
let stateStore: Array<unknown> = [];
let stateCursor = 0;
let effectCallbacks: Array<() => void> = [];

function resetReactMock() {
  refStore = [];
  refCursor = 0;
  stateStore = [];
  stateCursor = 0;
  effectCallbacks = [];
}

function simulateRerender() {
  refCursor = 0;
  stateCursor = 0;
  effectCallbacks = [];
}

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useRef: (init: unknown) => {
      if (refCursor >= refStore.length) {
        refStore.push({ current: init });
      }
      const ref = refStore[refCursor++];
      return ref;
    },
    useState: (init: unknown) => {
      if (stateCursor >= stateStore.length) {
        stateStore.push(typeof init === 'function' ? (init as () => unknown)() : init);
      }
      const idx = stateCursor++;
      const setter = (next: unknown) => {
        stateStore[idx] =
          typeof next === 'function' ? (next as (v: unknown) => unknown)(stateStore[idx]) : next;
      };
      return [stateStore[idx], setter];
    },
    useCallback: (fn: (...args: unknown[]) => unknown) => fn,
    useEffect: (fn: () => void) => {
      effectCallbacks.push(fn);
    },
  };
});

import { useUser } from '../../hooks/useUser';

/** 执行一次渲染 + 所有 effect */
function renderOnce() {
  simulateRerender();
  const result = useUser();
  for (const cb of effectCallbacks) {
    try {
      cb();
    } catch (e) {
      // ignore errors from unrelated effects (e.g. error-syncing effect)
    }
  }
  // 二次渲染读取最新 state（setLastChangeEvent 后）
  simulateRerender();
  return useUser();
}

// ── 测试 ────────────────────────────────────────────────────────

describe('useUser - user-change / lastChangeSource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReactMock();
    swrData = undefined;
    swrError = undefined;
    swrIsLoading = false;
    mockConfig = { plugins: [] };
    mockUserChangeHint.source = null;
    mockUserChangeHint.timestamp = 0;
  });

  it('SWR 尚未解析（data=undefined）时 lastChangeSource 为 null，不派发事件', () => {
    swrData = undefined;

    const result = renderOnce();

    expect(result.lastChangeSource).toBeNull();
    expect(result.lastChangeEvent).toBeNull();
    expect(mockEmitterEmit).not.toHaveBeenCalledWith('user-change', expect.anything());
  });

  it('首次 data 稳定为 null → source=initial', () => {
    swrData = null;

    const result = renderOnce();

    expect(result.lastChangeSource).toBe('initial');
    expect(result.lastChangeEvent).toMatchObject({
      source: 'initial',
      user: null,
      previousUser: undefined,
    });
    expect(typeof result.lastChangeEvent?.timestamp).toBe('number');
    expect(mockEmitterEmit).toHaveBeenCalledWith(
      'user-change',
      expect.objectContaining({ source: 'initial', user: null }),
    );
  });

  it('首次 data 稳定为 user 对象 → source=initial，user 透传', () => {
    const user = { id: 'u1', name: 'Alice' };
    swrData = user;

    const result = renderOnce();

    expect(result.lastChangeSource).toBe('initial');
    expect(result.lastChangeEvent?.user).toEqual(user);
    expect(result.lastChangeEvent?.previousUser).toBeUndefined();
  });

  it('同值不派发（Object.is 判等）', () => {
    const user = { id: 'u1' };
    swrData = user;

    renderOnce();
    mockEmitterEmit.mockClear();
    // 再次渲染，data 引用不变
    renderOnce();

    expect(mockEmitterEmit).not.toHaveBeenCalledWith('user-change', expect.anything());
  });

  it('Provider 设置 hint=login + data 变化 → source=login', () => {
    swrData = null;
    renderOnce(); // 先触发一次 initial

    // Provider 监听到 login 事件，写入 hint
    mockUserChangeHint.source = 'login';
    mockUserChangeHint.timestamp = Date.now();

    swrData = { id: 'u1' };
    const result = renderOnce();

    expect(result.lastChangeSource).toBe('login');
    expect(result.lastChangeEvent).toMatchObject({
      source: 'login',
      user: { id: 'u1' },
      previousUser: null,
    });
  });

  it('Provider 设置 hint=logout + data 变 null → source=logout', () => {
    swrData = { id: 'u1' };
    renderOnce();

    mockUserChangeHint.source = 'logout';
    mockUserChangeHint.timestamp = Date.now();

    swrData = null;
    const result = renderOnce();

    expect(result.lastChangeSource).toBe('logout');
    expect(result.lastChangeEvent?.previousUser).toEqual({ id: 'u1' });
    expect(result.lastChangeEvent?.user).toBeNull();
  });

  it('hint=external → source=external', () => {
    swrData = null;
    renderOnce();

    mockUserChangeHint.source = 'external';
    mockUserChangeHint.timestamp = Date.now();

    swrData = { id: 'u1' };
    const result = renderOnce();

    expect(result.lastChangeSource).toBe('external');
  });

  it('hint 过期（>1s） → fallback 到 revalidate', () => {
    swrData = null;
    renderOnce();

    // 模拟一个过期的 hint（2 秒前写入）
    mockUserChangeHint.source = 'login';
    mockUserChangeHint.timestamp = Date.now() - 2000;

    swrData = { id: 'u1' };
    const result = renderOnce();

    expect(result.lastChangeSource).toBe('revalidate');
  });

  it('无 hint + 非首次 data 变化 → source=revalidate', () => {
    swrData = { id: 'u1' };
    renderOnce(); // initial

    swrData = { id: 'u2' }; // 另一个 user 对象
    const result = renderOnce();

    expect(result.lastChangeSource).toBe('revalidate');
    expect(result.lastChangeEvent?.previousUser).toEqual({ id: 'u1' });
    expect(result.lastChangeEvent?.user).toEqual({ id: 'u2' });
  });

  it('hint 被消费后仍保留（TTL 内），多 useUser consumer 可共享同一 source', () => {
    // 这是对"多消费者一致性"的关键保证：hint 不应被单个 consumer 消费清除
    swrData = null;
    renderOnce();

    mockUserChangeHint.source = 'login';
    mockUserChangeHint.timestamp = Date.now();

    swrData = { id: 'u1' };
    const r1 = renderOnce();

    // 第二个 "consumer"（同一个测试里通过重置 hook state 模拟独立消费者）
    // 验证 hint 未被清零
    expect(mockUserChangeHint.source).toBe('login');
    expect(r1.lastChangeSource).toBe('login');
  });

  it('lastChangeEvent.timestamp 应为合理的 Date.now() 时间', () => {
    const before = Date.now();
    swrData = { id: 'u1' };
    const result = renderOnce();
    const after = Date.now();

    expect(result.lastChangeEvent?.timestamp).toBeGreaterThanOrEqual(before);
    expect(result.lastChangeEvent?.timestamp).toBeLessThanOrEqual(after);
  });

  it('emit 的 user-change 事件 payload 与 lastChangeEvent 一致', () => {
    swrData = { id: 'u1' };
    renderOnce();

    const emitCall = mockEmitterEmit.mock.calls.find((c) => c[0] === 'user-change');
    expect(emitCall).toBeDefined();
    const payload = emitCall?.[1] as UserChangeEvent;
    expect(payload.source).toBe('initial');
    expect(payload.user).toEqual({ id: 'u1' });
    expect(payload.previousUser).toBeUndefined();
  });
});
