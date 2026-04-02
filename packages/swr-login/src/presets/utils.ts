import type { SWRLoginConfig, User } from '@swr-login/core';
import type { JWTAdapterOptions } from '@swr-login/adapter-jwt';

/**
 * Preset 基础选项接口。
 * 所有预设工厂函数的 Options 类型都继承此接口。
 */
export interface BasePresetOptions
  extends Partial<
    Pick<SWRLoginConfig, 'onLogin' | 'onLogout' | 'onError' | 'security' | 'cacheAdapter'>
  > {
  /**
   * 用户信息接口 URL。
   * 当未提供自定义 `fetchUser` 时，系统将自动生成一个使用 Bearer token 请求该 URL 的函数。
   */
  userUrl?: string;

  /**
   * 自定义的用户信息获取函数。
   * 优先级高于 `userUrl`，当两者同时提供时，使用此函数。
   */
  fetchUser?: (token: string) => Promise<User>;

  /**
   * JWT 适配器选项（如 storage 策略、key 前缀等）。
   * 默认使用 `localStorage` 策略。
   */
  adapterOptions?: JWTAdapterOptions;
}

/**
 * 根据 URL 创建一个使用 Bearer token 请求用户信息的 fetchUser 函数。
 *
 * @param userUrl - 用户信息接口 URL
 * @returns fetchUser 函数
 *
 * @internal
 */
export function createFetchUser(userUrl: string): (token: string) => Promise<User> {
  return (token: string) =>
    fetch(userUrl, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
}

/**
 * 解析 BasePresetOptions 中的公共字段，返回可合并到 SWRLoginConfig 的部分配置。
 *
 * 优先级逻辑：
 * - 自定义 fetchUser > userUrl 自动生成 > undefined
 *
 * @param options - 基础预设选项
 * @returns 可合并到 SWRLoginConfig 的部分配置对象
 *
 * @internal
 */
export function resolveBaseOptions(
  options: BasePresetOptions,
): Partial<SWRLoginConfig> {
  const { userUrl, fetchUser, onLogin, onLogout, onError, security, cacheAdapter } = options;

  const resolved: Partial<SWRLoginConfig> = {};

  // fetchUser 优先级：自定义 fetchUser > userUrl > undefined
  if (fetchUser) {
    resolved.fetchUser = fetchUser;
  } else if (userUrl) {
    resolved.fetchUser = createFetchUser(userUrl);
  }

  // 合并可选的 SWRLoginConfig 扩展字段
  if (onLogin) resolved.onLogin = onLogin;
  if (onLogout) resolved.onLogout = onLogout;
  if (onError) resolved.onError = onError;
  if (security) resolved.security = security;
  if (cacheAdapter) resolved.cacheAdapter = cacheAdapter;

  return resolved;
}
