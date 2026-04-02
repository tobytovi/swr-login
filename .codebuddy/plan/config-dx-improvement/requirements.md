# 需求文档：swr-login 配置 DX 优化

## 引言

当前 `SWRLoginProvider` 的配置方式要求开发者在 JSX 中内联一个复杂的 config 对象，包含 adapter、plugins、fetchUser 等字段。当插件数量增多时，配置代码膨胀严重，可读性差，且缺乏类型推导辅助和配置复用机制。

本次迭代将实现两个优化方案：

1. **`createAuthConfig` 辅助函数**（方案一）：提供一个类型安全的配置工厂函数，鼓励开发者将配置抽离到独立文件，类似 Vite 的 `defineConfig` 模式。
2. **Preset 预设模式**（方案五）：为最常见的认证场景提供开箱即用的预设配置工厂，大幅降低新手上手门槛。

两个方案均为**纯增量 API**，不破坏现有接口，完全向后兼容。

---

## 需求

### 需求 1：`createAuthConfig` 辅助函数

**用户故事：** 作为一名使用 swr-login 的前端开发者，我希望有一个 `createAuthConfig` 辅助函数来创建配置对象，以便将配置抽离到独立文件中，获得完整的类型推导和 IDE 自动补全支持，同时让 Provider 的 JSX 代码更简洁。

#### 验收标准

1. WHEN 开发者从 `swr-login` 或 `@swr-login/core` 导入 `createAuthConfig` THEN 系统 SHALL 导出一个接受 `SWRLoginConfig` 类型参数并返回 `SWRLoginConfig` 类型的函数。

2. WHEN 开发者调用 `createAuthConfig({ adapter, plugins, ... })` THEN 系统 SHALL 返回与传入参数完全相同的配置对象，不做任何修改或副作用。

3. WHEN 开发者在 IDE 中编写 `createAuthConfig({})` 的参数 THEN 系统 SHALL 提供完整的 `SWRLoginConfig` 字段自动补全和类型检查（包括 `adapter`、`plugins`、`fetchUser`、`cacheAdapter`、`onLogin`、`onLogout`、`onError`、`security` 等字段）。

4. WHEN 开发者将 `createAuthConfig` 的返回值传递给 `<SWRLoginProvider config={...}>` THEN 系统 SHALL 无类型错误地接受该配置。

5. WHEN 开发者不使用 `createAuthConfig` 而直接传递对象字面量给 `config` prop THEN 系统 SHALL 继续正常工作（向后兼容）。

6. WHEN `createAuthConfig` 被导出 THEN 系统 SHALL 同时从 `@swr-login/core`（核心包）和 `swr-login`（统一入口包）两个路径导出该函数。

---

### 需求 2：Preset 预设模式

**用户故事：** 作为一名刚接触 swr-login 的前端开发者，我希望有预设配置（presets），以便只需提供少量必要参数（如 URL、clientId）就能快速搭建常见的认证方案，而不需要手动组装 adapter 和 plugins。

#### 2.1 Preset 基础架构

##### 验收标准

1. WHEN 开发者从 `swr-login` 或 `swr-login/presets` 导入 `presets` 对象 THEN 系统 SHALL 导出一个包含多个预设工厂函数的命名空间对象。

2. WHEN 开发者调用任意 preset 工厂函数 THEN 系统 SHALL 返回一个完整的 `SWRLoginConfig` 对象，可直接传递给 `<SWRLoginProvider config={...}>`。

3. WHEN 开发者调用 preset 工厂函数并传入额外的 `SWRLoginConfig` 字段（如 `onLogin`、`onLogout`、`security` 等） THEN 系统 SHALL 将这些字段合并到生成的配置中，用户传入的字段优先级高于预设默认值。

4. IF 开发者传入了自定义的 `fetchUser` 函数 THEN 系统 SHALL 使用开发者的 `fetchUser` 替代预设默认的 `fetchUser` 实现。

5. IF 开发者未传入 `fetchUser` 但传入了 `userUrl` 字段 THEN 系统 SHALL 自动生成一个使用 Bearer token 请求该 URL 的 `fetchUser` 函数。

6. IF 开发者既未传入 `fetchUser` 也未传入 `userUrl` THEN 系统 SHALL 不设置 `fetchUser`（保持 undefined），不抛出错误。

#### 2.2 `presets.password` — 密码登录预设

##### 验收标准

1. WHEN 开发者调用 `presets.password({ loginUrl, userUrl })` THEN 系统 SHALL 返回一个配置对象，其中：
   - `adapter` 为 `JWTAdapter()` 默认实例（localStorage 策略）
   - `plugins` 包含一个 `PasswordPlugin({ loginUrl })` 实例
   - `fetchUser` 为自动生成的 Bearer token 请求函数（请求 `userUrl`）

2. WHEN 开发者传入可选的 `adapterOptions`（如 `{ storage: 'sessionStorage' }`） THEN 系统 SHALL 将其传递给 `JWTAdapter(adapterOptions)`。

3. WHEN 开发者传入可选的 `logoutUrl` THEN 系统 SHALL 将其传递给 `PasswordPlugin({ loginUrl, logoutUrl })`。

#### 2.3 `presets.social` — 社交登录预设

##### 验收标准

