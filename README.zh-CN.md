<div align="center">

# swr-login

**Plugin-as-Hook React 身份验证状态管理库。**

每个登录方式都是一个 React Hook。零外部状态依赖。

[![npm](https://img.shields.io/npm/v/swr-login?color=blue)](https://www.npmjs.com/package/swr-login)
[![bundle size](https://img.shields.io/bundlephobia/minzip/swr-login?label=size)](https://bundlephobia.com/package/swr-login)
[![license](https://img.shields.io/github/license/tobytovi/swr-login)](https://github.com/tobytovi/swr-login/blob/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)](https://www.typescriptlang.org/)

**v0.9.0-alpha.0** — v1.0 GA 预发布版本。[从 v0.7 迁移 →](./MIGRATION.md)

[English](./README.md) · 中文 · [文档站](https://swr-login.dev)

</div>

---

## 特性

- **Plugin-as-Hook** — 每个登录方式都是 React Hook。类型安全的 Handle 推导，无限扩展性。
- **零外部状态** — 用 `useSyncExternalStore` 替代 SWR。无 SWR peer dependency。
- **Hook 顺序稳定** — `MethodSlotList` 确保每次渲染的 Hook 调用顺序完全一致。
- **`onRegistryMount`** — 异步生命周期钩子，用于处理 OAuth 回跳、Passkey 初始化等挂载时副作用。
- **多标签同步** — `BroadcastSync` 通过 BroadcastChannel 保持跨标签页 session 一致。
- **100% TypeScript** — 三泛型 `LoginMethod<TInput, TResult, THandle>` 推导自定义 Handle 字段。
- **Conformance 测试套件** — `@swr-login/testing` 提供 `testLoginMethod()` 验证任意自定义 method。

## 安装

```sh
npm install swr-login
# 或
pnpm add swr-login
```

## 快速开始

```tsx
import { AuthHookRegistry, useSession, useLoginMethod, AuthGuard } from 'swr-login';
import { createJWTCredential } from 'swr-login/adapters/jwt';
import { createPasswordMethod } from 'swr-login/methods/password';
import type { PasswordHandle } from 'swr-login/methods/password';

// 1. 配置 credential 和 methods（在组件外 — 保证引用稳定）
const credential = createJWTCredential({ storage: 'localStorage' });
const passwordMethod = createPasswordMethod({ loginUrl: '/api/auth/login' });
const METHODS = [passwordMethod];

async function fetchSession(token: { accessToken: string | null }) {
  if (!token.accessToken) return null;
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token.accessToken}` },
  });
  return res.ok ? res.json() : null;
}

// 2. 包裹应用
function App() {
  return (
    <AuthHookRegistry
      credential={credential}
      methods={METHODS}
      fetchSession={fetchSession}
      security={{ enableBroadcastSync: true }}
    >
      <AppContent />
    </AuthHookRegistry>
  );
}

// 3. 构建登录表单 — 类型安全的 Handle 推导
function LoginForm() {
  const handle = useLoginMethod<typeof passwordMethod>('swr-login/password') as PasswordHandle;
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <form onSubmit={async (e) => {
      e.preventDefault();
      await handle.submit({ username, password });
    }}>
      <input value={username} onChange={e => setUsername(e.target.value)} placeholder="账号" />
      <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
      {handle.error && <p style={{ color: 'red' }}>{handle.error.message}</p>}
      <button disabled={handle.state === 'pending'}>
        {handle.state === 'pending' ? '登录中…' : '登录'}
      </button>
    </form>
  );
}

// 4. 检查 session 状态
function AppContent() {
  const { status } = useSession();
  if (status === 'loading') return <Spinner />;
  return (
    <AuthGuard fallback={<LoginForm />}>
      <Dashboard />
    </AuthGuard>
  );
}
```

## 官方 Method 包

| 子路径 | 说明 |
|---|---|
| `swr-login/methods/password` | 账号密码登录 |
| `swr-login/methods/mock` | 开发环境 Mock 登录 |
| `swr-login/methods/oauth-github` | GitHub OAuth + PKCE |
| `swr-login/methods/oauth-google` | Google OAuth + PKCE |
| `swr-login/methods/oauth-wechat` | 微信 OAuth（H5 跳转） |
| `swr-login/methods/passkey` | WebAuthn Passkey |

## 官方 Adapter 包

| 子路径 | 说明 |
|---|---|
| `swr-login/adapters/jwt` | localStorage JWT token |
| `swr-login/adapters/cookie` | HTTP-only Cookie |
| `swr-login/adapters/session` | sessionStorage token |

## 自定义 Method

```ts
import { defineLoginMethod, useAuthInternal, LoginRejection } from 'swr-login';

export const myMethod = defineLoginMethod<MyInput, MyResult, MyHandle>({
  id: 'acme/sso',   // 必须为 scope/name 格式
  meta: { label: '企业 SSO', slot: 'primary' },
  use() {
    const { refreshSession, publishEvent } = useAuthInternal();
    // ... 返回 handle
  },
  // 可选：挂载时异步副作用（OAuth 回跳处理、Passkey 初始化等）
  async onRegistryMount(internal) {
    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      await exchangeCode(code, internal.registrySignal);
      await internal.refreshSession();
    }
    return () => { /* 卸载时清理 */ };
  },
});
```

## 测试自定义 Method

```ts
import { testLoginMethod, createMockCredential } from '@swr-login/testing';

testLoginMethod(myMethod, {
  mockCredential: createMockCredential(),
  testSubmit: async (handle) => {
    await handle.submit!({ token: 'mock' });
    expect(handle.state).toBe('success');
  },
});
```

## 从 v0.7 迁移

请参阅 [MIGRATION.md](./MIGRATION.md) 获取完整的 v0.7 → v0.9 迁移指南。

```tsx
// v0.7
<SWRLoginProvider config={{ adapter: ..., plugins: [...], fetchUser: ... }}>

// v0.9
<AuthHookRegistry credential={...} methods={[...]} fetchSession={...}>
```

## License

MIT © swr-login Contributors
