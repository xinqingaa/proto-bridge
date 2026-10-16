# 原型主题包与授权设计

> 本文是[平台升级计划](./pbwork-platform-upgrade.md)第 2、3、4 步的实施设计。已落地的主题解析模块以[主题包解析模型](../architecture/theme-packs.md)为准；其余段落仍是计划，不代表现行 Contract。实施完成、稳定行为迁入 `docs/architecture` 与 `docs/reference` 之后，本文移入 `docs/history`。
>
> 范围：键目录与主题包格式、解析与校验、Core 主题身份、Runtime 与 Workbench 接入、主题一致性探针、`pbStyle` 键类型生成。字体、Flutter 适配与组件层全量发布不在范围内，理由见计划正文「范围约束」。

## 1. 规模盘点

本节的数字来自 2026-10-16 工作树的只读盘点，是 B 方案（键名不变、只改名不改用法）与 A 方案取舍的依据。

唯一 Token 源是 `apps/pbwork/src/design-system/tokens/tokens.json`（扁平 `{id,label,category,defaultValue,description}`），共 154 项：

| 类别 | 数量 | 值形态 | dark 覆盖 |
| --- | --- | --- | --- |
| color | 38 | hex / rgba 字符串 | 36（toast、on-toast 两态相同） |
| typography | 13 | 复合字符串 `"650 20px/1.3 Inter, system-ui, sans-serif"` | 0 |
| spacing | 12 | number（运行时补 `px`） | 0 |
| radius | 7 | number（补 `px`） | 0 |
| elevation | 9 | box-shadow 字符串 | 9 |
| sizing | 22 | number（补 `px`） | 0 |
| border | 6 | 字符串，内嵌 `var(--pb-color-…)` | 0 |
| opacity | 8 | number | 1（glass） |
| motion | 14 | `120ms`、`cubic-bezier(...)`、number、`180deg` | 0 |
| layout | 22 | `100%`、`-50%`、`640px`、`1`、`0.33` 等 | 0 |
| layer | 2 | number | 0 |
| effect | 1 | `blur(...) saturate(...)` | 0 |

主题只有 `themes/light.json`（空覆盖）与 `themes/dark.json`（45 项覆盖），没有 Primitive、没有组件层、没有主题色轴、没有字体文件；`Inter` 未随仓库分发，实际渲染为 `system-ui`。

消费规模（引用次数）：

| 类别 | Web DS | 冷链原型 | Flutter 映射 |
| --- | --- | --- | --- |
| color | 502 | 115 | 84 |
| typography | 160 | 56 | 26 |
| spacing | 221 | 114 | 25 |
| radius | 154 | 27 | 15 |
| sizing | 179 | 9 | 46 |
| motion | 165 | 0 | 29 |
| layout | 166 | 26 | 46 |
| opacity | 94 | 0 | 17 |
| elevation | 71 | 0 | 21 |
| border | 42 | 7 | 12 |
| layer | 28 | 0 | 4 |
| effect | 6 | 0 | 4 |

合计 Web DS 约 1788 处、冷链原型约 354 处、Workbench 约 92 处、测试约 93 处。

基础取值现状：按 light / dark 计算，`on-warning/warning`（L 3.19）、`on-info/info`（L 4.40）、`primary/primary-soft`（L 4.13）、`secondary/secondary-soft`（L 4.49）、`error/error-soft`（D 4.45）、`outline/surface`（L 2.09，UI）不达标。「基础包对比度门禁全部通过」不能靠零改动实现，处置方式见第 3.4 节。

## 2. 键目录

### 2.1 结构

键目录是 PBWork 数据，Core 只接收它作为输入：

```text
apps/pbwork/src/design-system/theme/
  key-catalog.json          语义层 + 常量层键定义、值类型、对比度配对、可变维度
  constants.json            PBWork 常量表（不进主题包、不进 Evidence、不进 Target）
  generated/keys.ts         第 4 步生成的类型（提交入库）
components/contracts/*.json 组件层键随 Contract 发布（`componentTokens` 段）
```

