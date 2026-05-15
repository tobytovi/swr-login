/**
 * @swr-login/method-oauth-wechat v0.9 - WeChat OAuth login method.
 *
 * Strategy: H5 redirect-based authorization (default). PC QR-code mode is
 * available via `renderQR()` but most production traffic is H5 in-WeChat
 * authorization.
 *
 * The `onRegistryMount` hook detects a `?code=&state=` callback and
 * exchanges it with the configured backend `tokenEndpoint`.
 */

import {
  CSRFError,
  type LoginMethod,
  OAuthPopupError,
  defineLoginMethod,
  generateCSRFState,
  validateCSRFState,
} from '@swr-login/core';

const WECHAT_QR_SDK_URL = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
const WECHAT_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';
const STATE_KEY = 'wechat';

declare global {
  interface Window {
    WxLogin?: new (options: Record<string, unknown>) => undefined;
  }
}

export interface WeChatOAuthMethodConfig {
  appId?: string;
  redirectUri?: string;
  tokenEndpoint?: string;
  /** Override the WeChat web-login SDK URL. */
  sdkUrl?: string;
  /** OAuth scope. Defaults: `snsapi_userinfo` (H5) / `snsapi_login` (QR). */
  scope?: string;
  id?: string;
  label?: string;
  slot?: string | string[];
  order?: number;
}

interface WeChatHandle {
  state: 'idle' | 'pending' | 'success' | 'error';
  reset(): void;
  /** H5 redirect-mode entrypoint. */
  redirect(): void;
  /** PC QR-mode entrypoint — embeds an iframe in the given container. */
  renderQR(containerId: string): Promise<void>;
}

const METHOD_ID_DEFAULT = 'swr-login/oauth-wechat';

export function createWeChatOAuthMethod(
  config: WeChatOAuthMethodConfig = {},
): LoginMethod<void, void, WeChatHandle> {
  const {
    appId = '',
    redirectUri,
    tokenEndpoint = '/api/auth/wechat/callback',
    sdkUrl = WECHAT_QR_SDK_URL,
    scope,
    id = METHOD_ID_DEFAULT,
    label = 'Continue with WeChat',
    slot = 'oauth',
    order,
  } = config;

  let sdkLoaded = false;
  const getRedirectUri = (): string =>
    redirectUri ??
    (typeof window !== 'undefined' ? `${window.location.origin}/auth/wechat/callback` : '');

  const loadSDK = (): Promise<void> => {
    if (sdkLoaded || typeof window === 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (window.WxLogin) {
        sdkLoaded = true;
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = sdkUrl;
      script.onload = () => {
        sdkLoaded = true;
        resolve();
      };
      script.onerror = () => reject(new Error('Failed to load WeChat JS-SDK'));
      document.head.appendChild(script);
    });
  };

  return defineLoginMethod<void, void, WeChatHandle>({
    id,
    meta: { label, slot, order },

    use(): WeChatHandle {
      const redirect = (): void => {
        if (typeof window === 'undefined' || !appId) {
          if (!appId) console.error('[swr-login] WeChatOAuthMethod requires `appId`.');
          return;
        }
        const state = generateCSRFState(STATE_KEY);
        const params = new URLSearchParams({
          appid: appId,
          redirect_uri: getRedirectUri(),
          response_type: 'code',
          scope: scope ?? 'snsapi_userinfo',
          state,
        });
        window.location.href = `${WECHAT_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
      };

      const renderQR = async (containerId: string): Promise<void> => {
        if (typeof window === 'undefined' || !appId) return;
        await loadSDK();
        const state = generateCSRFState(STATE_KEY);
        if (!window.WxLogin) {
          throw new Error('WeChat JS-SDK not loaded');
        }
        new window.WxLogin({
          self_redirect: false,
          id: containerId,
          appid: appId,
          scope: scope ?? 'snsapi_login',
          redirect_uri: encodeURIComponent(getRedirectUri()),
          state,
          style: '',
          href: '',
        });
      };

      return {
        state: 'idle',
        reset: () => {},
        redirect,
        renderQR,
      };
    },

    onRegistryMount: async ({ credential, refreshSession, publishEvent }) => {
      if (typeof window === 'undefined') return;
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const stateParam = url.searchParams.get('state');
      if (!code || !stateParam) return;

      if (!validateCSRFState(stateParam, STATE_KEY)) {
        publishEvent({
          kind: 'external',
          methodId: id,
          payload: new CSRFError('WeChat OAuth state mismatch'),
          timestamp: Date.now(),
        });
        return;
      }

      try {
        const res = await fetch(tokenEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
        });
        if (!res.ok) {
          throw new OAuthPopupError(`WeChat token exchange failed: ${res.statusText}`);
        }
        const data = await res.json();
        const setter = (
          credential as {
            setTokens?: (t: {
              accessToken: string;
              refreshToken?: string;
              expiresAt?: number;
            }) => void;
          }
        ).setTokens;
        if (typeof setter === 'function') {
          setter({
            accessToken: data.accessToken ?? data.access_token,
            refreshToken: data.refreshToken ?? data.refresh_token,
            expiresAt: data.expiresAt ?? data.expires_at,
          });
        }
        await refreshSession();
        publishEvent({
          kind: 'login',
          methodId: id,
          payload: { provider: 'wechat' },
          timestamp: Date.now(),
        });
      } catch (err) {
        publishEvent({ kind: 'external', methodId: id, payload: err, timestamp: Date.now() });
      } finally {
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.toString());
      }
    },
  });
}

export const wechatOAuthMethod = createWeChatOAuthMethod();

/** @deprecated v0.7 alias. Will be removed in v1.0. */
export const WeChatPlugin = createWeChatOAuthMethod;

/** @deprecated Popup-mode shim from v0.7. v0.9 uses redirect mode. */
export function handleWeChatCallback(): void {
  if (typeof window === 'undefined') return;
  const target = window.opener ?? window.parent;
  if (!target || target === window) return;
  const params = new URLSearchParams(window.location.search);
  target.postMessage(
    {
      type: 'SWR_LOGIN_OAUTH_CALLBACK',
      code: params.get('code'),
      state: params.get('state'),
      error: params.get('error') ?? params.get('errcode'),
    },
    window.location.origin,
  );
}
