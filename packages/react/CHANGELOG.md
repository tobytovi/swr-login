# @swr-login/react

## 0.12.0

### Minor Changes

- Add `translateLoginError` — a unified login-error translation hook.

  A single user-supplied function now intercepts every error raised in the
  login pipeline (`plugin_login` / `after_auth` / `fetch_user`) **and** errors
  from SWR background revalidation (`revalidate`), giving callers one place to
  collapse "error code × business variant → user-facing message" matrices that
  previously had to be duplicated across `onPreReset`, `afterAuth`,
  `LoginForm.catch`, and `onFetchUserError`.

  When the translator returns a new `LoginRejection`, the library:

  - Clears tokens via the configured `TokenManager`
  - Transitions the state machine to `unauthenticated`
  - Skips `onFetchUserError` for that error (no double-handling)
  - Rejects `login()` with the `LoginRejection` as-is (no further wrapping)
  - Exposes the same `LoginRejection` via `useUser().lastError`

  Returning `null`/`undefined` falls back to the existing error path, so the
  change is **fully backward compatible** — existing `onFetchUserError`-only
  configurations behave exactly as before.

  New exports:

  - `LoginRejection` (class, with `LoginRejection.is` type guard)
  - `LoginErrorPhase`, `TranslateLoginErrorContext`, `TranslateLoginErrorFn` (types)
  - `SWRLoginConfig.translateLoginError` (optional config field)

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.12.0

## 0.11.0

### Minor Changes

- feat: `afterAuth` 和 `fetchUser` 新增 `loginContext` 支持

  `AfterAuthContext` 新增 `loginContext` 字段，`SWRLoginConfig.fetchUser` 签名从 `(token: string)` 改为接收上下文对象 `({ token, loginContext })`。

  两个钩子现在均可感知 `useLogin().login(credentials, { context })` 透传的业务上下文，无需在应用层维护模块级可变变量做桥接。

  **Breaking change for `fetchUser`**：如果你已配置 `fetchUser`，需将签名从 `(token) => ...` 更新为 `({ token }) => ...`。

  ```ts
  // 旧签名
  fetchUser: async (token) => {
    return fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
  };

  // 新签名
  fetchUser: async ({ token, loginContext }) => {
    const variant = (loginContext as { variant?: string })?.variant;
    return fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json());
  };
  ```

  ```ts
  // afterAuth 现在可以读取 loginContext
  afterAuth: async ({ loginContext, skipFetchUser }) => {
    const variant = (loginContext as { variant?: string })?.variant;
    if (variant === 'student') return; // 学生入口跳过 adminCheckAuth
    // ...
  },
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.11.0

## 0.10.0

### Minor Changes

- 新增：`useLogin().login()` 与 `pluginManager.login()` 支持 `options.context` 参数，用于将业务侧上下文透传给插件。

  ## 动机

  业务侧在调用 `login()` 时，常常需要把"本次调用从哪触发"的元信息（例如学生入口 vs 教师入口）传递给插件中的钩子（例如 `coding-auth-password` 的 `onPreReset`）。在此之前，业务侧只能通过模块级可变变量来传递，存在隐式契约、并发不安全、跨模块耦合等问题。

  ## 改动

  - `@swr-login/core`

    - 新增导出类型 `LoginCallOptions`（`{ context?: unknown }`）。
    - `PluginContext` 新增可选字段 `loginContext?: unknown`，由 `PluginManager.login(name, creds, { context })` 在调用插件 `login()` 时设置。
    - `PluginManager.login(name, creds, options?)` 新增第三个可选参数。

  - `@swr-login/react`
    - `useLogin().login()` 新增可选 `options` 参数，两种调用形式都支持：
      - `login(creds, options?)`（`useLogin('plugin-name')` 预设场景）
      - `login(pluginName, creds?, options?)`（动态指定插件场景）

  ## 兼容性

  - 完全向后兼容：现有调用 `login(creds)` / `login(name, creds)` 的代码不需要修改。
  - 不传 `options` 时，`ctx.loginContext` 为 `undefined`，与历史行为一致。
  - 库不解释 `context` 的具体内容（类型为 `unknown`），由业务侧自行断言。

  ## 示例

  ```ts
  // 调用方
  const { login } = useLogin('coding-password');
  await login({ account, password }, { context: { variant: 'teacher' } });

  // 插件 / 钩子方（如 coding-auth-password 的 onPreReset）
  async login(creds, ctx) {
    const variant = (ctx.loginContext as { variant?: string })?.variant;
    // ...
  }
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.10.0

## 0.9.3

### Patch Changes