每个键定义：

```json
{
  "id": "color.primary",
  "tier": "semantic",
  "valueType": "color",
  "bindable": true,
  "modeVariant": true,
  "label": "主色",
  "description": "…"
}
```

- `valueType`：`color | length | number | duration | easing | shadow | border | filter | enum | asset | typography`。CSS 单位只由 `valueType` 决定，不再由键前缀正则决定。
- `modeVariant`：只有 color、shadow、opacity 类 number、filter、asset 可为 `true`。长度、enum 不允许随模式变化，使明暗两态几何不变——这是主题一致性探针能够成立的前提。
- `bindable`：是否可被 `tokenBindings` 与 `pbStyle` 引用；常量与字阶部件为 `false`。

### 2.2 语义层

**颜色（36，全部 `modeVariant`）**：`color.background`、`on-background`、`surface`、`on-surface`、`on-surface-muted`、`surface-variant`、`surface-recessed`、`surface-selected`、`surface-raised`、`inverse-surface`、`on-inverse-surface`、`primary`、`primary-soft`、`on-primary`、`action`、`action-soft`、`on-action`、`secondary`、`secondary-soft`、`on-secondary`、`error`、`error-soft`、`on-error`、`success`、`success-soft`、`on-success`、`warning`、`warning-soft`、`on-warning`、`info`、`on-info`、`border`、`outline`、`divider`、`disabled`、`scrim`。

**间距（保留现有刻度 ID，`length`，不可随模式变化）**：以计划正文的 B 方案为准，旧语义间距键保留 `spacing.xxs`(2)、`spacing.xs`(4)、`spacing.sm`(8)、`spacing.sm-plus`(12)、`spacing.md`(16)、`spacing.lg`(24)、`spacing.lg-plus`(40)、`spacing.2xl`(48)，只更新用途说明。其余旧间距的分层去向仍按第 2.6 节；不引入用途型 `space.*` 公共键，也不逐消费位置改绑。

**字阶（16 个角色，可绑定）**：保留 13 个旧角色 ID（`typography.display`、`headline`、`title-lg`、`title`、`title-sm`、`subtitle`、`body-lg`、`content`、`body-sm`、`label`、`caption`、`caption-strong`、`micro`），新增 `typography.numeric-display`、`numeric-title`、`numeric-content`（等宽数字）。

字族固定为系统字体栈，不可由主题包覆盖；每个角色只声明字重、字号、行高：

```json
"typography.title": { "family": "$default", "weight": 650, "size": 20, "lineHeight": 1.3 }
```

派生部件键 `typography.{role}.family|weight|size|line-height`：不可绑定；字族只读，其余部件可被包覆盖；Evidence 与 Target 只认角色。CSS 输出 `--pb-typography-title`（`font` 简写）、四个部件变量与 `--pb-typography-title-variant-numeric`。

**圆角（6）**：`radius.mark`(4)、`radius.control-compact`(8)、`radius.control`(12)、`radius.surface`(16)、`radius.overlay`(24)、`radius.pill`(999)。

**尺寸（16）**：`size.control-compact`(32)、`control`(40)、`control-large`(48)、`touch`(44)、`icon-inline`(16)、`icon-compact`(18)、`icon`(20)、`icon-prominent`(24)、`avatar-compact`(28)、`avatar`(40)、`avatar-large`(56)、`navigation-bar`(64)、`stroke`(2)、`indicator`(3)、`caret`(5)、`marker`(6)。

**描边（6）**：`border.width`(1)、`border.width-strong`(2)、`border.width-accent`(4)、`border.hairline`、`border.default`、`border.focus`。复合描边写成 `{ "width": "{border.width}", "style": "solid", "color": "{color.border}" }`，不再在字符串里嵌 `var()`。

