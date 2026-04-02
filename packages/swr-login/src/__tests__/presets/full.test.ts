import { describe, it, expect, vi } from 'vitest';
import { full } from '../../presets/full';

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

vi.mock('@swr-login/plugin-oauth-github', () => ({
  GitHubOAuthPlugin: vi.fn((options) => ({
    _type: 'github-plugin',
    _options: options,
    name: 'oauth-github',
    type: 'oauth',
    login: vi.fn(),
  })),
}));

vi.mock('@swr-login/plugin-oauth-google', () => ({
  GoogleOAuthPlugin: vi.fn((options) => ({
    _type: 'google-plugin',
    _options: options,
    name: 'oauth-google',
    type: 'oauth',
    login: vi.fn(),
  })),
}));

vi.mock('@swr-login/plugin-oauth-wechat', () => ({
  WeChatPlugin: vi.fn((options) => ({
    _type: 'wechat-plugin',
    _options: options,
    name: 'oauth-wechat',
    type: 'oauth',
    login: vi.fn(),
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

describe('presets.full', () => {
  it('应为所有渠道创建对应的插件', () => {
    const config = full({
      password: { loginUrl: '/api/auth/login' },
      providers: {
        github: { clientId: 'gh-client-id' },
        google: { clientId: 'google-client-id' },
        wechat: { appId: 'wx-app-id' },
      },
      passkey: {
        registerOptionsUrl: '/api/passkey/register/options',
        registerVerifyUrl: '/api/passkey/register/verify',
        loginOptionsUrl: '/api/passkey/login/options',
        loginVerifyUrl: '/api/passkey/login/verify',
      },
    });

    expect(config.plugins).toHaveLength(5); // password + 3 social + passkey
    const names = config.plugins.map((p) => p.name);
    expect(names).toContain('password');
    expect(names).toContain('oauth-github');
    expect(names).toContain('oauth-google');
    expect(names).toContain('oauth-wechat');
    expect(names).toContain('passkey');
  });

  it('应支持仅配置部分渠道', () => {
    const config = full({
      password: { loginUrl: '/api/auth/login' },
      providers: { github: { clientId: 'gh-client-id' } },
    });

    expect(config.plugins).toHaveLength(2); // password + github
    const names = config.plugins.map((p) => p.name);
    expect(names).toContain('password');
    expect(names).toContain('oauth-github');
  });

  it('应支持仅密码登录', () => {
    const config = full({
      password: { loginUrl: '/api/auth/login' },
    });

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe('password');
  });

  it('应支持仅 Passkey 登录', () => {
    const config = full({
      passkey: {
        registerOptionsUrl: '/api/passkey/register/options',
        registerVerifyUrl: '/api/passkey/register/verify',
        loginOptionsUrl: '/api/passkey/login/options',
        loginVerifyUrl: '/api/passkey/login/verify',
      },
    });

    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe('passkey');
  });

  it('当未配置任何渠道时应抛出错误', () => {
    expect(() => {
      full({});
    }).toThrow('至少需要配置一个认证渠道');
  });

  it('当 providers 为空对象且无其他渠道时应抛出错误', () => {
    expect(() => {
      full({ providers: {} });
    }).toThrow('至少需要配置一个认证渠道');
  });

  it('应将密码插件选项正确传递', () => {
    const config = full({
      password: {
        loginUrl: '/api/auth/login',
        logoutUrl: '/api/auth/logout',
      },
    });

    const plugin = config.plugins[0] as any;
    expect(plugin._options.loginUrl).toBe('/api/auth/login');
    expect(plugin._options.logoutUrl).toBe('/api/auth/logout');
  });

  it('应将 Passkey 插件选项正确传递', () => {
    const config = full({
      passkey: {
        registerOptionsUrl: '/api/passkey/register/options',
        registerVerifyUrl: '/api/passkey/register/verify',
        loginOptionsUrl: '/api/passkey/login/options',
        loginVerifyUrl: '/api/passkey/login/verify',
        rpId: 'example.com',
      },
    });

    const plugin = config.plugins[0] as any;
    expect(plugin._options.rpId).toBe('example.com');
  });

  it('当提供 userUrl 时应自动生成 fetchUser', () => {
    const config = full({
      password: { loginUrl: '/api/auth/login' },
      userUrl: '/api/me',
    });

    expect(config.fetchUser).toBeDefined();
    expect(typeof config.fetchUser).toBe('function');
  });

  it('当提供自定义 fetchUser 时应优先使用', () => {
    const customFetchUser = async (token: string) => ({ id: '1' });

    const config = full({
      password: { loginUrl: '/api/auth/login' },
      userUrl: '/api/me',
      fetchUser: customFetchUser,
    });

    expect(config.fetchUser).toBe(customFetchUser);
  });

  it('应合并扩展字段', () => {
    const onLogin = vi.fn();
    const onLogout = vi.fn();

    const config = full({
      password: { loginUrl: '/api/auth/login' },
      onLogin,
      onLogout,
      security: { enableBroadcastSync: false },
    });

    expect(config.onLogin).toBe(onLogin);
    expect(config.onLogout).toBe(onLogout);
    expect(config.security).toEqual({ enableBroadcastSync: false });
  });

  it('应将 adapterOptions 传递给 JWTAdapter', () => {
    const config = full({
      password: { loginUrl: '/api/auth/login' },
      adapterOptions: { storage: 'sessionStorage' },
    });

    const adapter = config.adapter as any;
    expect(adapter._options).toEqual({ storage: 'sessionStorage' });
  });
});
