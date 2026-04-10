import type { SWRLoginConfig, TokenAdapter } from '@swr-login/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mock 依赖 ──────────────────────────────────────────────────

let mockAdapter: TokenAdapter;
let mockConfig: Partial<SWRLoginConfig>;

vi.mock('../../context', () => ({
  useAuthContext: () => ({
    tokenManager: {
      getAccessToken: vi.fn(),
      clearTokens: vi.fn(),
    },
    stateMachine: { transition: vi.fn() },
    config: mockConfig,
    pluginManager: { login: vi.fn() },
    emitter: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    broadcastSync: null,
  }),
}));

// Mock React hooks（useAdapter 只用到 useCallback）
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useCallback: (fn: (...args: unknown[]) => unknown) => fn,
  };
});

import { useAdapter } from '../../hooks/useAdapter';

// ── 测试 ────────────────────────────────────────────────────────

describe('useAdapter - hasAuth()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('adapter 实现了 hasAuth() 且返回 true → hasAuth() 返回 true', () => {
    mockAdapter = {
      getAccessToken: vi.fn().mockReturnValue(null),
      setAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setRefreshToken: vi.fn(),
      getExpiresAt: vi.fn(),
      setExpiresAt: vi.fn(),
      clear: vi.fn(),
      hasAuth: vi.fn().mockReturnValue(true),
    };
    mockConfig = { plugins: [], adapter: mockAdapter };

    const { hasAuth } = useAdapter();
    expect(hasAuth()).toBe(true);
    expect(mockAdapter.hasAuth).toHaveBeenCalled();
    // 不应 fallback 到 getAccessToken
    expect(mockAdapter.getAccessToken).not.toHaveBeenCalled();
  });

  it('adapter 实现了 hasAuth() 且返回 false → hasAuth() 返回 false', () => {
    mockAdapter = {
      getAccessToken: vi.fn().mockReturnValue('some-token'),
      setAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setRefreshToken: vi.fn(),
      getExpiresAt: vi.fn(),
      setExpiresAt: vi.fn(),
      clear: vi.fn(),
      hasAuth: vi.fn().mockReturnValue(false),
    };
    mockConfig = { plugins: [], adapter: mockAdapter };

    const { hasAuth } = useAdapter();
    expect(hasAuth()).toBe(false);
    // 应使用 hasAuth()，不 fallback
    expect(mockAdapter.hasAuth).toHaveBeenCalled();
    expect(mockAdapter.getAccessToken).not.toHaveBeenCalled();
  });

  it('adapter 未实现 hasAuth() + accessToken 存在 → fallback 返回 true', () => {
    mockAdapter = {
      getAccessToken: vi.fn().mockReturnValue('access-token-123'),
      setAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setRefreshToken: vi.fn(),
      getExpiresAt: vi.fn(),
      setExpiresAt: vi.fn(),
      clear: vi.fn(),
      // 不实现 hasAuth
    };
    mockConfig = { plugins: [], adapter: mockAdapter };

    const { hasAuth } = useAdapter();
    expect(hasAuth()).toBe(true);
    expect(mockAdapter.getAccessToken).toHaveBeenCalled();
  });

  it('adapter 未实现 hasAuth() + accessToken 为 null → fallback 返回 false', () => {
    mockAdapter = {
      getAccessToken: vi.fn().mockReturnValue(null),
      setAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setRefreshToken: vi.fn(),
      getExpiresAt: vi.fn(),
      setExpiresAt: vi.fn(),
      clear: vi.fn(),
    };
    mockConfig = { plugins: [], adapter: mockAdapter };

    const { hasAuth } = useAdapter();
    expect(hasAuth()).toBe(false);
    expect(mockAdapter.getAccessToken).toHaveBeenCalled();
  });
});

describe('useAdapter - adapter 引用', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应返回 adapter 实例引用', () => {
    mockAdapter = {
      getAccessToken: vi.fn(),
      setAccessToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setRefreshToken: vi.fn(),
      getExpiresAt: vi.fn(),
      setExpiresAt: vi.fn(),
      clear: vi.fn(),
    };
    mockConfig = { plugins: [], adapter: mockAdapter };

    const { adapter } = useAdapter();
    expect(adapter).toBe(mockAdapter);
  });
});
