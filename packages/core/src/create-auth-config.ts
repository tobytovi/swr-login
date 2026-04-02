import type { SWRLoginConfig } from './types';

/**
 * 创建类型安全的 swr-login 配置对象。
 *
 * 此辅助函数本身不做任何转换，它的作用是为配置对象提供完整的
 * TypeScript 类型推导和 IDE 自动补全支持，类似于 Vite 的 `defineConfig`。
 *
 * 推荐将配置抽离到独立文件中（如 `auth.config.ts`），保持 Provider JSX 简洁。
 *
 * @param config - swr-login 配置对象
 * @returns 与传入参数完全相同的配置对象
 *
 * @example
 * ```ts
 * // auth.config.ts
 * import { createAuthConfig } from 'swr-login';
 * import { JWTAdapter } from 'swr-login/adapters/jwt';
 * import { PasswordPlugin } from 'swr-login/plugins/password';
 *
 * export default createAuthConfig({
 *   adapter: JWTAdapter({ storage: 'localStorage' }),
 *   plugins: [
 *     PasswordPlugin({ loginUrl: '/api/auth/login' }),
 *   ],
 *   fetchUser: (token) =>
 *     fetch('/api/me', {
 *       headers: { Authorization: `Bearer ${token}` },
 *     }).then((r) => r.json()),
 *   onLogin: (user) => console.log('Logged in:', user.name),
 *   onError: (err) => console.error('Auth error:', err),
 * });
 * ```
 *
 * @example
 * ```tsx
 * // App.tsx
 * import { SWRLoginProvider } from 'swr-login';
 * import authConfig from './auth.config';
 *
 * export default function App() {
 *   return (
 *     <SWRLoginProvider config={authConfig}>
 *       <MyApp />
 *     </SWRLoginProvider>
 *   );
 * }
 * ```
 */
export function createAuthConfig(config: SWRLoginConfig): SWRLoginConfig {
  return config;
}
