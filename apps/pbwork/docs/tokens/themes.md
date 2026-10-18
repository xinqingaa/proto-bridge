# Theme

## Runtime 主题包

原型通过 Registry 的 `themePackId` 绑定主题包；冷链使用 `pbwork-base`。包内声明主题和模式，Workbench 画布预览设置分别选择主题、浅色/深色/跟随系统。主题不是业务 Variant。


解析、加载、资产摘要、CSS 与响应式读取的权威说明见[主题包解析模型](../../../../docs/architecture/theme-packs.md)。Runtime 已提供主题表并动态注册 Vuetify 主题；Workbench 外壳主题保持独立。

## URL 与偏好

1. URL `theme` 表示包内主题 ID，`mode` 表示具体的 `light` / `dark`。例如 `?variant=default&theme=default&mode=dark`。缺省取包声明的默认项，业务 query 不得占用 variant/theme/mode。
2. 偏好使用 `pbwork.runtime.theme.v2`，以 prototypeId 分别保存 `{ theme, mode: 'light' | 'dark' | 'system' }`。v1 不读取。包中已不存在的偏好不继续使用；存储损坏或不可用不阻断页面。
3. 系统模式通过 matchMedia 转成具体模式，URL 不写 system；系统方案变化后 replace URL，保留 system 偏好。
4. 明确的 URL 维度用于分享和预览；省略的维度分别采用当前原型偏好。返回/前进恢复当前偏好，避免历史条目回滚皮肤。切换使用 replace，保留 pbParent 等 history state，不增加业务 history。
5. Capture prepare 与强制导航固定默认主题和指定模式，禁止偏好覆盖。Case 身份里的 themeId 只表示模式；包摘要、键目录摘要、声明时钟和完整取值表由清单写入 Evidence，Handoff 固定默认主题与模式。冷链声明的采集时钟是 `2026-07-28T00:00:00.000Z`、`Asia/Shanghai`。
6. iframe 与 Workbench 使用 bridge 和原型级偏好同步。切换原型不得沿用上一个原型的主题会话。

## 组件与预览

DS 与冷链已使用新键、响应式 JS 读取和不可变常量，Runtime 不再叠加旧 CSS。共享 SurfaceMaterial 由 surface.treatment 与组件材质控制驱动；基础包保留一级 Tab 的 glass 覆盖，AppBar/Tabbar 跟随全局材质。

旧 Token/Theme JSON、resolveThemeTokens、bindTokens 与 tokenDefaults 已从生产代码移除；旧值仅留在 test/fixtures/legacy-theme 用于等价断言。全部设计基础分类、主题页与 Registry 组件的共享手机预览可按真实 Registry 绑定选择基础、原型或明确标注的演示包，分别选择包内主题与浅深模式，按需双机对照。分类与组件的只读值与来源表位于「来源」Tab，逐项展示真实值样板（字体以实际配置渲染），搜索不改变手机样板，不提供差异列或差异筛选；适应视区/100% 和手机缩放不改变主题值或逻辑设备，卡片随手机高度撑开；共同滚动可开关并保存偏好。设置只在预览侧栏显示，来源页使用完整卡片宽度；迁移范围及扩展登记见[预览工作流](../workbench-preview.md)。样例包不绑定正式原型。

## 预览制作与人工验收

具体分类与组件的手机样板、原型上下文和按需对比遵守[Workbench 预览工作流](../workbench-preview.md)。当前 Gallery/Playground 的接入差异与迁移状态见该文的能力边界；不能据制作规则声称双机或原型扩展登记已交付。

## 检查

- [ ] 浅/深色切换更新 Runtime 和画布，iframe 不重建，Workbench 外壳不被修改
- [ ] 返回、前进和恢复 pbParent 不回滚主题/模式
- [ ] 系统模式随系统变化，URL 保持具体模式，偏好仍为 system
- [ ] 原型之间的偏好隔离，显式 Capture 模式不会被偏好覆盖
- [ ] 业务 Variant 与主题、模式独立组合
