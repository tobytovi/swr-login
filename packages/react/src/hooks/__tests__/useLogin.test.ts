import type { AuthResponse, SWRLoginConfig } from '@swr-login/core';
/**
 * useLogin hook 的 validateUserOnLogin 逻辑测试。
 *
 * 由于 useLogin 是 React Hook，在非 React 渲染环境中无法直接调用。
 * 这里我们测试的是 login 流程的核心逻辑：
 * pluginManager.login() → fetchUser() → SWR mutate / token 回滚
 *
 * 这些逻辑在 useLogin.ts 的 login callback 中实现。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── 模拟 useLogin 内部的核心 login 逻辑 ──────────────────────────

/**
 * 从 useLogin.ts 中提取的核心 login 逻辑（不含 React 状态管理）。
 * 用于独立测试 validateUserOnLogin 功能。
 */
async function loginWithValidation(params: {
  pluginManager: { login: (name: string, creds: unknown) => Promise<AuthResponse> };
  tokenManager: { clearTokens: () => void };
  stateMachine: { transition: (state: string) => void };
  config: Partial<SWRLoginConfig>;
  swrMutate: (key: string, data: unknown, opts: unknown) => Promise<void>;
  authKey: string;
  pluginName: string;
  credentials: unknown;
}): Promise<AuthResponse> {
  const {
    pluginManager,
    tokenManager,
    stateMachine,
    config,
    swrMutate,
    authKey,
    pluginName,
    credentials,
  } = params;

  const response = await pluginManager.login(pluginName, credentials);

  // validateUserOnLogin 逻辑（与 useLogin.ts 中的实现一致）
  if (config.fetchUser && config.validateUserOnLogin !== false) {
    try {
      const user = await config.fetchUser(response.accessToken);
      await swrMutate(authKey, user, { revalidate: false });
    } catch (fetchUserErr) {
      tokenManager.clearTokens();
      stateMachine.transition('unauthenticated');
      throw fetchUserErr;
    }
  }

  stateMachine.transition('authenticated');

  if (config.cacheAdapter) {
    await config.cacheAdapter.setUser(response.user);
  }

  return response;
}

// ── 测试 ────────────────────────────────────────────────────────