**阴影（5，`modeVariant`）**：`elevation.surface`、`raised`、`floating`、`menu`、`overlay`。「无阴影」的绑定处改用字面量 `none`。

**透明度（4）**：`opacity.disabled`、`translucent`（旧 glass，`modeVariant`）、`hover`、`pressed`。

**动效（9）**：`motion.personality`（enum，不可绑定）、`duration-short`、`duration-medium`、`duration-long`、`easing-standard`、`easing-emphasized`、`easing-gentle`、`press-scale`、`press-scale-strong`。

**表面（2）**：`surface.treatment`（enum，不可绑定）、`surface.glass-backdrop`（filter）。

**密度（1）**：`density`（enum，不可绑定）。

**资产（4，`modeVariant`）**：`asset.brand-mark`、`asset.brand-wordmark`、`asset.launch-image`、`asset.empty-illustration`，基础值为 `none`。

### 2.3 性格键

性格键是「同一组件在不同原型里性格不同」的低成本表达方式，全部 DS 组件消费它们；具体组件的槽位不提升为组件层键。

| 键 | 值域 | 基础值 | CSS 落地 | Vuetify 落地 |
| --- | --- | --- | --- | --- |
| `density` | `compact \| regular \| comfortable` | `regular` | 根节点 `data-pb-density`；控件高度、间距档位由包内 `$switch` 解析成具体值，组件不读 enum | `createVuetify({ defaults })` 的全局 `density` |
| `motion.personality` | `calm \| standard \| lively` | `standard` | 根节点 `data-pb-motion`；时长、缓动、按压缩放由包内 `$switch` 解析；`prefers-reduced-motion` 仍由组件现有分支处理 | Vuetify 过渡不受控，PBWork 组件不依赖 Vuetify 动效 |
| `surface.treatment` | `solid \| outlined \| glass` | `solid` | 根节点 `data-pb-surface-treatment`；由共享组件 `SurfaceMaterial` 按属性选择分支，各分支只消费 Token | 不映射 |
| `radius.control` / `radius.surface` | 见 2.2 | 12 / 16 | 常规 CSS 变量 | 不映射 |
| `asset.*` | `none` 或 `{ "file": "assets/x.svg", "mediaType": "image/svg+xml", "alt": "…" }` | `none` | `--pb-asset-brand-mark: url("…")` 或 `none`；组件用 `useToken('asset.brand-mark')` 取 URL 渲染，`none` 时不渲染 | 不映射 |

`$switch` 只在主题包内解析，产物是具体值，Evidence 与 Target 看到的是解析后的结果。enum 键不随模式变化（校验规则保证）。

### 2.4 组件层

只保留与旧键等价所必需的组件键，以及表面处理键：

- 旧键中只能落在组件层的 11 项，例如 `color.navigation-active` → `tabbar.active`（默认 `{color.primary}`）、`color.section-tab-active` → `primary-tabs.active-color` 与 `secondary-tabs.active-color`（默认 `{color.on-surface}`）。
- 表面处理：`primary-tabs.selection-treatment`（基础包覆盖为 `glass`，保持现状）、`tabbar.surface-treatment`、`app-bar.surface-treatment`（默认 `{surface.treatment}`）。

Contract 新增段：

```json
"componentTokens": {
  "selection-surface": { "valueType": "color", "default": "{color.surface-selected}", "modeVariant": true },
  "selection-treatment": { "valueType": "enum", "default": "{surface.treatment}" }
},
"tokenBindings": { "selectionSurface": "primary-tabs.selection-surface", "height": "size.control" }
```

规则：`tokenBindings` 的槽位默认直接绑定语义键；只有当旧值没有对应的语义键（刻度名、组件专属取值）时才建组件键，并在基础包 `component.json` 里给出默认值。`validateRegistries` 检查每个组件键都有 Contract 声明与解析默认值。

