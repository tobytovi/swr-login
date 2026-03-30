import {
  generateCSRFState,
  validateCSRFState,
  type AuthResponse,
  type SWRLoginPlugin,
} from '@swr-login/core';

export interface WeChatCredentials {
  /** Login mode: 'qrcode' (PC scan) or 'h5' (mobile web authorization) */
  mode?: 'qrcode' | 'h5';
  /** Container element ID for QR code rendering (required for qrcode mode) */
  containerId?: string;
  /** QR code iframe width (default: 300) */
  width?: number;
  /** QR code iframe height (default: 400) */
  height?: number;
}

export interface WeChatPluginOptions {
  /** WeChat Open Platform App ID */
  appId: string;
  /** Redirect URI for OAuth callback */
  redirectUri?: string;
  /** Backend token exchange endpoint */
  tokenEndpoint?: string;
  /** Custom WeChat JS-SDK URL */
  sdkUrl?: string;
  /** OAuth scope (default: 'snsapi_login' for QR, 'snsapi_userinfo' for H5) */
  scope?: string;
}

const WECHAT_QR_SDK_URL = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxLogin.js';
const WECHAT_AUTHORIZE_URL = 'https://open.weixin.qq.com/connect/oauth2/authorize';

declare global {
  interface Window {
    WxLogin?: new (options: Record<string, unknown>) => void;
  }
}

/**
 * WeChat OAuth login plugin.
 *
 * Supports two modes:
 * - **QR Code** (PC): Embeds WeChat QR code in a container element for scanning
 * - **H5** (Mobile): Redirects to WeChat authorization page for mobile web
 *
 * @example
 * ```ts
 * import { WeChatPlugin } from '@swr-login/plugin-oauth-wechat';
 *
 * const plugin = WeChatPlugin({
 *   appId: 'wx_your_app_id',
 *   tokenEndpoint: '/api/auth/wechat/callback',
 * });
 *
 * // QR Code mode (provide a container div in your page)
 * await login('oauth-wechat', { mode: 'qrcode', containerId: 'wechat-qr' });
 * ```
 */
export function WeChatPlugin(
  options: WeChatPluginOptions,
): SWRLoginPlugin<WeChatCredentials> {
  const {
    appId,
    redirectUri,
    tokenEndpoint = '/api/auth/wechat/callback',
    sdkUrl = WECHAT_QR_SDK_URL,
  } = options;

  let sdkLoaded = false;

  const getRedirectUri = () =>
    redirectUri ?? (typeof window !== 'undefined' ? `${window.location.origin}/auth/wechat/callback` : '');

  const loadWeChatSDK = (): Promise<void> => {
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

  return {
    name: 'oauth-wechat',
    type: 'oauth',

    async initialize() {
      // Pre-load WeChat SDK for QR code mode
      try {
        await loadWeChatSDK();
      } catch {
        // SDK load failure is non-fatal; will retry during login
      }
    },

    async login(credentials = {}, ctx) {
      const mode = credentials.mode ?? 'qrcode';
      const state = generateCSRFState('wechat');

      if (mode === 'h5') {
        // Mobile H5 authorization - full redirect
        const scope = options.scope ?? 'snsapi_userinfo';
        const params = new URLSearchParams({
          appid: appId,
          redirect_uri: getRedirectUri(),
          response_type: 'code',
          scope,
          state,
        });

        window.location.href = `${WECHAT_AUTHORIZE_URL}?${params.toString()}#wechat_redirect`;
        return new Promise<AuthResponse>(() => {});
      }

      // QR Code mode - embed in container
      await loadWeChatSDK();

      return new Promise<AuthResponse>((resolve, reject) => {
        const containerId = credentials.containerId ?? 'swr-login-wechat-qr';
        const container = document.getElementById(containerId);

        if (!container) {
          reject(new Error(`WeChat QR container element "#${containerId}" not found`));
          return;
        }

        if (!window.WxLogin) {
          reject(new Error('WeChat JS-SDK not loaded'));
          return;
        }

        const scope = options.scope ?? 'snsapi_login';

        // Create WxLogin instance (renders QR code iframe)
        new window.WxLogin({
          self_redirect: false,
          id: containerId,
          appid: appId,
          scope,
          redirect_uri: encodeURIComponent(getRedirectUri()),
          state,
          style: '',
          href: '',
        });

        // Listen for callback via redirect (the iframe will redirect)
        const handleMessage = async (event: MessageEvent) => {
          // WeChat callback will come through the redirect URI
          const { type, code, state: returnedState, error } = event.data ?? {};
          if (type !== 'SWR_LOGIN_OAUTH_CALLBACK') return;

          window.removeEventListener('message', handleMessage);

          if (error) {
            reject(new Error(`WeChat login error: ${error}`));
            return;
          }

          if (!validateCSRFState(returnedState, 'wechat')) {
            reject(new Error('WeChat CSRF state validation failed'));
            return;
          }

          try {
            const response = await fetch(tokenEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ code, redirect_uri: getRedirectUri() }),
            });

            if (!response.ok) {
              throw new Error(`Token exchange failed: ${response.statusText}`);
            }

            const data = await response.json();
            const authResponse: AuthResponse = {
              user: data.user,
              accessToken: data.accessToken ?? data.access_token,
              refreshToken: data.refreshToken ?? data.refresh_token,
              expiresAt: data.expiresAt ?? data.expires_at ?? Date.now() + 7200 * 1000,
            };

            ctx.setTokens({
              accessToken: authResponse.accessToken,
              refreshToken: authResponse.refreshToken,
              expiresAt: authResponse.expiresAt,
            });

            resolve(authResponse);
          } catch (err) {
            reject(err);
          }
        };

        window.addEventListener('message', handleMessage);
      });
    },

    async logout(ctx) {
      ctx.clearTokens();
    },
  };
}

/** Helper for WeChat OAuth callback page */
export function handleWeChatCallback(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const target = window.opener ?? window.parent;

  if (target && target !== window) {
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
}
