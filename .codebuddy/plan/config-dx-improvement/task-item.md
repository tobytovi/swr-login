# 实施计划

- [ ] 1. 在 `@swr-login/core` 中实现 `createAuthConfig` 辅助函数
   - 在 `packages/core/src/create-auth-config.ts` 中创建文件，实现 `createAuthConfig` 函数
   - 函数签名：`(config: SWRLoginConfig) => SWRLoginConfig`，直接返回传入的 config 对象，不做任何修改
   - 添加完整的 JSDoc 注释，包含函数说明和使用示例（展示将配置抽离到独立文件 `auth.config.ts` 的用法）
   - 在 `packages/core/src/index.ts` 中导出 `createAuthConfig`
   - _需求：1.1、1.2、1.3、1.4、1.6_

- [ ] 2. 在 `swr-login` 统一入口包中导出 `createAuthConfig`
   - 在 `packages/swr-login/src/index.ts` 的 Core 导出区域中添加 `createAuthConfig` 的 re-export
   - _需求：1.5、1.6、3.1、3.2_

- [ ] 3. 实现 Preset 内部工具函数 `createFetchUser`
   - 在 `packages/swr-login/src/presets/` 目录下创建 `utils.ts` 文件
   - 实现 `createFetchUser(userUrl: string)` 工具函数，返回一个使用 Bearer token 请求指定 URL 的 `fetchUser` 函数
   - 实现 `resolveBaseOptions` 工具函数，处理 `fetchUser` / `userUrl` 的优先级逻辑（自定义 fetchUser > userUrl > undefined）以及 `SWRLoginConfig` 扩展字段的合并逻辑
   - 定义 `BasePresetOptions` 基础类型接口，包含 `userUrl?`、`fetchUser?`、`adapterOptions?` 以及 `Partial<Pick<SWRLoginConfig, 'onLogin' | 'onLogout' | 'onError' | 'security' | 'cacheAdapter'>>` 扩展字段
   - _需求：2.1.3、2.1.4、2.1.5、2.1.6_

- [ ] 4. 实现 `presets.password` 密码登录预设
   - 在 `packages/swr-login/src/presets/` 目录下创建 `password.ts` 文件
   - 定义 `PasswordPresetOptions` 类型接口，包含必填的 `loginUrl`、可选的 `logoutUrl`、`fetchOptions`、`transformResponse`，继承 `BasePresetOptions`
   - 实现 `password(options)` 工厂函数：内部调用 `JWTAdapter(adapterOptions)` 和 `PasswordPlugin({ loginUrl, logoutUrl, ... })`，组装并返回完整的 `SWRLoginConfig`
   - 添加完整的 JSDoc 注释和使用示例
   - _需求：2.2.1、2.2.2、2.2.3_

- [ ] 5. 实现 `presets.social` 社交登录预设
   - 在 `packages/swr-login/src/presets/` 目录下创建 `social.ts` 文件
   - 定义 `SocialPresetOptions` 类型接口，`providers` 字段为 `{ github?: GitHubOAuthPluginOptions; google?: GoogleOAuthPluginOptions; wechat?: WeChatPluginOptions }`（均可选），继承 `BasePresetOptions`
   - 实现 `social(options)` 工厂函数：遍历 `providers` 对象，为每个非 undefined 的渠道创建对应的插件实例，加入 `plugins` 数组
   - 当 `providers` 为空对象或未提供任何渠道时，抛出描述性错误
   - 添加完整的 JSDoc 注释和使用示例
   - _需求：2.3.1、2.3.2、2.3.3、2.3.4_

- [ ] 6. 实现 `presets.passkey` Passkey 登录预设
   - 在 `packages/swr-login/src/presets/` 目录下创建 `passkey.ts` 文件
   - 定义 `PasskeyPresetOptions` 类型接口，包含必填的 `registerOptionsUrl`、`registerVerifyUrl`、`loginOptionsUrl`、`loginVerifyUrl`，可选的 `rpId`，继承 `BasePresetOptions`
   - 实现 `passkey(options)` 工厂函数：内部调用 `JWTAdapter(adapterOptions)` 和 `PasskeyPlugin({ ... })`，组装并返回完整的 `SWRLoginConfig`
   - 添加完整的 JSDoc 注释和使用示例
   - _需求：2.4.1_

- [ ] 7. 实现 `presets.full` 完整预设
   - 在 `packages/swr-login/src/presets/` 目录下创建 `full.ts` 文件
   - 定义 `FullPresetOptions` 类型接口，包含可选的 `password`（`{ loginUrl, logoutUrl?, ... }`）、`providers`（同 social 的 providers）、`passkey`（`{ registerOptionsUrl, ... }`），继承 `BasePresetOptions`
   - 实现 `full(options)` 工厂函数：根据传入的渠道配置，有条件地创建对应的插件实例，合并到 `plugins` 数组
   - 当三个渠道均未配置时，抛出描述性错误
   - 添加完整的 JSDoc 注释和使用示例
   - _需求：2.5.1、2.5.2、2.5.3_

- [ ] 8. 创建 `presets` 命名空间入口并配置导出
   - 在 `packages/swr-login/src/presets/index.ts` 中创建入口文件，聚合导出 `presets` 对象（包含 `password`、`social`、`passkey`、`full` 四个工厂函数），同时导出所有 Options 类型接口
   - 在 `packages/swr-login/tsup.config.ts` 的 `entry` 中新增 `'presets': 'src/presets/index.ts'` 入口
   - 在 `packages/swr-login/package.json` 的 `exports` 中新增 `"./presets"` 子路径（import/require/types）
   - 在 `packages/swr-login/src/index.ts` 中添加 `presets` 对象和所有 Options 类型的 re-export
   - _需求：2.1.1、2.1.2、3.3、3.4、3.5_

- [ ] 9. 为 `createAuthConfig` 和 `presets` 编写单元测试
   - 在 `packages/core/src/__tests__/create-auth-config.test.ts` 中编写 `createAuthConfig` 的测试：验证返回值与传入值相同、类型兼容性
   - 在 `packages/swr-login/src/__tests__/presets/` 目录下为每个 preset 编写测试文件（`password.test.ts`、`social.test.ts`、`passkey.test.ts`、`full.test.ts`）
   - 测试覆盖：正常配置返回正确的 `SWRLoginConfig`、`userUrl` 自动生成 `fetchUser`、自定义 `fetchUser` 覆盖、扩展字段合并、空配置抛错等场景
   - _需求：1.1–1.6、2.1.1–2.5.3_

- [ ] 10. 更新 README 文档
   - 在 `README.md` 中新增 `createAuthConfig` 使用示例章节和 Presets 预设模式章节（覆盖 `presets.password`、`presets.social`、`presets.passkey`、`presets.full`）
   - 在 `README.zh-CN.md` 中同步新增对应的中文章节
   - 在快速开始（Quick Start）章节中优先展示使用 preset 的最简方式，将手动配置方式标注为"高级用法"
   - _需求：5.1、5.2、5.3_