组件形态差异（不同于 DS 的形状、质感）由原型自有组件或 DS 扩展承担，记为 DS 缺口，见 [ADR 0012](../decisions/0012-pbwork-ds-is-foundation-not-ceiling.md)。

### 2.5 常量层

`constants.json` 只承载实现常量，不可被主题包覆盖、不可绑定、不进入 Target 映射：

- `layout.*` 全部 22 项（`layout.fill`、`half`、`half-negative`、`translate-full-negative`、`focus-inset`、`sheet-max-height`、`load-more-root-margin`、`menu-max-height`、`dialog-max-width`、`form-max-width`、`pull-refresh-threshold`、`pull-refresh-max-distance`、`inset-xs-negative`、`inset-sm-negative`、`flex-fill`、`flex-grow`、`gesture-axis-lock`、`gesture-drag-limit`、`gesture-swipe-threshold`、`viewport-height`、`chart-min-height`、`chart-plot-height`）。
- `layout.zero`（取代 `spacing.none`、`radius.none`）、`layer.base`、`layer.content`、`opacity.hidden`、`opacity.visible`、`motion.duration-instant`、`motion.rotate-half-turn`、`motion.duration-click-suppression`、`elevation.none`。

`layout.inset-xs-negative` / `inset-sm-negative` 是间距的负值；迁移时把消费处改为 `calc(-1 * var(--pb-space-…))` 并删除这两个常量。

常量继续以 `--pb-{id}` CSS 变量输出，DS 与原型 CSS 可以使用。`AGENTS.md` 红线「具体值只存在于 Foundation/Theme」改写为「具体值只存在于主题包或 PBWork 常量表」，`flex-layout-policy.test.ts` 的固定值门禁不变。

### 2.6 旧键去向

154 个旧键全部有去向：语义层 102、组件层 11、退回 Primitive（包私有）9、常量层 32。34 个颜色键 ID 不变，直接保留为语义键；13 个 `typography.*` ID 不变，拆出部件；22 个 `layout.*`、2 个 `layer.*` ID 不变，转常量。其余：

