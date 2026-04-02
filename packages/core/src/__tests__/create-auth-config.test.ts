import { describe, it, expect } from 'vitest';
import { createAuthConfig } from '../create-auth-config';
import type { SWRLoginConfig, TokenAdapter, SWRLoginPlugin } from '../types';

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
});
