import type { SWRLoginConfig, SWRLoginPlugin, AuthResponse } from '@swr-login/core';
import type { GitHubOAuthPluginOptions } from '@swr-login/plugin-oauth-github';
import type { GoogleOAuthPluginOptions } from '@swr-login/plugin-oauth-google';
import type { WeChatPluginOptions } from '@swr-login/plugin-oauth-wechat';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
import { WeChatPlugin } from '@swr-login/plugin-oauth-wechat';
import { PasskeyPlugin } from '@swr-login/plugin-passkey';
import { type BasePresetOptions, resolveBaseOptions } from './utils';

/**
 * 密码登录渠道配置（用于 full 预设）。
 */
export interface FullPasswordConfig {
  /** 登录接口 URL（必填） */
  loginUrl: string;
  /** 登出接口 URL（可选） */
  logoutUrl?: string;
  /** 自定义 fetch 选项 */
  fetchOptions?: RequestInit;
  /** 自定义响应转换函数 */
  transformResponse?: (data: unknown) => AuthResponse;
}

/**
 * Passkey 渠道配置（用于 full 预设）。
 */
export interface FullPasskeyConfig {
  /** 获取注册选项的后端接口 URL */
  registerOptionsUrl: string;
  /** 验证注册的后端接口 URL */
  registerVerifyUrl: string;
  /** 获取认证选项的后端接口 URL */
  loginOptionsUrl: string;
  /** 验证认证的后端接口 URL */
  loginVerifyUrl: string;
  /** Relying Party ID */
  rpId?: string;
}

/**
 * 完整预设选项。
 * 支持密码、社交、Passkey 三种认证渠道的任意组合。
 */
export interface FullPresetOptions extends BasePresetOptions {
  /** 密码登录配置（可选） */
  password?: FullPasswordConfig;
  /** 社交登录渠道配置（可选） */
  providers?: {
    github?: GitHubOAuthPluginOptions;
    google?: GoogleOAuthPluginOptions;
    wechat?: WeChatPluginOptions;
  };
  /** Passkey 登录配置（可选） */
  passkey?: FullPasskeyConfig;
}

/**
 * 完整预设 — 一站式搭建多渠道认证方案（密码 + 社交 + Passkey）。
 *
 * 根据传入的渠道配置，自动创建对应的插件实例。
 * 未配置的渠道将被跳过，但至少需要配置一个渠道。
 *
 * @param options - 完整预设选项
 * @returns 完整的 SWRLoginConfig 配置对象
 * @throws 当未配置任何认证渠道时抛出错误
 *
 * @example
 * ```tsx
 * import { SWRLoginProvider } from 'swr-login';
 * import { presets } from 'swr-login/presets';
 *
 * const config = presets.full({
 *   password: {
 *     loginUrl: '/api/auth/login',
 *     logoutUrl: '/api/auth/logout',
 *   },
 *   providers: {
 *     github: { clientId: 'gh-client-id' },
 *     google: { clientId: 'google-client-id' },
 *   },
 *   passkey: {
 *     registerOptionsUrl: '/api/auth/passkey/register/options',
 *     registerVerifyUrl: '/api/auth/passkey/register/verify',
 *     loginOptionsUrl: '/api/auth/passkey/login/options',
 *     loginVerifyUrl: '/api/auth/passkey/login/verify',
 *   },
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
 * // 仅密码 + GitHub（不使用 Passkey）
 * const config = presets.full({
 *   password: { loginUrl: '/api/auth/login' },
 *   providers: { github: { clientId: 'gh-client-id' } },
 *   userUrl: '/api/me',
 * });
 * ```
 */
export function full(options: FullPresetOptions): SWRLoginConfig {
  const { password: passwordConfig, providers, passkey: passkeyConfig, adapterOptions, ...baseOptions } = options;

  const plugins: SWRLoginPlugin[] = [];

  // 密码登录渠道
  if (passwordConfig) {
    plugins.push(
      PasswordPlugin({
        loginUrl: passwordConfig.loginUrl,
        logoutUrl: passwordConfig.logoutUrl,
        fetchOptions: passwordConfig.fetchOptions,
        transformResponse: passwordConfig.transformResponse,
      }),
    );
  }

  // 社交登录渠道
  if (providers) {
    if (providers.github) {
      plugins.push(GitHubOAuthPlugin(providers.github));
    }
    if (providers.google) {
      plugins.push(GoogleOAuthPlugin(providers.google));
    }
    if (providers.wechat) {
      plugins.push(WeChatPlugin(providers.wechat));
    }
  }

  // Passkey 渠道
  if (passkeyConfig) {
    plugins.push(
      PasskeyPlugin({
        registerOptionsUrl: passkeyConfig.registerOptionsUrl,
        registerVerifyUrl: passkeyConfig.registerVerifyUrl,
        loginOptionsUrl: passkeyConfig.loginOptionsUrl,
        loginVerifyUrl: passkeyConfig.loginVerifyUrl,
        rpId: passkeyConfig.rpId,
      }),
    );
  }

  if (plugins.length === 0) {
    throw new Error(
      '[swr-login] presets.full: 至少需要配置一个认证渠道（password、providers 或 passkey）。',
    );
  }

  const baseConfig = resolveBaseOptions(baseOptions);

  return {
    adapter: JWTAdapter(adapterOptions),
    plugins,
    ...baseConfig,
  };
}