| 旧键 | 新层 | 新键 / 去向 |
| --- | --- | --- |
| `color.navigation-active` | 组件 | `tabbar.active`，默认 `{color.primary}` |
| `color.section-tab-active` | 组件 | `primary-tabs.active-color`、`secondary-tabs.active-color`、`secondary-tabs.indicator`，默认 `{color.on-surface}` |
| `color.toast` / `color.on-toast` | 语义 | `color.inverse-surface` / `color.on-inverse-surface` |
| `spacing.*` | 语义 | ID 不变（B 方案），只更新用途说明 |
| `spacing.xs-plus` | 组件 | 仅组件层使用，基础包 `component.json` 引用 Primitive |
| `spacing.xl` | Primitive | 仅 Workbench 使用，改用工作台自有样式 |
| `spacing.3xl` | Primitive | 无消费 |
| `spacing.none`、`radius.none` | 常量 | `layout.zero` |
| `radius.xs` / `sm` / `md` / `lg` / `xl` / `full` | 语义 | `radius.mark` / `control-compact` / `control` / `surface` / `overlay` / `pill` |
| `elevation.none` | 常量 | 绑定处改字面量 `none` |
| `elevation.card` / `raised` / `glass` / `level-3` / `level-5` | 语义 | `elevation.surface` / `raised` / `floating` / `menu` / `overlay` |
| `elevation.level-1` / `level-2` / `level-4` | Primitive | 无消费 |
| `sizing.control-sm` / `md` / `lg` | 语义 | `size.control-compact` / `control` / `control-large` |
| `sizing.icon-sm` / `md` / `lg` / `compact` | 语义 | `size.icon-inline` / `icon` / `icon-prominent` / `icon-compact` |
| `sizing.avatar-sm` / `md` / `lg` | 语义 | `size.avatar-compact` / `avatar` / `avatar-large` |
| `sizing.touch`、`sizing.bottom-navigation` | 语义 | `size.touch`、`size.navigation-bar` |
| `sizing.indicator-thickness` / `caret` / `step-dot` / `progress-stroke` | 语义 | `size.indicator` / `caret` / `marker` / `stroke` |
| `sizing.menu-item` | 组件 | `menu.menu-item-height`，默认 `{size.control-large}` |
| `sizing.refresh-action-min-width` / `refresh-action-height` | 组件 | `scrollable-data-list.action-min-width` / `action-height` |
| `sizing.progress-track`、`sizing.textarea-rows` | 组件 | `progress.track-height`、`textarea.rows` |
| `sizing.tab` | Primitive | 无消费 |
| `border.width-hairline` / `accent-width` | 语义 | `border.width` / `border.width-accent` |
| `border.hairline` / `default` / `focus` | 语义 | ID 不变，改为复合值 |
| `border.strong` | Primitive | 无消费 |
| `opacity.disabled` / `hover` / `pressed` | 语义 | ID 不变 |
| `opacity.glass` | 语义 | `opacity.translucent` |
| `opacity.muted` / `overlay` | Primitive | 无组件消费（overlay 仅 TokenGallery 预览） |
| `opacity.hidden` / `visible` | 常量 | ID 不变 |
| `motion.duration-fast` / `normal` / `slow` | 语义 | `motion.duration-short` / `medium` / `long` |
| `motion.easing-*` | 语义 | ID 不变 |
| `motion.scale-pressed` / `scale-pressed-strong` | 语义 | `motion.press-scale` / `press-scale-strong` |
| `motion.duration-sheet` | 组件 | `flow-sheet.duration`、`bottom-sheet.duration`（基础包字面量 220ms） |
| `motion.duration-tab-viewport` | 组件 | `tab-viewport.duration`（240ms） |
| `motion.duration-toast` | 组件 | `toast.duration`（4000ms） |
| `motion.duration-instant` / `rotate-half-turn` / `duration-click-suppression` | 常量 | ID 不变 |
| `effect.glass-backdrop` | 语义 | `surface.glass-backdrop` |

间距刻度名继续对 Agent 与 Evidence 可见；包私有 Primitive（如 `space.4`、`radius.12`）仍不对外发布。

## 3. 主题包

### 3.1 目录

```text
apps/pbwork/src/design-system/theme-packs/
  base/                 pbwork-base，全部键的完整取值
  sample/               pbwork-sample，仅 Playground 可选，用于验证「换包不改代码」
apps/pbwork/src/prototypes/{prototypeId}/theme/
  pack.json  primitives.json  semantic.json  component.json
```

原型包 `id` 必须等于 `prototypeId`。冷链使用基础包，不建目录。

### 3.2 已落地的解析模型

主题包 Schema、表达式、解析优先级、诊断、摘要和 Core API 已落地，统一见[主题包解析模型](../architecture/theme-packs.md)。字体声明和独立主题色轴已移除；身份为 `packId@digest/theme/mode`。Runtime、组件与 Capture 接入仍按下文实施。

## 4. 主题身份接入 Core

身份统一为 `ThemeIdentity { packId, packDigest, theme, mode }`，字符串形态 `packId@sha1:…/theme/mode`。核心取舍：**`CaseKey.themeId` 字段保留，语义收窄为模式 ID**。这样取值变化不改变 Case 身份，只通过 `inputVersion` 使 Evidence 过期，符合「Case 只采默认模式」。

