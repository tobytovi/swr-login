import type { SWRLoginConfig } from '@swr-login/core';
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

let mockConfig: Partial<SWRLoginConfig> = {
  plugins: [],
};

vi.mock('../../context', () => ({
  useAuthContext: () => ({
    tokenManager: mockTokenManager,
    stateMachine: mockStateMachine,
    config: mockConfig,
    pluginManager: { login: vi.fn() },
    emitter: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    broadcastSync: null,
  }),
}));

// Mock SWR
let swrData: unknown = null;
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

// Mock React hooks
let effectCallbacks: Array<() => void> = [];
const lastErrorState: Error | undefined = undefined;
const clearErrorFn: (() => void) | null = null;

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  const refValue: { current: unknown } = { current: undefined };
  const tick = 0;
  let setTickFn: ((v: number) => void) | null = null;

  return {
    ...actual,
    useRef: (init: unknown) => {
      if (refValue.current === undefined && init === undefined) {
        // lastErrorRef
        return refValue;
      }
      // retryCountRef
      return { current: init ?? 0 };
    },
    useState: (init: unknown) => {
      if (typeof init === 'number') {
        // tick state for forceUpdate
        setTickFn = vi.fn();
        return [tick, setTickFn];
      }
      return [init, vi.fn()];
    },
    useCallback: (fn: (...args: unknown[]) => unknown) => fn,
    useEffect: (fn: () => void) => {
      effectCallbacks.push(fn);
    },
  };
});

import { useUser } from '../../hooks/useUser';

// ── 测试 ────────────────────────────────────────────────────────

describe('useUser - lastError & clearError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData = null;
    swrError = undefined;
    swrIsLoading = false;
    effectCallbacks = [];
    mockConfig = { plugins: [] };
  });

  it('fetchUser 成功时 lastError 应为 undefined', () => {
    swrData = { id: 'u1', name: 'Alice' };
    swrError = undefined;

    const result = useUser();

    expect(result.lastError).toBeUndefined();
    expect(result.error).toBeUndefined();
    expect(result.user).toEqual({ id: 'u1', name: 'Alice' });
    expect(result.isAuthenticated).toBe(true);
  });

  it('fetchUser 失败时 error 应有值', () => {
    swrData = null;
    swrError = new Error('账号已被禁用');

    const result = useUser();

    expect(result.error).toEqual(new Error('账号已被禁用'));
  });

  it('应返回 clearError 函数', () => {
    const result = useUser();
    expect(typeof result.clearError).toBe('function');
  });

  it('应返回 lastError 字段', () => {
    const result = useUser();
    expect('lastError' in result).toBe(true);
  });

  it('应返回 mutate 函数', () => {
    const result = useUser();
    expect(typeof result.mutate).toBe('function');
  });
});

describe('useUser - onFetchUserError 回调', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData = null;
    swrError = undefined;
    swrIsLoading = false;
    effectCallbacks = [];
    mockConfig = { plugins: [] };
  });

  it('未配置 onFetchUserError 时不应报错', () => {
    swrError = new Error('network error');
    mockConfig = { plugins: [] };

    // 不应抛出异常
    expect(() => useUser()).not.toThrow();
  });

  it('配置了 onFetchUserError 时应在 useEffect 中注册回调', () => {
    swrError = new Error('account disabled');
    mockConfig = {
      plugins: [],
      onFetchUserError: vi.fn().mockReturnValue('ignore'),
    };

    useUser();

    // 应注册了 useEffect 回调
    expect(effectCallbacks.length).toBeGreaterThan(0);
  });

  it('onFetchUserError 返回 logout 时应调用 clearTokens', () => {
    swrError = new Error('account disabled');
    mockConfig = {
      plugins: [],
      onFetchUserError: vi.fn().mockReturnValue('logout'),
    };

    useUser();

    // 执行 useEffect 回调
    for (const cb of effectCallbacks) {
      cb();
    }

    expect(mockConfig.onFetchUserError).toHaveBeenCalledWith(new Error('account disabled'));
    expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    expect(mockStateMachine.transition).toHaveBeenCalledWith('unauthenticated');
  });

  it('onFetchUserError 返回 retry 时应调用 swrMutate', () => {
    swrError = new Error('network timeout');
    mockConfig = {
      plugins: [],
      onFetchUserError: vi.fn().mockReturnValue('retry'),
    };

    useUser();

    // 执行 useEffect 回调
    for (const cb of effectCallbacks) {
      cb();
    }

    expect(mockConfig.onFetchUserError).toHaveBeenCalledWith(new Error('network timeout'));
    expect(mockSwrMutate).toHaveBeenCalled();
  });

  it('onFetchUserError 返回 ignore 时不应调用 clearTokens 或 swrMutate', () => {
    swrError = new Error('minor error');
    mockConfig = {
      plugins: [],
      onFetchUserError: vi.fn().mockReturnValue('ignore'),
    };

    useUser();

    // 执行 useEffect 回调
    for (const cb of effectCallbacks) {
      cb();
    }

    expect(mockConfig.onFetchUserError).toHaveBeenCalledWith(new Error('minor error'));
    expect(mockTokenManager.clearTokens).not.toHaveBeenCalled();
    expect(mockSwrMutate).not.toHaveBeenCalled();
  });
});

describe('useUser - swrOptions 配置透传', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData = null;
    swrError = undefined;
    swrIsLoading = false;
    effectCallbacks = [];
    mockConfig = { plugins: [] };
  });

  it('未配置 swrOptions 时应正常工作（使用默认值）', () => {
    mockConfig = { plugins: [] };

    const result = useUser();

    expect(result).toBeDefined();
    expect(result.user).toBeNull();
  });

  it('配置 swrOptions 后应正常工作', () => {
    mockConfig = {
      plugins: [],
      swrOptions: {
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      },
    };

    const result = useUser();

    expect(result).toBeDefined();
    expect(result.user).toBeNull();
  });

  it('swrOptions 部分配置应正常工作', () => {
    mockConfig = {
      plugins: [],
      swrOptions: {
        revalidateOnFocus: false,
      },
    };

    const result = useUser();

    expect(result).toBeDefined();
  });

  it('swrOptions 与 onFetchUserError 可同时使用', () => {
    swrError = new Error('test error');
    mockConfig = {
      plugins: [],
      swrOptions: {
        revalidateOnFocus: false,
      },
      onFetchUserError: vi.fn().mockReturnValue('ignore'),
    };

    useUser();

    // 执行 useEffect 回调
    for (const cb of effectCallbacks) {
      cb();
    }

    expect(mockConfig.onFetchUserError).toHaveBeenCalledWith(new Error('test error'));
  });
});