describe('useLogin - validateUserOnLogin 核心逻辑', () => {
  const AUTH_KEY = '__swr_login_user__';

  const mockAuthResponse: AuthResponse = {
    user: { id: 'u1', name: 'Alice' },
    accessToken: 'access-token-123',
    expiresAt: Date.now() + 3600000,
  };

  let mockPluginManager: { login: ReturnType<typeof vi.fn> };
  let mockTokenManager: { clearTokens: ReturnType<typeof vi.fn> };
  let mockStateMachine: { transition: ReturnType<typeof vi.fn> };
  let mockSwrMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockPluginManager = { login: vi.fn().mockResolvedValue(mockAuthResponse) };
    mockTokenManager = { clearTokens: vi.fn() };
    mockStateMachine = { transition: vi.fn() };
    mockSwrMutate = vi.fn().mockResolvedValue(undefined);
  });

  it('login 成功 + fetchUser 成功 → login resolve，SWR 缓存已写入', async () => {
    const mockUser = { id: 'u1', name: 'Alice', status: 'active' };
    const fetchUser = vi.fn().mockResolvedValue(mockUser);

    const result = await loginWithValidation({
      pluginManager: mockPluginManager,
      tokenManager: mockTokenManager,
      stateMachine: mockStateMachine,
      config: { plugins: [], fetchUser },
      swrMutate: mockSwrMutate,
      authKey: AUTH_KEY,
      pluginName: 'password',
      credentials: { account: '123', password: '456' },
    });

    // 验证 fetchUser 被调用
    expect(fetchUser).toHaveBeenCalledWith('access-token-123');
    // 验证 SWR 缓存被写入
    expect(mockSwrMutate).toHaveBeenCalledWith(AUTH_KEY, mockUser, { revalidate: false });
    // 验证状态机转为 authenticated
    expect(mockStateMachine.transition).toHaveBeenCalledWith('authenticated');
    // 验证返回 AuthResponse
    expect(result).toBe(mockAuthResponse);
  });

  it('login 成功 + fetchUser 失败 → login reject，token 已清除，状态为 unauthenticated', async () => {
    const fetchUserError = new Error('账号已被禁用 (result: 113)');
    const fetchUser = vi.fn().mockRejectedValue(fetchUserError);

    await expect(
      loginWithValidation({
        pluginManager: mockPluginManager,
        tokenManager: mockTokenManager,
        stateMachine: mockStateMachine,
        config: { plugins: [], fetchUser },
        swrMutate: mockSwrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: { account: '123', password: '456' },
      }),
    ).rejects.toThrow('账号已被禁用');

    // 验证 token 被清除
    expect(mockTokenManager.clearTokens).toHaveBeenCalled();
    // 验证状态机转为 unauthenticated
    expect(mockStateMachine.transition).toHaveBeenCalledWith('unauthenticated');
    // 验证状态机没有转为 authenticated
    expect(mockStateMachine.transition).not.toHaveBeenCalledWith('authenticated');
  });

  it('validateUserOnLogin: false → login 成功后不调用 fetchUser', async () => {
    const fetchUser = vi.fn();

    const result = await loginWithValidation({
      pluginManager: mockPluginManager,
      tokenManager: mockTokenManager,
      stateMachine: mockStateMachine,
      config: { plugins: [], fetchUser, validateUserOnLogin: false },
      swrMutate: mockSwrMutate,
      authKey: AUTH_KEY,
      pluginName: 'password',
      credentials: {},
    });

    // fetchUser 不应被调用
    expect(fetchUser).not.toHaveBeenCalled();
    // SWR mutate 不应被调用
    expect(mockSwrMutate).not.toHaveBeenCalled();
    // 状态机应正常转为 authenticated
    expect(mockStateMachine.transition).toHaveBeenCalledWith('authenticated');
    expect(result).toBe(mockAuthResponse);
  });

  it('fetchUser 未配置 → login 成功后不调用 fetchUser', async () => {
    const result = await loginWithValidation({
      pluginManager: mockPluginManager,
      tokenManager: mockTokenManager,
      stateMachine: mockStateMachine,
      config: { plugins: [] }, // 不配置 fetchUser
      swrMutate: mockSwrMutate,
      authKey: AUTH_KEY,
      pluginName: 'password',
      credentials: {},
    });

    // SWR mutate 不应被调用
    expect(mockSwrMutate).not.toHaveBeenCalled();
    // 状态机应正常转为 authenticated
    expect(mockStateMachine.transition).toHaveBeenCalledWith('authenticated');
    expect(result).toBe(mockAuthResponse);
  });

  it('validateUserOnLogin: true（显式）+ fetchUser 成功 → 正常工作', async () => {
    const mockUser = { id: 'u1' };
    const fetchUser = vi.fn().mockResolvedValue(mockUser);

    const result = await loginWithValidation({
      pluginManager: mockPluginManager,
      tokenManager: mockTokenManager,
      stateMachine: mockStateMachine,
      config: { plugins: [], fetchUser, validateUserOnLogin: true },
      swrMutate: mockSwrMutate,
      authKey: AUTH_KEY,
      pluginName: 'password',
      credentials: {},
    });

    expect(fetchUser).toHaveBeenCalledWith('access-token-123');
    expect(mockSwrMutate).toHaveBeenCalledWith(AUTH_KEY, mockUser, { revalidate: false });
    expect(result).toBe(mockAuthResponse);
  });

  it('fetchUser 失败后不应写入 SWR 缓存', async () => {
    const fetchUser = vi.fn().mockRejectedValue(new Error('forbidden'));

    await expect(
      loginWithValidation({
        pluginManager: mockPluginManager,
        tokenManager: mockTokenManager,
        stateMachine: mockStateMachine,
        config: { plugins: [], fetchUser },
        swrMutate: mockSwrMutate,
        authKey: AUTH_KEY,
        pluginName: 'password',
        credentials: {},
      }),
    ).rejects.toThrow('forbidden');

    // SWR mutate 不应被调用（fetchUser 在 mutate 之前就失败了）
    expect(mockSwrMutate).not.toHaveBeenCalled();
  });
});
