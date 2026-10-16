# Theme

## Runtime 主题包

原型通过 Registry 的 `themePackId` 绑定主题包；冷链使用 `pbwork-base`。包内声明主题和模式，Workbench 画布预览设置分别选择主题、浅色/深色/跟随系统。主题不是业务 Variant。

解析、加载、资产摘要、CSS 与响应式读取的权威说明见[主题包解析模型](../../../../docs/architecture/theme-packs.md)。Runtime 已提供主题表并动态注册 Vuetify 主题；Workbench 外壳主题保持独立。

## URL 与偏好

1. URL `theme` 表示包内主题 ID，`mode` 表示具体的 `light` / `dark`。例如 `?variant=default&theme=default&mode=dark`。缺省取包声明的默认项，业务 query 不得占用 variant/theme/mode。
2. 偏好使用 `pbwork.runtime.theme.v2`，以 prototypeId 分别保存 `{ theme, mode: 'light' | 'dark' | 'system' }`。v1 不读取。包中已不存在的偏好不继续使用；存储损坏或不可用不阻断页面。
3. 系统模式通过 matchMedia 转成具体模式，URL 不写 system；系统方案变化后 replace URL，保留 system 偏好。
4. 明确的 URL 维度用于分享和预览；省略的维度分别采用当前原型偏好。返回/前进恢复当前偏好，避免历史条目回滚皮肤。切换使用 replace，保留 pbParent 等 history state，不增加业务 history。
5. Capture prepare 与强制导航固定默认主题和指定模式，禁止偏好覆盖。当前 Capture 协议仍通过 themeId 传具体模式，包摘要与完整主题身份进入 Evidence/Handoff 属于平台升级第 3 步。
6. iframe 与 Workbench 使用 bridge 和原型级偏好同步。切换原型不得沿用上一个原型的主题会话。

## 组件迁移边界

Runtime 输出新键目录的 CSS，重名变量以主题表为准。尚未迁移的 DS/冷链组件仍消费原有 Token 变量，Runtime 暂时保留原有生成结果；没有建立新旧键别名映射。组件 JS 的模块级默认值读取也尚待替换。上述旧链路在第 2 步第三批按组件、Contract 和 Evidence 绑定一并移除，届时才能宣称所有组件完整响应主题包。

Token Gallery、Component Playground 与旧 ThemePreview 仍使用以下旧数据；主题包选择器在第四批接入，不能将这里的旧 light/dark 目录理解为包内主题列表。

| 旧数据 | 文件 |
| --- | --- |
| Token | `src/design-system/tokens/tokens.json` |
| 浅色模式值 | `src/design-system/themes/light.json` |
| 深色模式值 | `src/design-system/themes/dark.json` |

## 检查

- [ ] 浅/深色切换更新 Runtime 和画布，iframe 不重建，Workbench 外壳不被修改
- [ ] 返回、前进和恢复 pbParent 不回滚主题/模式
- [ ] 系统模式随系统变化，URL 保持具体模式，偏好仍为 system
- [ ] 原型之间的偏好隔离，显式 Capture 模式不会被偏好覆盖
- [ ] 业务 Variant 与主题、模式独立组合