| 改动点 | 文件与符号 | 改动 |
| --- | --- | --- |
| Runtime 清单 | `runtime-contract/protocol.ts` `RuntimeCaptureManifest` | 新增必填 `theme: { packId, packDigest, keyCatalogDigest, themes, defaultTheme, modes, defaultMode }`；`RUNTIME_CAPTURE_PROTOCOL_VERSION` 升级 |
| 实际维度 | `RuntimeActualDimensions`、`PrepareRequest.expected` | `themeId` 换成 `theme: { packId, packDigest, theme, mode }` |
| 路由保留键 | `RuntimeRouteQueryKey` | 保留键改为 `variant`、`mode` |
| Case | `contracts/case.ts` | `themeId` 文档化为模式 ID；`RESERVED_THEME_ID` 仅用于无主题 Runtime |
| Selection | `capture/selection.ts` `ScreenSelectionDraft` | 删除 `themeIds`；展开矩阵时 `themeId = manifest.theme.defaultMode`；Selection 携带 `themePack: ThemeIdentity` |
| Case URL | `capture/runtime-url.ts` | 写 `mode`，不再写 `theme` |
| Capture 环境 | `capture/playwright-driver.ts` | `colorScheme = caseKey.themeId`（即模式；`light` / `dark` 以外报协议错误）；URL 环境校验与 `actualFact` 改为 `theme.mode`、`theme.theme`、`theme.packDigest`；actual 与 Selection 的主题摘要不一致即 `environment.theme-digest-mismatch` |
| Preflight | `capture/runtime-preflight.ts` | `colorScheme` 取 `manifest.theme.defaultMode`（发现阶段先用 light 读取清单，再按清单重建上下文）；`preflight.ts` 校验 `theme-pack` Catalog 的 digest 与清单一致，否则 `theme.digest-mismatch`（block）；Runtime 自报的 `ThemeDiagnostic` 以 Authoring Diagnostic 透传 |
| inputVersion | PBWork `runtime/capture-protocol.ts` `versionInput` | 加入 `theme.packDigest` 与 `keyCatalogDigest`。主题取值或键目录变化 → inputVersion 变化 → 现有 `revision.inputDigest === input.inputVersion` 判定使 Evidence 过期 |
| Catalog 种类 | `contracts/catalog.ts` `CATALOG_KINDS` | 新增 `theme-pack`。条目：`{packId}/manifest`（包元数据、继承链、digest、资产文件表）、`{packId}/{theme}/{mode}`（`ResolvedThemeTable` 的 values + provenance）。`inputDigest = packDigest` |
| token Catalog | `capture-protocol.ts` token 条目 | 改为键目录：语义键 + 组件键定义（valueType、bindable、modeVariant、description、来源 Contract），不含取值；常量不进入 |
| Blob | `contracts/blob.ts` `BLOB_KINDS` | 新增 `theme-asset`；Core 在 Capture 时通过 Playwright request 拉取清单中的资产 URL，校验 sha1 后写 Blob，挂在 `theme-pack` 条目 `blobIds` |
| Snapshot | `contracts/snapshot.ts` `catalogRefs` | 结构不变，多一个 `theme-pack` 引用 |
| Handoff | `contracts/handoff.ts` `AgentHandoff` | 新增必填 `themePack: { packId, packDigest, defaultTheme, defaultMode, catalogRevisionId }`；`capture/handoff.ts` 有 tokenBindings 事实时 `requiredCatalogKinds` 同时要求 `token` 与 `theme-pack` |
| Case 已解析值 | `evidence-read-model.ts`、`consumer-projection.ts` | 不逐节点复制取值。读模型以 Case 的 tokenBindings 关联 Handoff 固定的 `{packId}/{defaultTheme}/{defaultMode}` 表，派生 `resolvedValue` 与引用链；token 清单新增 `resolvedValue`、`chain`、`tier` |
| 读模型字段 | `evidence-inventory.ts`、`review/profile.ts` | `themeId` 展示名改为「模式」；Flutter review 路径保持 `unspecified` |
| CLI | `cli.ts` | 删除 `--theme`；Snapshot 摘要打印主题身份 |
| Local Service | 无语义改动 | 只透传新的 Selection / Handoff 结构；PBWork 捕获面板不再提交 themeIds |
| MCP 新入口 | `mcp-server/src/tools/registry.ts` | 新增 `read_theme_pack { handoffId, theme?, mode?, tokenIds? }`：只经 `handoff.snapshot.catalogRefs` 读取 `theme-pack` 修订（复用 `evidence-store-reader.readCatalog` 的可达性检查），默认返回 Handoff 的默认主题与模式；请求非默认组合时返回该表并标注 `captured: false`。`read_screen_packet` 的 token 清单附 `resolvedValue`、`chain` |

