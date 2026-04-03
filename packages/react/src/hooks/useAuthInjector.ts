import type { AuthInjector, AuthResponse } from '@swr-login/core';
import { useCallback } from 'react';
import { useAuthContext } from '../context';

/**
 * Hook 用于从外部注入登录态到 swr-login 体系。
 *
 * 适用场景：
 * - 多步骤登录流程（如班级码登录、MFA）
 * - 第三方 SDK 登录完成后同步状态
 * - iframe / WebView 登录回调
 *
 * @example
 * ```tsx
 * function ExternalLoginCallback() {
 *   const { injectAuth } = useAuthInjector();
 *
 *   const handleLoginComplete = async (token: string, user: User) => {
 *     await injectAuth({
 *       user,
 *       accessToken: token,
 *       expiresAt: Date.now() + 86400000,
 *     });
 *     router.push('/dashboard');
 *   };
 * }
 * ```
 */
export function useAuthInjector(): AuthInjector {
  const { tokenManager, emitter, stateMachine, config } = useAuthContext();

  const injectAuth = useCallback(
    async (response: AuthResponse): Promise<void> => {
      // 1. 存储 token
      tokenManager.setTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt: response.expiresAt,
      });

      // 2. 状态机转换为已认证
      stateMachine.transition('authenticated');

      // 3. 发射登录事件（触发 onLogin 回调、跨标签页同步等）
      emitter.emit('login', { user: response.user });

      // 4. 更新缓存（使 useUser() 等 Hook 感知到用户信息）
      if (config.cacheAdapter) {
        await config.cacheAdapter.setUser(response.user);
      }
    },
    [tokenManager, emitter, stateMachine, config],
  );

  const injectLogout = useCallback(async (): Promise<void> => {
    // 1. 清除 token
    tokenManager.clearTokens();

    // 2. 状态机转换为未认证
    stateMachine.transition('unauthenticated');

    // 3. 发射登出事件
    emitter.emit('logout', undefined);

    // 4. 清除缓存
    if (config.cacheAdapter) {
      await config.cacheAdapter.clearUser();
    }
  }, [tokenManager, emitter, stateMachine, config]);

  return { injectAuth, injectLogout };
}
