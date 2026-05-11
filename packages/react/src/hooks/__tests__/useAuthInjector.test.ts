import { AuthEventEmitter } from '@swr-login/core';
import { AuthStateMachine } from '@swr-login/core';
import type { AuthResponse, AuthState, SWRLoginConfig, TokenAdapter } from '@swr-login/core';
import { TokenManager } from '@swr-login/core';
/**
 * useAuthInjector 的状态转换逻辑测试。
 *
 * 由于 useAuthInjector 是 React Hook，在非 React 渲染环境中无法直接调用。
 * 这里我们独立测试 `injectAuth` 内部的核心逻辑（与 useAuthInjector.ts 的 useCallback 体内一致）：
 *
 * 1. tokenManager.setTokens
 * 2. 状态机转换（含 error/unauthenticated 起点的两步跳转）
 * 3. emitter.emit('login')
 * 4. cacheAdapter.setUser
 *
 * 重点验证 `error -> authenticating -> authenticated` 与 `unauthenticated -> authenticating -> authenticated`
 * 这两条"逃生舱"路径，确保不会触发 `[swr-login] Invalid state transition` 警告。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── 与 useAuthInjector.ts 中 injectAuth 的核心逻辑一致 ──────────

async function runInjectAuth(params: {
  tokenManager: TokenManager;
  stateMachine: AuthStateMachine;
  emitter: AuthEventEmitter;
  config: Partial<SWRLoginConfig>;
  response: AuthResponse;
}): Promise<void> {
  const { tokenManager, stateMachine, emitter, config, response } = params;

  // 1. 存储 token
  tokenManager.setTokens({
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: response.expiresAt,
  });

  // 2. 状态机转换为已认证（error / unauthenticated 起点需经 authenticating 中转）
  const currentState = stateMachine.state;
  if (currentState === 'error' || currentState === 'unauthenticated') {
    stateMachine.transition('authenticating');
  }
  stateMachine.transition('authenticated');

  // 3. 发射 login 事件
  emitter.emit('login', { user: response.user });

  // 4. 更新缓存
  if (config.cacheAdapter) {
    await config.cacheAdapter.setUser(response.user);
  }
}

// ── 工具：构造干净的测试上下文 ───────────────────────────────

function createMockAdapter(): TokenAdapter {
  return {
    getAccessToken: () => null,
    setAccessToken: vi.fn(),
    getRefreshToken: () => null,
    setRefreshToken: vi.fn(),
    getExpiresAt: () => null,
    setExpiresAt: vi.fn(),
    clear: vi.fn(),
  };
}

function createTestEnv(initialState: AuthState = 'idle') {
  const emitter = new AuthEventEmitter();
  const stateMachine = new AuthStateMachine(emitter, initialState);
  const tokenManager = new TokenManager(createMockAdapter(), emitter, stateMachine);
  return { emitter, stateMachine, tokenManager };
}

const mockResponse: AuthResponse = {
  user: { id: 'u-1', name: 'Alice' },
  accessToken: 'tok-1',
  expiresAt: Date.now() + 3_600_000,
};

// ── 测试 ─────────────────────────────────────────────────────

describe('useAuthInjector / injectAuth', () => {
  // 用于捕获 console.warn（验证不触发 Invalid state transition 警告）
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('从 idle 起点应能直接转到 authenticated 并派发 login 事件', async () => {
    const env = createTestEnv('idle');
    const loginSpy = vi.fn();
    env.emitter.on('login', loginSpy);

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    expect(env.stateMachine.state).toBe('authenticated');
    expect(loginSpy).toHaveBeenCalledWith({ user: mockResponse.user });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('从 error 起点应通过 authenticating 中转到 authenticated（核心 fix）', async () => {
    const env = createTestEnv('error');
    const transitions: Array<{ from: AuthState; to: AuthState }> = [];
    env.emitter.on('state-change', (e) => {
      transitions.push({ from: e.from, to: e.to });
    });
    const loginSpy = vi.fn();
    env.emitter.on('login', loginSpy);

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    // 应有两步转换：error -> authenticating -> authenticated
    expect(transitions).toEqual([
      { from: 'error', to: 'authenticating' },
      { from: 'authenticating', to: 'authenticated' },
    ]);
    expect(env.stateMachine.state).toBe('authenticated');
    expect(loginSpy).toHaveBeenCalledTimes(1);
    // 关键：不应触发 Invalid state transition 警告
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Invalid state transition'));
  });

  it('从 unauthenticated 起点应通过 authenticating 中转到 authenticated', async () => {
    const env = createTestEnv('unauthenticated');
    const transitions: Array<{ from: AuthState; to: AuthState }> = [];
    env.emitter.on('state-change', (e) => {
      transitions.push({ from: e.from, to: e.to });
    });

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    expect(transitions).toEqual([
      { from: 'unauthenticated', to: 'authenticating' },
      { from: 'authenticating', to: 'authenticated' },
    ]);
    expect(env.stateMachine.state).toBe('authenticated');
    expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Invalid state transition'));
  });

  it('从 authenticating 起点应直接转到 authenticated（无需中转）', async () => {
    const env = createTestEnv('authenticating');
    const transitions: Array<{ from: AuthState; to: AuthState }> = [];
    env.emitter.on('state-change', (e) => {
      transitions.push({ from: e.from, to: e.to });
    });

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    // 仅一步：authenticating -> authenticated
    expect(transitions).toEqual([{ from: 'authenticating', to: 'authenticated' }]);
    expect(env.stateMachine.state).toBe('authenticated');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('从 refreshing 起点应直接转到 authenticated（无需中转）', async () => {
    const env = createTestEnv('refreshing');
    const transitions: Array<{ from: AuthState; to: AuthState }> = [];
    env.emitter.on('state-change', (e) => {
      transitions.push({ from: e.from, to: e.to });
    });

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    expect(transitions).toEqual([{ from: 'refreshing', to: 'authenticated' }]);
    expect(env.stateMachine.state).toBe('authenticated');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('从 authenticated 起点应保持不变（state-machine 中 from === to 直接 return）', async () => {
    const env = createTestEnv('authenticated');
    const transitions: Array<{ from: AuthState; to: AuthState }> = [];
    env.emitter.on('state-change', (e) => {
      transitions.push({ from: e.from, to: e.to });
    });
    const loginSpy = vi.fn();
    env.emitter.on('login', loginSpy);

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    // 不应有 state 变更（authenticated -> authenticated 是 no-op）
    expect(transitions).toEqual([]);
    expect(env.stateMachine.state).toBe('authenticated');
    // login 事件仍被派发（即便状态不变）
    expect(loginSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('应调用 tokenManager.setTokens 写入正确的 token', async () => {
    const env = createTestEnv('error');
    const setTokensSpy = vi.spyOn(env.tokenManager, 'setTokens');

    await runInjectAuth({ ...env, config: {}, response: mockResponse });

    expect(setTokensSpy).toHaveBeenCalledWith({
      accessToken: 'tok-1',
      refreshToken: undefined,
      expiresAt: mockResponse.expiresAt,
    });
  });

  it('当 config.cacheAdapter 存在时应调用 setUser', async () => {
    const env = createTestEnv('error');
    const setUserSpy = vi.fn().mockResolvedValue(undefined);
    const config: Partial<SWRLoginConfig> = {
      cacheAdapter: {
        useAuth: vi.fn(),
        setUser: setUserSpy,
        clearUser: vi.fn(),
        revalidate: vi.fn(),
      } as unknown as SWRLoginConfig['cacheAdapter'],
    };

    await runInjectAuth({ ...env, config, response: mockResponse });

    expect(setUserSpy).toHaveBeenCalledWith(mockResponse.user);
  });
});