- fix(useUser): hint 优先于 `prev === undefined` 启发式，修复"首屏立即登录被识别为 initial"

  ### 背景

  在 `useUser` 的 user-change 事件分发逻辑中，原本的判定顺序是：

  1. 先看 `prev === undefined`（"是否是首次"），如果是 → 一律 `'initial'`
  2. 否则才看 `userChangeHint` 是否新鲜

  这导致一个高发场景被错误归类：

  > 用户进入页面后，`SWRLoginProvider` 已挂载，但 `useSWR(AUTH_KEY, fetcher)` 的初始 fetch 还在 inflight（或 fetcher 返回 `null` 但 SWR 还没把 `null` 提交到 `data`），用户立即点击登录按钮 → `useLogin().login()` → `pluginManager.emit('login')` → Provider 写入 `userChangeHint = { source: 'login' }` → `mutate(AUTH_KEY, user)` 把 SWR data 从 `undefined` 切到 user。

  此时 `prev === undefined`，旧逻辑直接派发 `source: 'initial'`，而 hint 上明明已经写好了 `'login'`。下游订阅 `'login'` 事件的业务（关闭弹窗、跳转、埋点等）全部失效；首页 `useAutoRedirect` 反而把这次主动登录误判为"被动初始检测"。

  ### 修复

  调整判定优先级 —— **hint 是显式同步写入的"权威信号"，必须优先于"prev 是否存在"启发式**：

  ```ts
  let source: UserChangeSource;
  const now = Date.now();
  const hintFresh =
    userChangeHint.source !== null &&
    now - userChangeHint.timestamp <= USER_CHANGE_HINT_TTL_MS;
  if (hintFresh) {
    source = userChangeHint.source as UserChangeSource;
  } else if (prev === undefined) {
    source = "initial";
  } else {
    source = "revalidate";
  }
  ```

  ### 行为对照

  | 场景                             |     hintFresh     |     prev      | 旧版本           | 修复后          |
  | :------------------------------- | :---------------: | :-----------: | :--------------- | :-------------- |
  | 刷新/直接访问已登录会话          |       false       |   undefined   | `initial` ✅     | `initial` ✅    |
  | **首屏立即登录（fetch 未完成）** | **true (login)**  | **undefined** | **`initial` ❌** | **`login` ✅**  |
  | **首屏立即登出**                 | **true (logout)** | **undefined** | **`initial` ❌** | **`logout` ✅** |
  | 已登录后再次登录                 |   true (login)    |     user      | `login` ✅       | `login` ✅      |
  | 登出                             |   true (logout)   |     user      | `logout` ✅      | `logout` ✅     |
  | 跨标签页同步                     |  true (external)  |     user      | `external` ✅    | `external` ✅   |
  | 周期/焦点 revalidate             |       false       |     user      | `revalidate` ✅  | `revalidate` ✅ |

  ### 兼容性

  - 公共 API 无变化，仅修正 `UseUserReturn.lastChangeSource` 与 `'user-change'` 事件 `source` 字段的取值。
  - 之前依赖错误行为 workaround（"同时接受 `'login'` 和 `'initial'` 两种 source"）的业务方，可以在升级后改为只监听 `'login'`，让 `'initial'` 重新只表示真正的"刷新/冷启动"。

  ### 测试

  新增 3 个回归用例：

  - `首屏立即登录（prev=undefined + hint=login fresh） → source=login`
  - `首屏立即登出（prev=undefined + hint=logout fresh） → source=logout`
  - `首屏 + hint 已过期 → source=initial（启发式 fallback 仍然生效）`

## 0.9.2

### Patch Changes

- fix(react): `useAuthInjector.injectAuth` 现在能从 `error` / `unauthenticated` 状态正常恢复到 `authenticated`

  ## 背景

  `useAuthInjector` 是 swr-login 的"逃生舱" hook，用于让外部登录流程
  （如多步骤登录、第三方 SDK 回调、密码重置后的会话恢复）将登录态注入回 swr-login 体系。

  ## 修复

  `injectAuth` 之前直接调用 `stateMachine.transition('authenticated')`，
  但状态机不允许 `error -> authenticated` / `unauthenticated -> authenticated`
  直接转换，导致以下场景：

  ```
  [swr-login] Invalid state transition: error -> authenticated
  ```

  最终用户会被 `AuthGuard` 误判为未登录、踢回首页。

  修复后 `injectAuth` 在检测到当前状态为 `error` 或 `unauthenticated` 时，
  会先 `transition('authenticating')` 中转一次（这是合法转换），
  再 `transition('authenticated')`。每一步都符合状态机契约，
  `injectAuth` 真正成为可在任意状态下完成恢复的逃生舱。

  ## 受影响场景

  - `@tencent/coding-auth-password` 的 `helpers.skipReset()` 调用后，
    业务侧用 `injectAuth(authResp)` 派发 `login` 事件以恢复登录态；
  - 其他在 `login()` reject 之后才完成的外部登录流程；
  - 多步骤登录中途出错后，从外部恢复登录态。

  ## 兼容性

  完全向后兼容。原本能直接成功的转换（`idle/authenticating/refreshing -> authenticated`）
  路径不变；仅修复了 `error` / `unauthenticated` 起点被状态机拒绝的 bug。

## 0.9.1

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.9.0

## 0.9.0

### Minor Changes

