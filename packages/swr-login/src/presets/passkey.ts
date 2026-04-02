import { JWTAdapter } from '@swr-login/adapter-jwt';
import type { SWRLoginConfig } from '@swr-login/core';
import { PasskeyPlugin } from '@swr-login/plugin-passkey';
import { type BasePresetOptions, resolveBaseOptions } from './utils';

/**
 * Passkey 登录预设选项。
 */
export interface PasskeyPresetOptions extends BasePresetOptions {
  /** 获取注册选项的后端接口 URL（必填） */
  registerOptionsUrl: string;
  /** 验证注册的后端接口 URL（必填） */
  registerVerifyUrl: string;
  /** 获取认证选项的后端接口 URL（必填） */
  loginOptionsUrl: string;
  /** 验证认证的后端接口 URL（必填） */
  loginVerifyUrl: string;
  /** Relying Party ID（默认：当前域名） */
  rpId?: string;
}

/**
 * Passkey 登录预设 — 快速搭建 WebAuthn/Passkey 无密码认证方案。
 *
 * 支持指纹、Face ID、安全密钥等生物识别认证方式。
 * 内部自动配置 `JWTAdapter` + `PasskeyPlugin`。
 *
 * @param options - Passkey 登录预设选项
 * @returns 完整的 SWRLoginConfig 配置对象
 *
 * @example
 * ```tsx
 * import { SWRLoginProvider } from 'swr-login';
 * import { presets } from 'swr-login/presets';
 *
 * const config = presets.passkey({
 *   registerOptionsUrl: '/api/auth/passkey/register/options',
 *   registerVerifyUrl: '/api/auth/passkey/register/verify',
 *   loginOptionsUrl: '/api/auth/passkey/login/options',
 *   loginVerifyUrl: '/api/auth/passkey/login/verify',
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
 */
export function passkey(options: PasskeyPresetOptions): SWRLoginConfig {
  const {
    registerOptionsUrl,
    registerVerifyUrl,
    loginOptionsUrl,
    loginVerifyUrl,
    rpId,
    adapterOptions,
    ...baseOptions
  } = options;

  const baseConfig = resolveBaseOptions(baseOptions);

  return {
    adapter: JWTAdapter(adapterOptions),
    plugins: [
      PasskeyPlugin({
        registerOptionsUrl,
        registerVerifyUrl,
        loginOptionsUrl,
        loginVerifyUrl,
        rpId,
      }),
    ],
    ...baseConfig,
  };
}
