import {
  PluginInitError,
  PluginNotFoundError,
  PluginTypeMismatchError,
  StepExecutionError,
  StepOutOfRangeError,
} from './errors';
import type { AuthEventEmitter } from './event-emitter';
import type { TokenManager } from './token-manager';
import {
  type AuthResponse,
  type LoginStep,
  type PluginContext,
  type SWRLoginPlugin,
  isMultiStepPlugin,
} from './types';

/**
 * Plugin Manager handles registration, initialization, and invocation
 * of authentication plugins.
 *
 * Lifecycle: register -> initialize -> login/logout
 */
export class PluginManager {
  private plugins = new Map<string, SWRLoginPlugin>();
  private initialized = new Set<string>();
  private tokenManager: TokenManager;
  private emitter: AuthEventEmitter;

  constructor(tokenManager: TokenManager, emitter: AuthEventEmitter) {
    this.tokenManager = tokenManager;
    this.emitter = emitter;
  }

  /** Create plugin context for lifecycle methods */
  private createContext(): PluginContext {
    return {
      getAccessToken: () => this.tokenManager.getAccessToken(),
      getRefreshToken: () => this.tokenManager.getRefreshToken(),
      setTokens: (tokens) => this.tokenManager.setTokens(tokens),
      clearTokens: () => this.tokenManager.clearTokens(),
      origin: typeof window !== 'undefined' ? window.location.origin : '',
    };
  }

  /**
   * Register one or more plugins.
   * Plugins with duplicate names will overwrite previous registrations.
   */
  register(...plugins: SWRLoginPlugin[]): void {
    for (const plugin of plugins) {
      this.plugins.set(plugin.name, plugin);
    }
  }

  /**
   * Initialize a specific plugin.
   * No-op if already initialized or plugin has no initialize method.
   */
  async initializePlugin(name: string): Promise<void> {
    if (this.initialized.has(name)) return;

    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new PluginNotFoundError(name);
    }

    if (plugin.initialize) {
      try {
        await plugin.initialize(this.createContext());
      } catch (err) {
        throw new PluginInitError(name, err instanceof Error ? err : undefined);
      }
    }

    this.initialized.add(name);
  }

  /** Initialize all registered plugins */
  async initializeAll(): Promise<void> {
    const promises = Array.from(this.plugins.keys()).map((name) => this.initializePlugin(name));
    await Promise.allSettled(promises);
  }

  /**
   * Invoke a plugin's login method.
   *
   * @param pluginName - Name of the registered plugin
   * @param credentials - Plugin-specific credentials
   * @returns Standardized AuthResponse
   * @throws PluginNotFoundError if plugin is not registered
   */
  async login<TCredentials = unknown>(
    pluginName: string,
    credentials: TCredentials,
  ): Promise<AuthResponse> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new PluginNotFoundError(pluginName);
    }

    // Ensure plugin is initialized
    await this.initializePlugin(pluginName);

    const ctx = this.createContext();
    const response = await (plugin as SWRLoginPlugin<TCredentials>).login(credentials, ctx);

    // Store tokens
    this.tokenManager.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
    });

    // Emit login event
    this.emitter.emit('login', { user: response.user });

    return response;
  }

  /**
   * Invoke a plugin's logout method (if available), then clear tokens.
   */
  async logout(pluginName?: string): Promise<void> {
    if (pluginName) {
      const plugin = this.plugins.get(pluginName);
      if (plugin?.logout) {
        await plugin.logout(this.createContext());
      }
    }

    this.tokenManager.clearTokens();
    this.emitter.emit('logout', undefined);
  }

  /** Get a registered plugin by name */
  getPlugin<T extends SWRLoginPlugin = SWRLoginPlugin>(name: string): T | undefined {
    return this.plugins.get(name) as T | undefined;
  }

  /** Get all registered plugin names */
  getPluginNames(): string[] {
    return Array.from(this.plugins.keys());
  }

  /** Check if a plugin is registered */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  // ─── Multi-Step Plugin Support ──────────────────────────────

  /**
   * 获取多步骤插件的步骤列表。
   * 如果插件不存在或不是多步骤插件，返回 null。
   */
  getSteps(pluginName: string): LoginStep[] | null {
    const plugin = this.plugins.get(pluginName);
    if (!plugin || !isMultiStepPlugin(plugin)) return null;
    return plugin.steps;
  }

  /**
   * 执行多步骤插件的某一步。
   *
   * @param pluginName - 插件名称
   * @param stepIndex - 步骤索引（从 0 开始）
   * @param input - 步骤输入数据
   * @returns 步骤输出数据
   * @throws PluginNotFoundError 如果插件未注册
   * @throws PluginTypeMismatchError 如果插件不是多步骤插件
   * @throws StepOutOfRangeError 如果步骤索引越界
   * @throws StepExecutionError 如果步骤执行失败
   */
  async executeStep(pluginName: string, stepIndex: number, input: unknown): Promise<unknown> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new PluginNotFoundError(pluginName);
    }
    if (!isMultiStepPlugin(plugin)) {
      throw new PluginTypeMismatchError(pluginName, 'multi-step');
    }

    // 确保插件已初始化
    await this.initializePlugin(pluginName);

    if (stepIndex < 0 || stepIndex >= plugin.steps.length) {
      throw new StepOutOfRangeError(pluginName, stepIndex, plugin.steps.length);
    }

    const step = plugin.steps[stepIndex];
    const ctx = this.createContext();

    try {
      return await step.execute(input, ctx);
    } catch (err) {
      throw new StepExecutionError(
        pluginName,
        stepIndex,
        step.name,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * 执行多步骤插件的 finalizeAuth，将最后一步的输出转换为 AuthResponse。
   * 在最后一步完成后调用，自动存储 token 并发射登录事件。
   *
   * @param pluginName - 插件名称
   * @param lastStepOutput - 最后一步的输出数据
   * @returns 标准化的 AuthResponse
   */
  async finalizeMultiStep(pluginName: string, lastStepOutput: unknown): Promise<AuthResponse> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new PluginNotFoundError(pluginName);
    }
    if (!isMultiStepPlugin(plugin)) {
      throw new PluginTypeMismatchError(pluginName, 'multi-step');
    }

    const ctx = this.createContext();
    let response: AuthResponse;

    if (plugin.finalizeAuth) {
      response = await plugin.finalizeAuth(lastStepOutput, ctx);
    } else {
      // 假设最后一步输出就是 AuthResponse
      response = lastStepOutput as AuthResponse;
    }

    // 存储 token
    this.tokenManager.setTokens({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      expiresAt: response.expiresAt,
    });

    // 发射登录事件
    this.emitter.emit('login', { user: response.user });

    return response;
  }
}
