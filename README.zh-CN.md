<div align="center">

# 🔐 swr-login

**最好的 React 登录态管理 Hook。**

兼容 Auth.js、Better Auth、Clerk 或任何自建后端。

[![npm](https://img.shields.io/npm/v/@swr-login/core?color=blue)](https://www.npmjs.com/package/@swr-login/core)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@swr-login/core?label=core%20size)](https://bundlephobia.com/package/@swr-login/core)
[![license](https://img.shields.io/github/license/swr-login/swr-login)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

[English](./README.md) · **中文**

</div>

---

## 为什么选择 swr-login？

大多数 React 登录方案要么体积臃肿，要么与特定框架深度绑定。`swr-login` 的目标是：

- **极致轻量** — 核心包 `@swr-login/core` 仅 <3KB gzipped，没有冗余依赖
- **插件化架构** — 只安装你需要的登录渠道，不装就不打包
- **无刷新体验** — 登录、登出、Token 刷新全程无页面刷新，多标签页自动同步
- **框架无关内核** — 核心逻辑不依赖任何 UI 框架，React 绑定在 `@swr-login/react`
- **中国生态友好** — 微信扫码/公众号登录作为一等公民插件

## 特性

- ⚡ **SWR 驱动** — 先展示缓存、后台静默校验，登录态即时可用，告别 loading 转圈
- 🔌 **插件化架构** — 每个登录渠道独立 npm 包，按需安装，Tree-shaking 友好
- 🔄 **无刷新登录/登出** — Token 静默刷新、乐观 UI、BroadcastChannel 多标签页同步
- 🪶 **极致轻量** — `@swr-login/core` <3KB gzipped，零外部依赖
- 🛡️ **默认安全** — 强制 PKCE、CSRF state 校验、HttpOnly Cookie 支持、敏感数据自动清理
- 📦 **100% TypeScript** — 完整泛型、每个 API 都有 JSDoc，AI 编程助手友好
- 🎯 **框架无关内核** — React 绑定在 `@swr-login/react`，核心逻辑不含 UI 代码

## 快速开始

### 安装

```bash
# 安装核心 + React 绑定 + JWT 适配器 + 密码登录插件
npm install @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

也支持 pnpm / yarn / bun：

```bash
pnpm add @swr-login/react @swr-login/adapter-jwt @swr-login/plugin-password
```

### 基本用法

```tsx
import { SWRLoginProvider, useLogin, useUser, useLogout } from '@swr-login/react';
import { JWTAdapter } from '@swr-login/adapter-jwt';
import { PasswordPlugin } from '@swr-login/plugin-password';

// 1️⃣ 配置 Provider
function App() {
  return (
    <SWRLoginProvider
      config={{
        adapter: JWTAdapter(),
        plugins: [PasswordPlugin({ loginUrl: '/api/login' })],
        fetchUser: (token) =>
          fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()),
      }}
    >
      <MyApp />
    </SWRLoginProvider>
  );
}

// 2️⃣ 在任意组件中使用 Hooks
function LoginButton() {
  const { login, isLoading } = useLogin('password');
  const { user, isAuthenticated } = useUser();
  const { logout } = useLogout();

  if (isAuthenticated) {
    return (
      <div>
        <span>你好，{user.name}！</span>
        <button onClick={() => logout()}>退出登录</button>
      </div>
    );
  }

  return (
    <button
      onClick={() => login({ username: 'alice', password: 'secret' })}
      disabled={isLoading}
    >
      登录
    </button>
  );
}
```

**就这么简单。** 无页面刷新，所有使用 `useUser()` 的组件即时更新。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                   你的 React 应用                     │
├─────────────────────────────────────────────────────┤
│   Hook 层 (@swr-login/react)                         │
│   useLogin · useUser · useLogout · useSession        │
│   usePermission · AuthGuard                          │
├─────────────────────────────────────────────────────┤
│   插件层                                              │
│   🔑 密码 · 🔵 Google · ⚫ GitHub                    │
│   🟢 微信 · 🔐 Passkey                               │
├─────────────────────────────────────────────────────┤
│   核心层 (@swr-login/core)                            │
│   StateMachine · TokenManager · PluginManager        │
│   EventEmitter · BroadcastSync                       │
├─────────────────────────────────────────────────────┤
│   存储适配器                                          │
│   JWT · Session · Cookie (BFF)                       │
└─────────────────────────────────────────────────────┘
```

## 核心 Hooks

| Hook | 用途 | 说明 |
|------|------|------|
| `useLogin(pluginName?)` | 触发登录 | 通过任意已注册的插件发起登录流程 |
| `useUser<T>()` | 获取用户 | 返回当前用户信息，SWR 缓存 + 自动重校验 |
| `useLogout()` | 安全登出 | 清理 Token + BroadcastChannel 跨标签页广播 |
| `useSession()` | 会话信息 | 获取原始 Token、过期时间等 |
| `usePermission()` | 权限检查 | 声明式地检查角色和权限 |

## AuthGuard 组件

用于保护需要登录或特定权限的内容区域：

```tsx
<AuthGuard
  permissions={['admin', 'editor']}
  requireAll={false}
  fallback={<Navigate to="/login" />}
  loadingComponent={<Skeleton />}
>
  <ProtectedContent />
</AuthGuard>
```

- `permissions` — 需要的权限列表
- `requireAll` — `true` 要求全部满足，`false` 满足任一即可
- `fallback` — 无权限时显示的组件
- `loadingComponent` — 加载中时显示的组件

## 官方插件

| 包名 | 登录方式 | 认证方法 |
|------|---------|---------|
| `@swr-login/plugin-password` | 用户名/密码 | 表单 POST |
| `@swr-login/plugin-oauth-google` | Google | OAuth 2.0 + PKCE（弹窗/跳转） |
| `@swr-login/plugin-oauth-github` | GitHub | OAuth（弹窗/跳转） |
| `@swr-login/plugin-oauth-wechat` | 微信 | 扫码登录 / H5 网页授权 |
| `@swr-login/plugin-passkey` | Passkey/WebAuthn | 生物识别 / 安全密钥 |

### 多渠道组合使用

```tsx
import { PasswordPlugin } from '@swr-login/plugin-password';
import { GoogleOAuthPlugin } from '@swr-login/plugin-oauth-google';
import { GitHubOAuthPlugin } from '@swr-login/plugin-oauth-github';
import { WeChatOAuthPlugin } from '@swr-login/plugin-oauth-wechat';
import { PasskeyPlugin } from '@swr-login/plugin-passkey';

<SWRLoginProvider
  config={{
    adapter: JWTAdapter(),
    plugins: [
      PasswordPlugin({ loginUrl: '/api/auth/login' }),
      GoogleOAuthPlugin({
        clientId: 'your-google-client-id',
        callbackUrl: '/api/auth/google/callback',
      }),
      GitHubOAuthPlugin({
        clientId: 'your-github-client-id',
        callbackUrl: '/api/auth/github/callback',
      }),
      WeChatOAuthPlugin({
        appId: 'your-wechat-app-id',
        callbackUrl: '/api/auth/wechat/callback',
      }),
      PasskeyPlugin({
        rpId: window.location.hostname,
        registerOptionsUrl: '/api/auth/passkey/register-options',
        registerVerifyUrl: '/api/auth/passkey/register-verify',
        loginOptionsUrl: '/api/auth/passkey/login-options',
        loginVerifyUrl: '/api/auth/passkey/login-verify',
      }),
    ],
    fetchUser: (token) =>
      fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()),
  }}
>
```

然后在组件中按名称调用不同渠道：

```tsx
const { login: passwordLogin } = useLogin('password');
const { login: googleLogin } = useLogin('google');
const { login: githubLogin } = useLogin('github');
const { login: wechatLogin } = useLogin('wechat');
const { login: passkeyLogin } = useLogin('passkey');
```

## 存储适配器

| 包名 | 存储策略 | 适用场景 |
|------|---------|---------|
| `@swr-login/adapter-jwt` | localStorage / sessionStorage / memory | SPA 应用（默认推荐） |
| `@swr-login/adapter-session` | sessionStorage | 标签页级会话（关闭即清除） |
| `@swr-login/adapter-cookie` | Cookie (SameSite + Secure) | BFF 模式（HttpOnly 存储） |

## 自定义插件

几分钟内即可编写自己的登录渠道插件：

```ts
import type { SWRLoginPlugin } from '@swr-login/core';

const MySSOPlugin: SWRLoginPlugin<{ token: string }> = {
  name: 'my-sso',
  type: 'oauth',
  async login({ token }, ctx) {
    const res = await fetch('/api/sso/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    const data = await res.json();
    ctx.setTokens({
      accessToken: data.accessToken,
      expiresAt: data.expiresAt,
    });
    return data;
  },
};
```

注册使用：

```tsx
<SWRLoginProvider
  config={{
    adapter: JWTAdapter(),
    plugins: [MySSOPlugin],
    fetchUser: (token) => fetch('/api/me', {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()),
  }}
>
```

## 在 Next.js App Router 中使用

`swr-login` 完美支持 Next.js App Router 的 Server/Client Component 模型：

```tsx
// src/components/providers.tsx
'use client';

import { SWRLoginProvider } from '@swr-login/react';
import { authConfig } from '@/lib/auth-config';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRLoginProvider config={authConfig}>
      {children}
    </SWRLoginProvider>
  );
}
```

```tsx
// src/app/layout.tsx (Server Component)
import { Providers } from '@/components/providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

> 💡 完整示例请查看 [`examples/nextjs-app-router`](./examples/nextjs-app-router)

## 示例项目

| 示例 | 框架 | 说明 |
|------|------|------|
| [`vite-react`](./examples/vite-react) | Vite + React | 纯客户端 SPA 示例 |
| [`nextjs-app-router`](./examples/nextjs-app-router) | Next.js 15 App Router | SSR/CSR 混合 + 中间件路由保护 |

运行示例：

```bash
# 克隆仓库
git clone https://github.com/swr-login/swr-login.git
cd swr-login

# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行 Vite 示例
pnpm --filter example-vite-react dev

# 运行 Next.js 示例
pnpm --filter example-nextjs-app-router dev
```

## 与其他方案对比

| 特性 | swr-login | Auth.js v5 | Clerk | Better Auth |
|------|:---------:|:----------:|:-----:|:-----------:|
| 无刷新登录/登出 | ✅ 最佳 | ⚠️ 部分支持 | ✅ | ⚠️ 部分支持 |
| 核心包体积 | **<3KB** | ~30KB | ~50KB | ~15KB |
| 插件化架构 | ✅ | ❌ | ❌ | ✅ |
| 微信 / 支付宝 | ✅ 一等公民 | ❌ | ❌ | ❌ |
| 框架无关内核 | ✅ | ⚠️ | ❌ | ✅ |
| 完整 TypeScript 泛型 | ✅ | ⚠️ | ✅ | ✅ |
| 多标签页同步 | ✅ 内置 | ❌ | ✅ | ❌ |
| 乐观 UI 更新 | ✅ | ❌ | ✅ | ❌ |
| 免费且开源 | ✅ MIT | ✅ MIT | ❌ 付费 | ✅ MIT |

## 安全性

- **PKCE** — 所有 OAuth 流程强制启用 PKCE
- **CSRF State** — 每次 OAuth 回调都验证 state 参数
- **BFF 友好** — Cookie 适配器支持 HttpOnly Token 存储
- **跨标签页同步登出** — 通过 BroadcastChannel 广播，一个标签页登出，所有标签页同步
- **Token 自动清理** — 页面可见性变化时自动清理过期 Token（可选）

## 包列表

| 包名 | 描述 | 版本 |
|------|------|------|
| [`@swr-login/core`](./packages/core) | 核心逻辑：状态机、Token 管理、插件系统、事件总线 | ![npm](https://img.shields.io/npm/v/@swr-login/core?label=) |
| [`@swr-login/react`](./packages/react) | React 绑定：Provider、Hooks、AuthGuard 组件 | ![npm](https://img.shields.io/npm/v/@swr-login/react?label=) |
| [`@swr-login/adapter-jwt`](./packages/adapter-jwt) | JWT Token 存储适配器 | ![npm](https://img.shields.io/npm/v/@swr-login/adapter-jwt?label=) |
| [`@swr-login/adapter-session`](./packages/adapter-session) | Session 存储适配器（关闭标签页自动清除） | ![npm](https://img.shields.io/npm/v/@swr-login/adapter-session?label=) |
| [`@swr-login/adapter-cookie`](./packages/adapter-cookie) | Cookie 存储适配器（BFF 模式 HttpOnly） | ![npm](https://img.shields.io/npm/v/@swr-login/adapter-cookie?label=) |
| [`@swr-login/plugin-password`](./packages/plugin-password) | 用户名/密码登录插件 | ![npm](https://img.shields.io/npm/v/@swr-login/plugin-password?label=) |
| [`@swr-login/plugin-oauth-google`](./packages/plugin-oauth-google) | Google OAuth 2.0 登录插件 | ![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-google?label=) |
| [`@swr-login/plugin-oauth-github`](./packages/plugin-oauth-github) | GitHub OAuth 登录插件 | ![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-github?label=) |
| [`@swr-login/plugin-oauth-wechat`](./packages/plugin-oauth-wechat) | 微信 OAuth 登录插件（扫码 + H5 授权） | ![npm](https://img.shields.io/npm/v/@swr-login/plugin-oauth-wechat?label=) |
| [`@swr-login/plugin-passkey`](./packages/plugin-passkey) | WebAuthn/Passkey 登录插件（生物识别 + 安全密钥） | ![npm](https://img.shields.io/npm/v/@swr-login/plugin-passkey?label=) |

## 开发

```bash
# 安装依赖
pnpm install

# 开发模式（所有包热更新）
pnpm dev

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 代码检查
pnpm lint

# 代码检查并自动修复
pnpm lint:fix
```

### 项目结构

```
swr-login/
├── packages/
│   ├── core/                  # 核心逻辑（状态机、Token 管理、插件系统）
│   ├── react/                 # React 绑定（Provider、Hooks、AuthGuard）
│   ├── adapter-jwt/           # JWT 存储适配器
│   ├── adapter-session/       # Session 存储适配器
│   ├── adapter-cookie/        # Cookie 存储适配器（BFF 模式）
│   ├── plugin-password/       # 密码登录插件
│   ├── plugin-oauth-google/   # Google OAuth 插件
│   ├── plugin-oauth-github/   # GitHub OAuth 插件
│   ├── plugin-oauth-wechat/   # 微信 OAuth 插件
│   └── plugin-passkey/        # WebAuthn/Passkey 插件
├── examples/
│   ├── vite-react/            # Vite + React 示例
│   └── nextjs-app-router/     # Next.js App Router 示例
├── turbo.json                 # Turborepo 配置
├── pnpm-workspace.yaml        # pnpm 工作区
└── biome.json                 # Biome 代码检查配置
```

## 许可证

[MIT](./LICENSE)

---

<div align="center">

**[文档](https://swr-login.dev)** · **[示例](./examples)** · **[Discord](https://discord.gg/swr-login)**

用 ❤️ 为 React 社区打造

</div>
