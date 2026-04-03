import { describe, expect, it, vi } from 'vitest';
import { AuthEventEmitter } from '../event-emitter';
import { PluginManager } from '../plugin-manager';
import { AuthStateMachine } from '../state-machine';
import { TokenManager } from '../token-manager';
import type { AuthResponse, MultiStepLoginPlugin, SWRLoginPlugin, TokenAdapter } from '../types';
import { isMultiStepPlugin } from '../types';

// ─── Mocks ───────────────────────────────────────────────────

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
  return { emitter, stateMachine, tokenManager, pluginManager };
}

const mockAuthResponse: AuthResponse = {
  user: { id: 'user-1', name: 'Alice' },
  accessToken: 'test-token',
  expiresAt: Date.now() + 3600000,
};

// ─── 多步骤插件 Mock ─────────────────────────────────────────

function createMockMultiStepPlugin(): MultiStepLoginPlugin<{ code: string }> {
  return {
    name: 'multi-step-test',
    type: 'multi-step',
    steps: [
      {
        name: 'step-1',
        execute: vi.fn(async (input: { code: string }) => ({
          token: `token-for-${input.code}`,
        })),
      },
      {
        name: 'step-2',
        execute: vi.fn(async (input: { token: string; userId: string }) => ({
          skey: `skey-${input.userId}`,
          userId: input.userId,
        })),
      },
    ],
    finalizeAuth: vi.fn(async (lastOutput: unknown) => {
      const output = lastOutput as { skey: string; userId: string };
      return {
        user: { id: output.userId, name: '' },
        accessToken: output.skey,
        expiresAt: Date.now() + 86400000,
      };
    }),
    login: vi.fn(async () => {
      throw new Error('Use useMultiStepLogin() for multi-step plugins');
    }),
  };
}

// ─── isMultiStepPlugin 类型守卫 ──────────────────────────────

describe('isMultiStepPlugin', () => {
  it('应正确识别多步骤插件', () => {
    const plugin = createMockMultiStepPlugin();
    expect(isMultiStepPlugin(plugin)).toBe(true);
  });

  it('应正确排除普通插件', () => {
    const plugin: SWRLoginPlugin = {
      name: 'password',
      type: 'password',
      login: async () => mockAuthResponse,
    };
    expect(isMultiStepPlugin(plugin)).toBe(false);
  });

  it('应排除 type 为 multi-step 但没有 steps 的插件', () => {
    const plugin = {
      name: 'fake',
      type: 'multi-step' as const,
      login: async () => mockAuthResponse,
    } as SWRLoginPlugin;
    expect(isMultiStepPlugin(plugin)).toBe(false);
  });
});

// ─── PluginManager.getSteps ──────────────────────────────────

describe('PluginManager.getSteps', () => {
  it('应返回多步骤插件的步骤列表', () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    const steps = pluginManager.getSteps('multi-step-test');
    expect(steps).toHaveLength(2);
    expect(steps?.[0].name).toBe('step-1');
    expect(steps?.[1].name).toBe('step-2');
  });

  it('对普通插件应返回 null', () => {
    const { pluginManager } = createTestEnv();
    const plugin: SWRLoginPlugin = {
      name: 'password',
      type: 'password',
      login: async () => mockAuthResponse,
    };
    pluginManager.register(plugin);

    expect(pluginManager.getSteps('password')).toBeNull();
  });

  it('对不存在的插件应返回 null', () => {
    const { pluginManager } = createTestEnv();
    expect(pluginManager.getSteps('non-existent')).toBeNull();
  });
});

// ─── PluginManager.executeStep ───────────────────────────────