非默认主题与模式的取值表随 Snapshot 固定，供 Coding Agent 实现，但不产生 Case 证据。

## 5. Runtime、Vuetify 与 Workbench

### 5.1 加载与解析

- `loaders.ts`：`import.meta.glob` 读取 `theme-packs/*/` 与 `prototypes/*/theme/`，资产用 `?url` 取 URL，构建期插件计算文件 sha1，组成 `ThemePackSource`。
- 新 `design-system/theme/runtime-theme.ts`：`resolveRuntimeTheme(packId, theme, mode)` 调 Core `resolveThemePack`，结果按身份缓存。删除 `resolveThemeTokens.ts`、`themes/light.json`、`themes/dark.json`、`tokens/tokens.json`、`bindTokens.ts`、`tokenDefaults.ts`。
- `PrototypeRecord.defaultThemeId` 换成 `themePackId`（冷链为 `pbwork-base`）。`validateRegistries.ts` 校验包存在、scope 合法、无 block 级 Diagnostic。

### 5.2 CSS 变量生成

`themeTableToCssVars(table)` 取代 `tokensToCssVars`：

- 命名规则不变：`--pb-${id.replaceAll('.', '-')}`，跨层冲突检测保留。
- 单位按 `valueType`：`length` 补 `px`，`duration` 补 `ms`，`number` / `easing` / `shadow` / `filter` 原样。
- 复合值展开：typography 输出简写 + 部件 + `-variant-numeric`；border 输出 `width style color`；asset 输出 `url("…")` 或 `none`。
- enum 同时输出 CSS 变量与根节点 data 属性 `data-pb-density`、`data-pb-surface-treatment`、`data-pb-motion`。
- 常量单独生成一次，不随主题变化。

### 5.3 JS 侧读取

- `RuntimeLayout.vue` 与 Playground 根节点 `provide(ThemeTableKey, table)`；新 `useToken(key)`、`useTokenNumber(key)` 返回 `computed`。
- 约 40 处模块级 `tokenDefault*` 调用分两类：常量（手势阈值、点击抑制、拖拽上限）改为从 `constants.json` 导入；主题键（尺寸、时长）改为组件内 `useToken`。
- 资产：用 `useToken('asset.*')` 渲染；`none` 时不渲染。

### 5.4 Vuetify

`createVuetifyThemes.ts` 改为按 `ResolvedThemeTable` 动态注册 `pb-{packId}-{theme}-{mode}`，`vuetify-bindings.ts` 改指新键（toast → `color.inverse-surface` 等），`dark` 标志取自模式。density 映射到 Vuetify 全局 defaults。`main.ts` 不再静态创建双主题，改由 Runtime / Playground 在身份变化时切换。`workbench-themes.ts` 不变。

### 5.5 Runtime 偏好与 URL

- 偏好键升到 `pbwork.runtime.theme.v2`，值为 `{ [prototypeId]: { theme, mode: 'light' | 'dark' | 'system' } }`；v1 值丢弃。
- URL 保留键 `mode`（可选 `theme`，用于评审切表盘）。`resolveThemeSync` 语义不变（Capture 与强制导航钉住 URL、偏好写回、返回时盖章）。
- `system` 只是偏好：通过 `matchMedia('(prefers-color-scheme: dark)')` 解析为包内模式；Case URL 总是写具体模式。
- capture bridge 的 `getContext` 返回 `theme: ThemeIdentity`。

### 5.6 Inspector

