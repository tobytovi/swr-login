import { describe, expect, it } from 'vitest';
import { createAuthConfig } from '../create-auth-config';
import type { SWRLoginConfig, SWRLoginPlugin, TokenAdapter } from '../types';

// 模拟 TokenAdapter
const mockAdapter: TokenAdapter = {
  getAccessToken: () => null,
  setAccessToken: () => {},
  getRefreshToken: () => null,
  setRefreshToken: () => {},
  getExpiresAt: () => null,
  setExpiresAt: () => {},
  clear: () => {},
};

// 模拟 Plugin
const mockPlugin: SWRLoginPlugin = {
  name: 'mock-plugin',
  type: 'password',
  login: async () => ({
    user: { id: '1' },
    accessToken: 'token',
    expiresAt: Date.now() + 3600000,
  }),
};

describe('createAuthConfig', () => {
  it('应返回与传入参数完全相同的配置对象', () => {
    const config: SWRLoginConfig = {
      adapter: mockAdapter,
      plugins: [mockPlugin],
    };

    const result = createAuthConfig(config);
    expect(result).toBe(config); // 引用相同
  });

  it('应保留所有配置字段', () => {
    const fetchUser = async (token: string) => ({ id: '1', name: 'Test' });
    const onLogin = () => {};
    const onLogout = () => {};
    const onError = () => {};

    const config: SWRLoginConfig = {
      adapter: mockAdapter,
      plugins: [mockPlugin],
      fetchUser,
      onLogin,
      onLogout,
      onError,
      security: {
        enableBroadcastSync: true,
        clearOnHidden: false,
      },
    };

    const result = createAuthConfig(config);

    expect(result.adapter).toBe(mockAdapter);
    expect(result.plugins).toEqual([mockPlugin]);
    expect(result.fetchUser).toBe(fetchUser);
    expect(result.onLogin).toBe(onLogin);
    expect(result.onLogout).toBe(onLogout);
    expect(result.onError).toBe(onError);
    expect(result.security).toEqual({
      enableBroadcastSync: true,
      clearOnHidden: false,
    });
  });

  it('应支持最小配置（仅 adapter + plugins）', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
    });

    expect(config.adapter).toBe(mockAdapter);
    expect(config.plugins).toEqual([]);
    expect(config.fetchUser).toBeUndefined();
    expect(config.onLogin).toBeUndefined();
  });

  it('返回值应满足 SWRLoginConfig 类型约束', () => {
    const config: SWRLoginConfig = createAuthConfig({
      adapter: mockAdapter,
      plugins: [mockPlugin],
    });

    // 类型检查：确保返回值可赋值给 SWRLoginConfig
    expect(config).toBeDefined();
    expect(config.adapter).toBeDefined();
    expect(config.plugins).toBeDefined();
  });

  // ── validateUserOnLogin & onFetchUserError ──────────────────

  it('未设置 validateUserOnLogin 时应为 undefined（消费方视为 true）', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
    });

    expect(config.validateUserOnLogin).toBeUndefined();
  });

  it('应保留 validateUserOnLogin 为 true 的配置', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
      validateUserOnLogin: true,
    });

    expect(config.validateUserOnLogin).toBe(true);
  });

  it('应保留 validateUserOnLogin 为 false 的配置', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
      validateUserOnLogin: false,
    });

    expect(config.validateUserOnLogin).toBe(false);
  });

  it('未设置 onFetchUserError 时应为 undefined', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
    });

    expect(config.onFetchUserError).toBeUndefined();
  });

  it('应保留 onFetchUserError 回调', () => {
    const handler = (error: Error): 'retry' | 'logout' | 'ignore' => {
      if (error.message.includes('disabled')) return 'logout';
      return 'ignore';
    };

    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
      onFetchUserError: handler,
    });

    expect(config.onFetchUserError).toBe(handler);
    // 验证回调返回值类型正确
    expect(config.onFetchUserError?.(new Error('account disabled'))).toBe('logout');
    expect(config.onFetchUserError?.(new Error('network timeout'))).toBe('ignore');
  });

  it('新增配置项应为可选（不传时不影响现有行为）', () => {
    // 仅传入必选字段，不传 validateUserOnLogin 和 onFetchUserError
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [mockPlugin],
      fetchUser: async () => ({ id: '1' }),
      onLogin: () => {},
    });

    expect(config.validateUserOnLogin).toBeUndefined();
    expect(config.onFetchUserError).toBeUndefined();
    expect(config.afterAuth).toBeUndefined();
    // 原有字段不受影响
    expect(config.fetchUser).toBeDefined();
    expect(config.onLogin).toBeDefined();
  });

  // ── afterAuth ───────────────────────────────────────────────

  it('未设置 afterAuth 时应为 undefined', () => {
    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
    });

    expect(config.afterAuth).toBeUndefined();
  });

  it('应保留 afterAuth 回调', () => {
    const afterAuth = async () => {};

    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
      afterAuth,
    });

    expect(config.afterAuth).toBe(afterAuth);
  });

  it('afterAuth 与 validateUserOnLogin 可同时配置', () => {
    const afterAuth = async () => {};

    const config = createAuthConfig({
      adapter: mockAdapter,
      plugins: [],
      afterAuth,
      validateUserOnLogin: true,
      fetchUser: async () => ({ id: '1' }),
    });

    expect(config.afterAuth).toBe(afterAuth);
    expect(config.validateUserOnLogin).toBe(true);
    expect(config.fetchUser).toBeDefined();
  });
});