describe('PluginManager.executeStep', () => {
  it('应成功执行指定步骤并返回输出', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    const output = await pluginManager.executeStep('multi-step-test', 0, { code: 'ABC123' });
    expect(output).toEqual({ token: 'token-for-ABC123' });
    expect(plugin.steps[0].execute).toHaveBeenCalledTimes(1);
  });

  it('应将输入正确传递给步骤', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    await pluginManager.executeStep('multi-step-test', 1, { token: 't1', userId: 'u1' });
    expect(plugin.steps[1].execute).toHaveBeenCalledWith(
      { token: 't1', userId: 'u1' },
      expect.objectContaining({ getAccessToken: expect.any(Function) }),
    );
  });

  it('对不存在的插件应抛出 PluginNotFoundError', async () => {
    const { pluginManager } = createTestEnv();
    await expect(pluginManager.executeStep('non-existent', 0, {})).rejects.toThrow(
      'not registered',
    );
  });

  it('对非多步骤插件应抛出 PluginTypeMismatchError', async () => {
    const { pluginManager } = createTestEnv();
    pluginManager.register({
      name: 'password',
      type: 'password',
      login: async () => mockAuthResponse,
    });

    await expect(pluginManager.executeStep('password', 0, {})).rejects.toThrow(
      'not a multi-step plugin',
    );
  });

  it('步骤索引越界应抛出 StepOutOfRangeError', async () => {
    const { pluginManager } = createTestEnv();
    pluginManager.register(createMockMultiStepPlugin());

    await expect(pluginManager.executeStep('multi-step-test', 5, {})).rejects.toThrow(
      'out of range',
    );
  });

  it('步骤索引为负数应抛出 StepOutOfRangeError', async () => {
    const { pluginManager } = createTestEnv();
    pluginManager.register(createMockMultiStepPlugin());

    await expect(pluginManager.executeStep('multi-step-test', -1, {})).rejects.toThrow(
      'out of range',
    );
  });

  it('步骤执行失败应抛出 StepExecutionError', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    (plugin.steps[0].execute as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error'),
    );
    pluginManager.register(plugin);

    await expect(pluginManager.executeStep('multi-step-test', 0, { code: 'fail' })).rejects.toThrow(
      'Step "step-1"',
    );
  });
});

// ─── PluginManager.finalizeMultiStep ─────────────────────────

describe('PluginManager.finalizeMultiStep', () => {
  it('应调用 finalizeAuth 并返回 AuthResponse', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    const response = await pluginManager.finalizeMultiStep('multi-step-test', {
      skey: 'test-skey',
      userId: 'user-1',
    });

    expect(response.user.id).toBe('user-1');
    expect(response.accessToken).toBe('test-skey');
    expect(plugin.finalizeAuth).toHaveBeenCalledTimes(1);
  });

  it('应自动存储 token', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    await pluginManager.finalizeMultiStep('multi-step-test', {
      skey: 'test-skey',
      userId: 'user-1',
    });

    expect(mockAdapter.setAccessToken).toHaveBeenCalledWith('test-skey');
  });

  it('应发射 login 事件', async () => {
    const { pluginManager, emitter } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    pluginManager.register(plugin);

    const loginHandler = vi.fn();
    emitter.on('login', loginHandler);

    await pluginManager.finalizeMultiStep('multi-step-test', {
      skey: 'test-skey',
      userId: 'user-1',
    });

    expect(loginHandler).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 'user-1' }) }),
    );
  });

  it('没有 finalizeAuth 时应直接使用最后一步输出作为 AuthResponse', async () => {
    const { pluginManager } = createTestEnv();
    const plugin = createMockMultiStepPlugin();
    // 移除 finalizeAuth
    plugin.finalizeAuth = undefined;
    pluginManager.register(plugin);

    const directResponse: AuthResponse = {
      user: { id: 'direct-user' },
      accessToken: 'direct-token',
      expiresAt: Date.now() + 3600000,
    };

    const response = await pluginManager.finalizeMultiStep('multi-step-test', directResponse);
    expect(response.user.id).toBe('direct-user');
    expect(response.accessToken).toBe('direct-token');
  });

  it('对不存在的插件应抛出 PluginNotFoundError', async () => {
    const { pluginManager } = createTestEnv();
    await expect(pluginManager.finalizeMultiStep('non-existent', {})).rejects.toThrow(
      'not registered',
    );
  });

  it('对非多步骤插件应抛出 PluginTypeMismatchError', async () => {
    const { pluginManager } = createTestEnv();
    pluginManager.register({
      name: 'password',
      type: 'password',
      login: async () => mockAuthResponse,
    });

    await expect(pluginManager.finalizeMultiStep('password', {})).rejects.toThrow(
      'not a multi-step plugin',
    );
  });
});
