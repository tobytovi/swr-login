import type { SWRLoginConfig, SWRLoginPlugin } from '@swr-login/core';
import type { GitHubOAuthPluginOptions } from '@swr-login/plugin-oauth-github';
import type { GoogleOAuthPluginOptions } from '@swr-login/plugin-oauth-google';
import type { WeChatPluginOptions } from '@swr-login/plugin-oauth-wechat';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
import { WeChatPlugin } from '@swr-login/plugin-oauth-wechat';
import { type BasePresetOptions, resolveBaseOptions } from './utils';

/**
 * 社交登录渠道配置。
 * 每个渠道均为可选，但至少需要配置一个。
 */
export interface SocialProviders {
  /** GitHub OAuth 配置 */
  github?: GitHubOAuthPluginOptions;
  /** Google OAuth 配置 */
  google?: GoogleOAuthPluginOptions;
  /** 微信 OAuth 配置 */
  wechat?: WeChatPluginOptions;
}

/**
 * 社交登录预设选项。
 */
export interface SocialPresetOptions extends BasePresetOptions {
  /** 社交登录渠道配置（至少需要配置一个） */
  providers: SocialProviders;
}

/**
 * 社交登录预设 — 快速搭建 OAuth 社交登录方案。
 *
 * 支持 GitHub、Google、微信三种渠道，可自由组合。
 * 内部自动配置 `JWTAdapter` + 对应的 OAuth 插件。
 *
 * @param options - 社交登录预设选项
 * @returns 完整的 SWRLoginConfig 配置对象
 * @throws 当未配置任何社交登录渠道时抛出错误
 *
 * @example
 * ```tsx
 * import { SWRLoginProvider } from 'swr-login';
 * import { presets } from 'swr-login/presets';
 *
 * const config = presets.social({
 *   providers: {
 *     github: { clientId: 'your-github-client-id' },
 *     google: { clientId: 'your-google-client-id' },
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
 * // 仅微信登录 + 自定义 tokenEndpoint
 * const config = presets.social({
 *   providers: {
 *     wechat: {
 *       appId: 'wx_your_app_id',
 *       tokenEndpoint: '/api/auth/wechat/callback',
 *     },
 *   },
 *   userUrl: '/api/me',
 * });
 * ```
 */
export function social(options: SocialPresetOptions): SWRLoginConfig {
  const { providers, adapterOptions, ...baseOptions } = options;

  // 构建插件列表
  const plugins: SWRLoginPlugin[] = [];

  if (providers.github) {
    plugins.push(GitHubOAuthPlugin(providers.github));
  }
  if (providers.google) {
    plugins.push(GoogleOAuthPlugin(providers.google));
  }
  if (providers.wechat) {
    plugins.push(WeChatPlugin(providers.wechat));
  }

  if (plugins.length === 0) {
    throw new Error(
      '[swr-login] presets.social: 至少需要配置一个社交登录渠道（github、google 或 wechat）。',
    );
  }

  const baseConfig = resolveBaseOptions(baseOptions);

  return {
    adapter: JWTAdapter(adapterOptions),
    plugins,
    ...baseConfig,
  };
}
