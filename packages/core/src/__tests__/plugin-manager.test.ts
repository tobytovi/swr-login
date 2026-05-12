import { describe, expect, it, vi } from 'vitest';
import { AuthEventEmitter } from '../event-emitter';
import { PluginManager } from '../plugin-manager';
import { AuthStateMachine } from '../state-machine';
import { TokenManager } from '../token-manager';
import type { AuthResponse, PluginContext, SWRLoginPlugin, TokenAdapter } from '../types';

const mockAdapter: TokenAdapter = {
  getAccessToken: () => null,
  setAccessToken: vi.fn(),
  getRefreshToken: () => null,
  setRefreshToken: vi.fn(),
  getExpiresAt: () => null,
  setExpiresAt: vi.fn(),
  clear: vi.fn(),
};

function createTestEnv() {
  const emitter = new AuthEventEmitter();
  const stateMachine = new AuthStateMachine(emitter);
  const tokenManager = new TokenManager(mockAdapter, emitter, stateMachine);
  const pluginManager = new PluginManager(tokenManager, emitter);
  return { pluginManager };
}

const mockAuthResponse: AuthResponse = {
  user: { id: 'user-1', name: 'Alice' },
  accessToken: 'test-token',
  expiresAt: Date.now() + 3_600_000,
};

/**
 * 创建一个会捕获 ctx.loginContext 的 spy 插件
 */
function createSpyPlugin() {
  const captured: { ctx?: PluginContext; credentials?: unknown }[] = [];
  const plugin: SWRLoginPlugin<{ user: string }> = {
    name: 'spy',
    type: 'password',
    async login(credentials, ctx) {
      captured.push({ ctx, credentials });
      return mockAuthResponse;
    },
  };
  return { plugin, captured };
}

describe('PluginManager - login options.context 透传', () => {
  it('login(name, creds, { context }) 应将 context 透传到 ctx.loginContext', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    const userContext = { variant: 'teacher', traceId: 'abc' };
    await pluginManager.login('spy', { user: 'alice' }, { context: userContext });

    expect(captured).toHaveLength(1);
    expect(captured[0].ctx?.loginContext).toBe(userContext);
    expect(captured[0].ctx?.loginContext).toEqual({ variant: 'teacher', traceId: 'abc' });
  });

  it('login(name, creds) 不传 options 时 ctx.loginContext 应为 undefined', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' });

    expect(captured).toHaveLength(1);
    expect(captured[0].ctx?.loginContext).toBeUndefined();
  });

  it('login(name, creds, {}) 传空 options 时 ctx.loginContext 应为 undefined', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' }, {});

    expect(captured).toHaveLength(1);
    expect(captured[0].ctx?.loginContext).toBeUndefined();
  });

  it('login(name, creds, { context: null }) → ctx.loginContext 为 null（透传任意 unknown 值）', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' }, { context: null });

    expect(captured).toHaveLength(1);
    expect(captured[0].ctx?.loginContext).toBeNull();
  });

  it('两次 login 各自传不同 context → 每次插件收到对应的 context', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' }, { context: { variant: 'teacher' } });
    await pluginManager.login('spy', { user: 'bob' }, { context: { variant: 'student' } });

    expect(captured).toHaveLength(2);
    expect(captured[0].ctx?.loginContext).toEqual({ variant: 'teacher' });
    expect(captured[1].ctx?.loginContext).toEqual({ variant: 'student' });
  });

  it('原始字符串 context 也能正确透传', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' }, { context: 'simple-string' });

    expect(captured[0].ctx?.loginContext).toBe('simple-string');
  });

  it('插件 login 函数仍然能拿到 ctx 上原有的方法（getAccessToken 等）', async () => {
    const { pluginManager } = createTestEnv();
    const { plugin, captured } = createSpyPlugin();
    pluginManager.register(plugin);

    await pluginManager.login('spy', { user: 'alice' }, { context: { tag: 1 } });

    const ctx = captured[0].ctx;
    expect(typeof ctx?.getAccessToken).toBe('function');
    expect(typeof ctx?.getRefreshToken).toBe('function');
    expect(typeof ctx?.setTokens).toBe('function');
    expect(typeof ctx?.clearTokens).toBe('function');
    expect(ctx?.loginContext).toEqual({ tag: 1 });
  });
});
