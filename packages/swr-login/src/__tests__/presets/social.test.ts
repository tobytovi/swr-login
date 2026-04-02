import { describe, it, expect, vi } from 'vitest';
import { social } from '../../presets/social';

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

describe('presets.social', () => {
  it('应为单个渠道创建对应的插件', () => {
    const config = social({
      providers: {
        github: { clientId: 'gh-client-id' },
      },
    });

    expect(config.adapter).toBeDefined();
    expect(config.plugins).toHaveLength(1);
    expect(config.plugins[0].name).toBe('oauth-github');
  });

  it('应为多个渠道创建对应的插件', () => {
    const config = social({
      providers: {
        github: { clientId: 'gh-client-id' },
        google: { clientId: 'google-client-id' },
        wechat: { appId: 'wx-app-id' },
      },
    });

    expect(config.plugins).toHaveLength(3);
    const names = config.plugins.map((p) => p.name);
    expect(names).toContain('oauth-github');
    expect(names).toContain('oauth-google');
    expect(names).toContain('oauth-wechat');
  });

  it('应将渠道选项透传给对应的插件工厂函数', () => {
    const config = social({
      providers: {
        github: {
          clientId: 'gh-client-id',
          tokenEndpoint: '/api/auth/github/callback',
          redirectUri: 'http://localhost:3000/callback',
        },
      },
    });

    const plugin = config.plugins[0] as any;
    expect(plugin._options.clientId).toBe('gh-client-id');
    expect(plugin._options.tokenEndpoint).toBe('/api/auth/github/callback');
    expect(plugin._options.redirectUri).toBe('http://localhost:3000/callback');
  });

  it('当 providers 为空对象时应抛出错误', () => {
    expect(() => {
      social({ providers: {} });
    }).toThrow('至少需要配置一个社交登录渠道');
  });

  it('当提供 userUrl 时应自动生成 fetchUser', () => {
    const config = social({
      providers: { github: { clientId: 'gh-client-id' } },
      userUrl: '/api/me',
    });

    expect(config.fetchUser).toBeDefined();
    expect(typeof config.fetchUser).toBe('function');
  });

  it('当提供自定义 fetchUser 时应优先使用', () => {
    const customFetchUser = async (token: string) => ({ id: '1' });

    const config = social({
      providers: { github: { clientId: 'gh-client-id' } },
      userUrl: '/api/me',
      fetchUser: customFetchUser,
    });

    expect(config.fetchUser).toBe(customFetchUser);
  });

  it('应合并扩展字段', () => {
    const onLogin = vi.fn();

    const config = social({
      providers: { github: { clientId: 'gh-client-id' } },
      onLogin,
      security: { enableBroadcastSync: true },
    });

    expect(config.onLogin).toBe(onLogin);
    expect(config.security).toEqual({ enableBroadcastSync: true });
  });

  it('应将 adapterOptions 传递给 JWTAdapter', () => {
    const config = social({
      providers: { github: { clientId: 'gh-client-id' } },
      adapterOptions: { storage: 'memory', prefix: 'myapp' },
    });

    const adapter = config.adapter as any;
    expect(adapter._options).toEqual({ storage: 'memory', prefix: 'myapp' });
  });
});