1. WHEN 开发者调用 `presets.social({ providers: { github: { clientId } }, userUrl })` THEN 系统 SHALL 返回一个配置对象，其中：
   - `adapter` 为 `JWTAdapter()` 默认实例
   - `plugins` 包含对应的 OAuth 插件实例（如 `GitHubOAuthPlugin({ clientId })`）
   - `fetchUser` 为自动生成的 Bearer token 请求函数

2. WHEN 开发者在 `providers` 中配置了多个社交登录渠道（如 `github`、`google`、`wechat`） THEN 系统 SHALL 为每个渠道创建对应的插件实例，全部加入 `plugins` 数组。

3. IF 开发者在 `providers` 中某个渠道传入了额外的插件选项（如 `tokenEndpoint`、`redirectUri`） THEN 系统 SHALL 将这些选项透传给对应的插件工厂函数。

4. IF `providers` 对象为空或未提供任何渠道 THEN 系统 SHALL 抛出一个描述性错误，提示至少需要配置一个社交登录渠道。

#### 2.4 `presets.passkey` — Passkey 登录预设

##### 验收标准

1. WHEN 开发者调用 `presets.passkey({ registerOptionsUrl, registerVerifyUrl, loginOptionsUrl, loginVerifyUrl, userUrl })` THEN 系统 SHALL 返回一个配置对象，其中：
   - `adapter` 为 `JWTAdapter()` 默认实例
   - `plugins` 包含一个 `PasskeyPlugin(...)` 实例
   - `fetchUser` 为自动生成的 Bearer token 请求函数

#### 2.5 `presets.full` — 完整预设（密码 + 社交 + Passkey）

##### 验收标准

1. WHEN 开发者调用 `presets.full({ password: { loginUrl }, providers: { github: { clientId } }, passkey: { ... }, userUrl })` THEN 系统 SHALL 返回一个配置对象，其中 `plugins` 数组包含所有已配置渠道的插件实例。

2. IF 开发者只配置了部分渠道（如只有 `password` 和 `github`，没有 `passkey`） THEN 系统 SHALL 只包含已配置渠道的插件，不包含未配置的渠道。

3. IF 开发者未配置任何渠道（`password`、`providers`、`passkey` 均未提供） THEN 系统 SHALL 抛出一个描述性错误，提示至少需要配置一个认证渠道。

---

### 需求 3：导出与包结构

**用户故事：** 作为一名使用 swr-login 的前端开发者，我希望新增的 API 能通过统一入口包和子路径两种方式导入，以便与现有的导入习惯保持一致。

#### 验收标准

1. WHEN 开发者使用 `import { createAuthConfig } from 'swr-login'` THEN 系统 SHALL 正确导出该函数。

2. WHEN 开发者使用 `import { createAuthConfig } from '@swr-login/core'` THEN 系统 SHALL 正确导出该函数。

3. WHEN 开发者使用 `import { presets } from 'swr-login'` THEN 系统 SHALL 正确导出 presets 对象。

4. WHEN 开发者使用 `import { presets } from 'swr-login/presets'` THEN 系统 SHALL 通过子路径导出正确导出 presets 对象（需要在 `package.json` 的 `exports` 中新增 `./presets` 子路径）。

5. WHEN presets 模块被导入 THEN 系统 SHALL 确保未使用的 adapter/plugin 包可以被 tree-shaking 移除（每个 preset 工厂函数应动态导入或延迟引用对应的 adapter/plugin）。

---

### 需求 4：类型安全与开发者体验

**用户故事：** 作为一名使用 TypeScript 的前端开发者，我希望所有新增 API 都有完整的类型定义和 JSDoc 注释，以便在 IDE 中获得良好的自动补全和文档提示。

#### 验收标准

1. WHEN 开发者在 IDE 中悬停 `createAuthConfig` 函数 THEN 系统 SHALL 显示 JSDoc 注释，包含函数说明和使用示例。

2. WHEN 开发者在 IDE 中悬停任意 preset 工厂函数（如 `presets.password`） THEN 系统 SHALL 显示 JSDoc 注释，包含该预设的说明、参数描述和使用示例。

3. WHEN 开发者为 preset 工厂函数传入参数 THEN 系统 SHALL 对每个预设定义独立的 Options 类型接口（如 `PasswordPresetOptions`、`SocialPresetOptions` 等），提供精确的类型提示。

4. WHEN preset 工厂函数的 Options 类型中包含可选的 `SWRLoginConfig` 扩展字段 THEN 系统 SHALL 使用 `Partial<Pick<SWRLoginConfig, ...>>` 或交叉类型来实现，确保类型正确且不与预设必填字段冲突。

---

### 需求 5：文档更新

**用户故事：** 作为一名使用 swr-login 的前端开发者，我希望 README 文档中包含新 API 的使用示例，以便快速了解和上手。

#### 验收标准

1. WHEN 新 API 实现完成 THEN 系统 SHALL 在 `README.md` 和 `README.zh-CN.md` 中新增 `createAuthConfig` 的使用示例章节。

2. WHEN 新 API 实现完成 THEN 系统 SHALL 在 `README.md` 和 `README.zh-CN.md` 中新增 Presets 预设模式的使用示例章节，覆盖 `presets.password`、`presets.social`、`presets.passkey` 和 `presets.full` 四种预设。

3. WHEN 文档更新完成 THEN 系统 SHALL 在快速开始（Quick Start）章节中优先展示使用 preset 的最简方式，将手动配置方式作为"高级用法"展示。