`runtime/inspect/snapshot.ts`：`tokenVarCatalog` 的键列表来自键目录（可绑定键）；typography 匹配改用部件变量比较；`readDatasetTokenBindings` 以键目录 `bindable` 集合 + 字面量校验。`BINDING_SLOT_PROPERTIES` 抽到共享模块，供第 4 步的生成器复用。

### 5.7 Token Gallery 与 Playground

- **TokenGallery.vue**：顶部选择 包 × 主题 × 模式；按层分组（语义 / 组件 / 常量只读）；每键显示解析值、引用链、来源包；子包沿用祖先值时显示「沿用基础值」；对比度表显示每个配对比值与豁免状态；Diagnostics 面板列出 block / warning。
- **双包对比**：Gallery 支持选择第二个包并排显示解析值不同的键。
- **ComponentPlayground.vue**：工具条增加包、主题、模式选择，`pbwork-sample` 只在这里可选。切换时同一组件即时换肤，用于验证「换包不改组件代码」。
- `ThemePreview.vue`、`PhoneCanvasView.vue`、`navigation.ts` themeItems 改为主题 / 模式维度；`WorkbenchOverview.vue` 显示原型包身份。
- 样例包 `pbwork-sample` 至少改变：品牌色、`radius.*`、`density: compact`、`surface.treatment: glass`、`motion.personality: lively`、一个 `asset.brand-mark`。

## 6. 主题一致性探针

- **挂载点**：`capture/runtime-preflight.ts` `preflightInstrumentedRuntime`，在现有单页面完成 Authoring Lint 之后调用新模块 `capture/theme-probe.ts`。
- **范围**：每个选中 Screen 的 default Variant × 清单声明的每套主题 × 每个模式。同一页面上通过 prepare 切换组合后执行 readiness，再读取完整语义快照，不截图。
- **比较内容**（纯函数 `compareModeSemanticTrees`，放在浏览器安全的 `runtime-contract/theme-probe-compare.ts`）：以 fragment identity（`data-pb-id` + `data-pb-key`）为键，比较每个节点的 `role`、`visible`、bbox 是否非零、`componentId`、排序后的 `tokenBindings`、语义父节点。不比较坐标、尺寸、文本和取值。
- **结果**：任一差异产生 Authoring Diagnostic `theme.mode-divergence`（block），附 Screen、组合对、节点与差异字段。结果不写 Evidence，按 inputVersion 与 Preflight 缓存一起缓存。
- 因为长度与 enum 键不允许随模式变化（`theme.mode-variant-forbidden`），合法包的结构差异只可能来自原型代码按模式分支，这正是探针要拦截的。

## 7. `pbStyle` 键类型生成

- 新脚本 `pnpm ds:keys:generate`（`apps/pbwork/scripts/generate-theme-keys.mjs`）读取键目录、常量表与全部 Contract `componentTokens`，生成提交入库的 `design-system/theme/generated/keys.ts`：

```ts
export type SemanticKey = "color.primary" | …;
export type ComponentKey = "button.primary-background" | …;
export type BindableKey = SemanticKey | ComponentKey;   // 去掉 bindable: false
export type ColorKey = …; export type SpaceKey = …; export type RadiusKey = …; export type TypographyKey = …;
export type ConstantKey = "layout.fill" | …;
export interface PbStyleInput {
  background?: ColorKey | "transparent";
  color?: ColorKey;
  padding?: SpaceKey | readonly [SpaceKey, SpaceKey];
  gap?: SpaceKey;
  radius?: RadiusKey;
  typography?: TypographyKey;
  elevation?: ElevationKey | "none";
  …
}
```

- 槽 → 键族映射与 Inspector 的 `BINDING_SLOT_PROPERTIES` 共用同一份槽字典（`design-system/theme/slots.ts`），保证 `pbStyle` 写出的 CSS 属性与 Inspector 读取的属性一致。
- 测试 `test/theme-keys-generated.test.ts` 重新生成并与入库文件比对，键目录变更后不重生成即失败。
