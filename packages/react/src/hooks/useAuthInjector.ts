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

      // 2. 状态机转换为已认证。
      //
      // injectAuth 作为"逃生舱"应能从任何状态恢复到 authenticated，
      // 但状态机不允许 `error -> authenticated` / `unauthenticated -> authenticated` 直接转换。
      // 这两种状态都允许 `-> authenticating`，而 `authenticating -> authenticated` 合法，
      // 因此通过 `authenticating` 中转一次即可完成恢复，且每一步都符合状态机契约。
      const currentState = stateMachine.state;
      if (currentState === 'error' || currentState === 'unauthenticated') {
        stateMachine.transition('authenticating');
      }
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
