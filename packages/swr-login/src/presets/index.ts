/**
 * @module swr-login/presets
 *
 * 预设配置工厂 — 为常见认证场景提供开箱即用的配置。
 *
 * @example
 * ```ts
 * import { presets } from 'swr-login/presets';
 *
 * // 密码登录
 * const config = presets.password({ loginUrl: '/api/login', userUrl: '/api/me' });
 *
 * // 社交登录
 * const config = presets.social({
 *   providers: { github: { clientId: '...' } },
 *   userUrl: '/api/me',
 * });
 *
 * // Passkey 登录
 * const config = presets.passkey({ ... });
 *
 * // 完整方案（密码 + 社交 + Passkey）
 * const config = presets.full({ ... });
 * ```
 */

import { password } from './password';
import { social } from './social';
import { passkey } from './passkey';
import { full } from './full';

// ─── Types ────────────────────────────────────────────────────
export type { BasePresetOptions } from './utils';
export type { PasswordPresetOptions } from './password';
export type { SocialPresetOptions, SocialProviders } from './social';
export type { PasskeyPresetOptions } from './passkey';
export type { FullPresetOptions, FullPasswordConfig, FullPasskeyConfig } from './full';

// ─── Presets Namespace ────────────────────────────────────────

/**
 * 预设配置命名空间。
 *
 * 包含四个预设工厂函数，每个函数返回完整的 `SWRLoginConfig` 配置对象：
 *
 * - `presets.password` — 用户名/密码登录
 * - `presets.social` — OAuth 社交登录（GitHub、Google、微信）
 * - `presets.passkey` — WebAuthn/Passkey 无密码登录
 * - `presets.full` — 多渠道组合（密码 + 社交 + Passkey）
 */
export const presets = {
  password,
  social,
  passkey,
  full,
} as const;
