import type { AuthEventEmitter } from './event-emitter';
import { PluginInitError, PluginNotFoundError } from './errors';
import type { TokenManager } from './token-manager';
import type { AuthResponse, PluginContext, SWRLoginPlugin } from './types';

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
}
