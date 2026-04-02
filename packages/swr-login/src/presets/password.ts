import { JWTAdapter } from '@swr-login/adapter-jwt';
import type { AuthResponse, SWRLoginConfig } from '@swr-login/core';
import { PasswordPlugin } from '@swr-login/plugin-password';
import { type BasePresetOptions, resolveBaseOptions } from './utils';

/**
 * 密码登录预设选项。
 */
export interface PasswordPresetOptions extends BasePresetOptions {
  /** 登录接口 URL（必填） */
  loginUrl: string;
  /** 登出接口 URL（可选） */
  logoutUrl?: string;
  /** 自定义 fetch 选项（如 headers） */
  fetchOptions?: RequestInit;
  /**
   * 自定义响应转换函数。
   * 当后端返回的数据结构不符合标准 AuthResponse 时使用。
   */
  transformResponse?: (data: unknown) => AuthResponse;
}

/**
 * 密码登录预设 — 快速搭建用户名/密码认证方案。
 *
 * 内部自动配置 `JWTAdapter` + `PasswordPlugin`，开发者只需提供必要的 URL 即可。
 *
 * @param options - 密码登录预设选项
 * @returns 完整的 SWRLoginConfig 配置对象
 *
 * @example
 * ```tsx
 * import { SWRLoginProvider } from 'swr-login';
 * import { presets } from 'swr-login/presets';
 *
 * const config = presets.password({
 *   loginUrl: '/api/auth/login',
 *   logoutUrl: '/api/auth/logout',
 *   userUrl: '/api/me',
 * });
 *
 * export default function App() {
 *   return (
 *     <SWRLoginProvider config={config}>
 *       <MyApp />
 *     </SWRLoginProvider>
 *   );
 * }
 * ```
 *
 * @example
 * ```ts
 * // 使用 sessionStorage 策略 + 自定义回调
 * const config = presets.password({
 *   loginUrl: '/api/auth/login',
 *   userUrl: '/api/me',
 *   adapterOptions: { storage: 'sessionStorage' },
 *   onLogin: (user) => console.log('Welcome', user.name),
 *   onError: (err) => console.error(err),
 * });
 * ```
 */
export function password(options: PasswordPresetOptions): SWRLoginConfig {
  const { loginUrl, logoutUrl, fetchOptions, transformResponse, adapterOptions, ...baseOptions } =
    options;

  const baseConfig = resolveBaseOptions(baseOptions);

  return {
    adapter: JWTAdapter(adapterOptions),
    plugins: [
      PasswordPlugin({
        loginUrl,
        logoutUrl,
        fetchOptions,
        transformResponse,
      }),
    ],
    ...baseConfig,
  };
}
