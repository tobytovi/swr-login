import { describe, it, expect, vi } from 'vitest';
import { passkey } from '../../presets/passkey';

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

vi.mock('@swr-login/plugin-passkey', () => ({
  PasskeyPlugin: vi.fn((options) => ({
    _type: 'passkey-plugin',
    _options: options,
    name: 'passkey',
    type: 'passkey',
    login: vi.fn(),
  })),
}));

const basePasskeyOptions = {
  registerOptionsUrl: '/api/auth/passkey/register/options',
  registerVerifyUrl: '/api/auth/passkey/register/verify',
  loginOptionsUrl: '/api/auth/passkey/login/options',
  loginVerifyUrl: '/api/auth/passkey/login/verify',
};

describe('presets.passkey', () => {
  it('应返回包含 adapter 和 PasskeyPlugin 的完整配置', () => {
    const config = passkey(basePasskeyOptions);

    expect(config.adapter).toBeDefined();
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe('passkey');
  });

  it('应将所有 URL 参数传递给 PasskeyPlugin', () => {
    const config = passkey(basePasskeyOptions);

    const plugin = config.plugins[0] as any;
    expect(plugin._options.registerOptionsUrl).toBe('/api/auth/passkey/register/options');
    expect(plugin._options.registerVerifyUrl).toBe('/api/auth/passkey/register/verify');
    expect(plugin._options.loginOptionsUrl).toBe('/api/auth/passkey/login/options');
    expect(plugin._options.loginVerifyUrl).toBe('/api/auth/passkey/login/verify');
  });

  it('应将 rpId 传递给 PasskeyPlugin', () => {
    const config = passkey({
      ...basePasskeyOptions,
      rpId: 'example.com',
    });

    const plugin = config.plugins[0] as any;
    expect(plugin._options.rpId).toBe('example.com');
  });

  it('当提供 userUrl 时应自动生成 fetchUser', () => {
    const config = passkey({
      ...basePasskeyOptions,
      userUrl: '/api/me',
    });

    expect(config.fetchUser).toBeDefined();
    expect(typeof config.fetchUser).toBe('function');
  });

  it('当提供自定义 fetchUser 时应优先使用', () => {
    const customFetchUser = async (token: string) => ({ id: '1' });

    const config = passkey({
      ...basePasskeyOptions,
      userUrl: '/api/me',
      fetchUser: customFetchUser,
    });

    expect(config.fetchUser).toBe(customFetchUser);
  });

  it('当未提供 userUrl 和 fetchUser 时 fetchUser 应为 undefined', () => {
    const config = passkey(basePasskeyOptions);

    expect(config.fetchUser).toBeUndefined();
  });

  it('应将 adapterOptions 传递给 JWTAdapter', () => {
    const config = passkey({
      ...basePasskeyOptions,
      adapterOptions: { storage: 'memory' },
    });

    const adapter = config.adapter as any;
    expect(adapter._options).toEqual({ storage: 'memory' });
  });

  it('应合并扩展字段', () => {
    const onLogin = vi.fn();
    const onError = vi.fn();

    const config = passkey({
      ...basePasskeyOptions,
      onLogin,
      onError,
      security: { clearOnHidden: true, clearOnHiddenDelay: 60000 },
    });

    expect(config.onLogin).toBe(onLogin);
    expect(config.onError).toBe(onError);
    expect(config.security).toEqual({ clearOnHidden: true, clearOnHiddenDelay: 60000 });
  });
});