- feat: add UserChangeSource / UserChangeEvent and user-change hooks

  New APIs to observe _why_ the user value changed, not just _that_ it changed.

  **`@swr-login/core`**

  - New type `UserChangeSource` — discriminated union: `'initial' | 'login' | 'logout' | 'revalidate' | 'external'`
  - New type `UserChangeEvent<T>` — full transition payload with `source`, `user`, `previousUser`, `timestamp`
  - `AuthEventMap` extended with `'user-change': UserChangeEvent` — subscribe via `emitter.on('user-change', cb)`

  **`@swr-login/react`**

  - `useUser()` return value extended with `lastChangeSource: UserChangeSource | null` and `lastChangeEvent: UserChangeEvent<T> | null`
  - New hook `useUserChange<T>()` — discrete event stream, re-renders on each transition
  - New hook `useUserChangeEffect(cb)` — side-effect callback, no re-render; listener ref always up-to-date (no `useCallback` needed)
  - New hook `useUserChangeOn(source | source[], cb)` — filtered variant of `useUserChangeEffect`

  All 5 sources are handled automatically:

  - `initial` — first `fetchUser` resolution on mount
  - `login` / `logout` — Provider subscribes to emitter events and writes a TTL hint
  - `external` — cross-tab BroadcastChannel sync marks hint as `external`
  - `revalidate` — any other SWR cache change

  Fully backward-compatible: no existing API changed.

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.8.0

## 0.8.0

### Minor Changes

- feat: add `swrOptions` to SWRLoginConfig for consumer-configurable SWR behavior

  Added a new optional `swrOptions` field to `SWRLoginConfig` that allows consumers to customize SWR revalidation behavior in `useUser()` without wrapping in a separate `SWRConfig`.

  Exposed options: `revalidateOnFocus`, `revalidateOnReconnect`, `dedupingInterval`, `focusThrottleInterval`, `refreshInterval`.

  Previously, `useUser()` hardcoded `revalidateOnFocus: true` which could not be overridden by consumers. Now consumers can disable it via:

  ```ts
  createAuthConfig({
    swrOptions: { revalidateOnFocus: false },
  });
  ```

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.7.0

## 0.7.0

### Minor Changes

- fix: cookie-based adapter 外部登录态兼容

  - **useUser fetcher**: refresh 失败后，如果 token 仍然存在（如 cookie-based 场景），继续尝试 fetchUser 让服务端验证，而非直接返回 null
  - **SWRLoginProvider**: 初始化时，当 token 存在但 expiresAt 为 null（未知过期时间，如外部登录）时，乐观认证让 fetchUser/SWR revalidate 来验证

  修复了外部登录态（如通过主站设置 cookie）导致 hasAuth()=true 但 useUser()=null 的无限循环跳转问题。

## 0.6.0

### Minor Changes

- feat: add `TokenAdapter.hasAuth()` optional method and `useAdapter()` hook

  - `TokenAdapter` interface gains an optional `hasAuth?(): boolean` method for synchronous auth-state checks
  - New `useAdapter()` React hook exposes `hasAuth()` (with fallback to `getAccessToken() !== null`) and the raw `adapter` reference
  - Enables homepage auto-redirect patterns without waiting for SWR revalidation

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.6.0

## 0.5.0

### Minor Changes

- 新增 `afterAuth` 钩子，支持在 plugin 登录成功后、`fetchUser` 调用前执行自定义逻辑。

  - `@swr-login/core`：新增 `AfterAuthContext` 接口，`SWRLoginConfig` 新增 `afterAuth` 可选配置项
  - `@swr-login/react`：`useLogin` 在 `pluginManager.login()` 成功后插入 `afterAuth` 钩子调用，支持通过 `skipFetchUser()` 跳过后续 fetchUser，或通过抛出错误回滚 token

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.5.0

## 0.4.0

### Minor Changes

- 新增 fetchUser 错误处理机制：

  - `SWRLoginConfig` 新增 `validateUserOnLogin`（默认 true）：login 成功后自动调用 `fetchUser` 验证用户状态，失败则回滚 token 并 reject
  - `SWRLoginConfig` 新增 `onFetchUserError`：`fetchUser` 抛出错误时的回调，支持返回 `'retry'` / `'logout'` / `'ignore'` 三种策略
  - `useUser` 返回值新增 `lastError`：持久化保存最近一次 `fetchUser` 失败的错误，不随状态切换清除
  - `useUser` 返回值新增 `clearError()`：手动重置 `lastError`

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.4.0

## 0.3.0

### Minor Changes

- feat: add MultiStepPlugin support for multi-step login flows

  - New MultiStepLoginPlugin interface and LoginStep type definition
  - Extended PluginManager with getSteps(), executeStep(), finalizeMultiStep() methods
  - New useMultiStepLogin hook for step-by-step login state management
  - New useAuthInjector hook for injecting external auth state
  - New error classes: StepNotFoundError, StepValidationError, MultiStepFlowError

### Patch Changes

- Updated dependencies
  - @swr-login/core@0.3.0

## 0.2.0

### Minor Changes

- 89e7b90: Publish all packages to npm.

  - `@swr-login/react`: First publish — React bindings (Provider, Hooks, AuthGuard)
  - `swr-login`: First publish — Unified entry package re-exporting core + react + presets
  - All adapter and plugin packages: First publish

### Patch Changes

- Updated dependencies [89e7b90]
  - @swr-login/core@0.2.0
