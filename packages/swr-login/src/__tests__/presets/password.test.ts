import { describe, expect, it, vi } from 'vitest';
import { password } from '../../presets/password';

// Mock 依赖模块
vi.mock('@swr-login/adapter-jwt', () => ({
  JWTAdapter: vi.fn((options = {}) => ({
    _type: 'jwt-adapter',
    _options: options,
    getAccessToken: () => null,
    setAccessToken: () => {},
    getRefreshToken: () => null,
    setRefreshToken: () => {},
    getExpiresAt: () => null,
    setExpiresAt: () => {},
    clear: () => {},
  })),
}));

vi.mock('@swr-login/plugin-password', () => ({
  PasswordPlugin: vi.fn((options) => ({
    _type: 'password-plugin',
    _options: options,
    name: 'password',
    type: 'password',
    login: vi.fn(),
  })),
}));

describe('presets.password', () => {
  it('应返回包含 adapter 和 plugins 的完整 SWRLoginConfig', () => {
    const config = password({
      loginUrl: '/api/auth/login',
    });

    expect(config.adapter).toBeDefined();
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe('password');
  });

  it('应将 loginUrl 和 logoutUrl 传递给 PasswordPlugin', () => {
    const config = password({
      loginUrl: '/api/auth/login',
      logoutUrl: '/api/auth/logout',
    });

    const plugin = config.plugins[0] as unknown as { _options: Record<string, unknown> };
    expect(plugin._options.loginUrl).toBe('/api/auth/login');
    expect(plugin._options.logoutUrl).toBe('/api/auth/logout');
  });

  it('应将 adapterOptions 传递给 JWTAdapter', () => {
    const config = password({
      loginUrl: '/api/auth/login',
      adapterOptions: { storage: 'sessionStorage' },
    });

    const adapter = config.adapter as unknown as { _options: Record<string, unknown> };
    expect(adapter._options).toEqual({ storage: 'sessionStorage' });
  });

  it('当提供 userUrl 时应自动生成 fetchUser', () => {
    const config = password({
      loginUrl: '/api/auth/login',
      userUrl: '/api/me',
    });

    expect(config.fetchUser).toBeDefined();
    expect(typeof config.fetchUser).toBe('function');
  });

  it('当提供自定义 fetchUser 时应优先使用', () => {
    const customFetchUser = async (token: string) => ({ id: '1' });

    const config = password({
      loginUrl: '/api/auth/login',
      userUrl: '/api/me',
      fetchUser: customFetchUser,
    });

    expect(config.fetchUser).toBe(customFetchUser);
  });

  it('当未提供 userUrl 和 fetchUser 时 fetchUser 应为 undefined', () => {
    const config = password({
      loginUrl: '/api/auth/login',
    });

    expect(config.fetchUser).toBeUndefined();
  });

  it('应合并扩展字段（onLogin、onLogout、onError、security）', () => {
    const onLogin = vi.fn();
    const onLogout = vi.fn();
    const onError = vi.fn();

    const config = password({
      loginUrl: '/api/auth/login',
      onLogin,
      onLogout,
      onError,
      security: { enableBroadcastSync: false },
    });

    expect(config.onLogin).toBe(onLogin);
    expect(config.onLogout).toBe(onLogout);
    expect(config.onError).toBe(onError);
    expect(config.security).toEqual({ enableBroadcastSync: false });
  });

  it('应将 fetchOptions 和 transformResponse 传递给 PasswordPlugin', () => {
    const transformResponse = (data: unknown) => data as Record<string, unknown>;

    const config = password({
      loginUrl: '/api/auth/login',
      fetchOptions: { credentials: 'include' },
      transformResponse,
    });

    const plugin = config.plugins[0] as unknown as { _options: Record<string, unknown> };
    expect(plugin._options.fetchOptions).toEqual({ credentials: 'include' });
    expect(plugin._options.transformResponse).toBe(transformResponse);
  });
});
