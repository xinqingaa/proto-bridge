# W2 三层 Token 与原型主题包：实施设计

状态：已定稿（待决问题全部已决），实施到 S0–S3 时随计划暂停（2026-10-16；S1 代码已齐，S2 主体已落地），各切片进度见[第 7.1 节](#71-暂停时的切片进度2026-10-16)。本文是 [PBWork 平台升级计划](./pbwork-platform-upgrade.md) 的附属设计稿，覆盖 W2，以及与其强耦合的 W3 主题一致性探针、W4 `v-pb`/`pbStyle` 的键名依赖、W5 Target `pending`。计划正文仍是范围与退出条件的权威；本文只给出可执行设计。落地后，稳定行为迁入 `docs/architecture`、`docs/reference`、`apps/pbwork/docs/tokens` 和 ADR，本文随计划一起移入 `docs/history`。实现与本进度在分支 `dev/platform`。

本文所有数字来自 2026-10-16 工作树的只读盘点（旧样例原型已移除，W1 正在并行修改 Capture/Store/Local Service）。

## 1. 现状盘点

### 1.1 Token 规模与分布

唯一 Token 源是 `apps/pbwork/src/design-system/tokens/tokens.json`（`schemaVersion: 1`，扁平 `{id,label,category,defaultValue,description}`），共 154 项：

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

主题只有 `themes/light.json`（空覆盖）与 `themes/dark.json`（45 项覆盖），结构为 `{schemaVersion,id,label,dark,overrides}`。没有 Primitive、没有组件层、没有 Accent、没有字体文件；`Inter` 未随仓库分发，也未安装，实际渲染为 `system-ui`。

### 1.2 消费规模

按 `var(--pb-…)`、`data-pb-token-*`、`tokenBindings`、`tokenDefault*`、Target 映射统计（引用次数）：

| 类别 | Web DS | 原型（冷链） | Flutter 映射文件 |
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

合计：Web DS 约 1788 处、冷链原型约 354 处（约 224 处 `var(--pb-*)`、129 处 `data-pb-token-*`）、Workbench 约 92 处、测试约 93 处。Flutter 业务代码约 666 处 `TS.*` 访问器（`TS.spacing.md` 54、`sm` 43、`smPlus` 26 居前）。

关键消费结构：

- 30 份组件 Contract（`components/contracts/*.json`）共 330 个 `tokenBindings` 槽；`primary-tabs` 单份 27 槽，并把 `visualAnatomy.selection.material` 固定为 `"translucent-glass"`。
- 组件绑定在三处重复声明：Contract JSON、Vue 内 `usePbInspect(...getTokenBindings)`、CSS `var(--pb-…)`。
- `bindTokens.ts` 的 `BIND_TOKEN_IDS` 手写 128 项可绑定池，字面量只允许 `transparent`、`none`（来自 Core `vocabulary.ts` 的 `TOKEN_BINDING_LITERALS`）。
- `tokenDefaults.ts` 的 `tokenDefaultNumber`/`tokenDefaultCssValue` 读取与主题无关的 `defaultValue`，在约 40 个模块级常量中使用（Button、IconButton、Icon、Spinner、Loading、Card、Chip、AppBar、Tabbar、PrimaryTabs、SecondaryTabs、TabViewport、ConfirmDialog、Toast、Textarea、SearchBar、Menu、ScrollableDataList、`usePointerSwipe`、`useHorizontalDragScroll`、冷链 `ShipmentDetail`）。主题一旦能改尺寸或动效，这些读取全部失效。
- 未被任何组件消费的键：`elevation.level-1/2/4`、`typography.display/headline/title-lg/body-sm/body-lg`（仅目录）、`border.strong`、`opacity.muted/hover/pressed/overlay`（overlay 仅 TokenGallery）、`spacing.3xl`、`sizing.tab`、`motion.easing-emphasized`；`spacing.xl` 仅 ComponentPlayground 使用。

### 1.3 Theme 字符串流经路径

当前"主题"是一个自由字符串 `themeId`（`light`/`dark`），既表示取值集合，也表示明暗，也是 Case 维度：

| 层 | 文件与符号 | 现状 |
| --- | --- | --- |
| PBWork 登记 | `prototypes/registry.ts` `PrototypeRecord.defaultThemeId` | 冷链为 `"light"` |
| PBWork 加载 | `design-system/loaders.ts` `loadThemes()`；`resolveThemeTokens.ts` `resolveThemeTokens`/`tokensToCssVars`/`normalizeTokenCssVarName`/`tokenValueToCssValue` | 只认 light/dark 两份文件，`px` 由键前缀正则决定 |
| Vuetify | `themes/createVuetifyThemes.ts`、`themes/vuetify-bindings.ts`（23 个 Vuetify 色名 → Token） | 固定 `pbworkLight`/`pbworkDark` |
| Runtime URL | `runtime/url.ts`（`theme` 查询，缺省回退 `prototype.defaultThemeId`，`UNKNOWN_THEME`） | `variant`、`theme` 为保留键 |
| Runtime 偏好 | `runtime/theme-preference.ts`（`pbwork.runtime.theme.v1`、`resolveThemeSync`、`stampThemeOnHref`、`resolveWorkbenchSessionTheme`） | 偏好是全局字符串 |
| Runtime 渲染 | `runtime/RuntimeLayout.vue` `effectiveThemeId` → `themeStyle`、`runtimeTheme`、bridge context、`navigate` 写偏好 | CSS 变量挂在根节点 `:style` |
| Capture 协议 | `runtime/capture-protocol.ts` `RuntimeContext.themeId`；token Catalog = `loadTokens()` + `loadThemes()`（`catalogObject:"theme"`）；`inputVersion` 只哈希 screens | 主题取值变化不会使 Evidence 过期 |
| Inspector | `runtime/inspect/snapshot.ts` `tokenVarCatalog`（读全部 Token 的实时 CSS 值；字体用 `font` 简写探针匹配）、`BINDING_SLOT_PROPERTIES` | 键表来自 `loadTokens` |
| Workbench | `TokenGallery.vue`、`ComponentPlayground.vue`（`resolveThemeTokens(themeId)` + Vuetify 双主题）、`ThemePreview.vue`、`PhoneCanvasView.vue`、`navigation.ts` themeItems、`app/stores/capture.ts`（`themeIds: [prototype.defaultThemeId]`） | 工作台自身主题 `workbench-themes.ts` 是独立通道 |
| Core 身份 | `contracts/ids.ts` `ThemeId`；`contracts/case.ts` `CaseKey.themeId`、`RESERVED_THEME_ID='unspecified'`、`computeCaseId`（`screen::variant::theme::device`） | 主题是 Case identity 的一维 |
| Core Selection | `capture/selection.ts` `ScreenSelectionDraft.themeIds`（`min(1)`，展开矩阵） | 不校验 Runtime 是否声明该主题 |
| Core 协议 | `runtime-contract/protocol.ts` `RuntimeRouteQueryKey`（排除 variant/theme）、`RuntimeActualDimensions.themeId`、`PrepareRequest.expected.themeId` | |
| Core Capture | `capture/runtime-url.ts` 写 `theme`；`capture/playwright-driver.ts` `colorScheme: themeId === 'dark' ? 'dark' : 'light'`、URL 环境校验、`actualFact(...,'themeId')` | 明暗由字符串字面量推断 |
| Core Preflight | `capture/runtime-preflight.ts` `discoverInstrumentedRuntimeManifest`/`preflightInstrumentedRuntime` 硬编码 `colorScheme:'light'`，`themeIds[0] ?? 'light'` | |
| Core Store/Handoff | `capture/orchestrator.ts` 按 `inputDigest` 复用 `CatalogRevision`；`contracts/snapshot.ts` `catalogRefs`；`capture/handoff.ts` `requiredCatalogKinds` 在有 tokenBindings 时要求 `token`；`resourceRefs` 含 `pb://…/catalog/{id}` | Bundle 本身无取值表 |
| Core 读模型 | `evidence-read-model.ts`、`evidence-inventory.ts`、`consumer-projection.ts` 透出 `themeId`；consumer 的 token 清单只有 id 没有值；`review/profile.ts` 用于 theme 标签 | |
| CLI | `packages/cli/src/cli.ts` `themeIds: [flag(args,'theme') ?? 'light']` | |
| Local Service | 透传 Selection；`flutter-review-runtime.ts` 有 theme 选项（实验 review） | 不解释主题 |
| MCP | 无主题工具；`evidence-store-reader.ts` 有 `readCatalog` 但未暴露为工具 | Agent 拿不到 Token 取值 |
| Target | `apps/flutter_pb_app/proto-bridge.target.json`（154 Token → 访问器）、`lib/theme/proto_bridge_tokens.dart`（154 项快照）、`ts.dart`（`ThemeModeNotifier` light/dark）；`scripts/verify-ds-target-sync.mjs`（tokenCatalog、themes 摘要；要求 154 项全部 resolved） | |

### 1.4 基础取值的 WCAG 现状

按当前 light（L）/ dark（D）取值计算，以下真实使用的配对不达标（文本 4.5:1，UI 3:1）：

| 配对 | 比值 | 级别 |
| --- | --- | --- |
| `on-warning` / `warning` | L 3.19 | 文本 |
| `on-info` / `info` | L 4.40 | 文本 |
| `primary` / `primary-soft` | L 4.13 | 文本 |
| `secondary` / `secondary-soft` | L 4.49 | 文本 |
| `error` / `error-soft` | D 4.45 | 文本 |
| `outline` / `surface` | L 2.09 | UI |

其余检查过的配对通过。这意味着"基础包 WCAG 门禁通过"不能靠零改动实现（见决策 Q3）。

## 2. 键目录

### 2.1 总体结构

键目录（Key Catalog）是 PBWork 数据，Core 只接收它作为输入：

```text
apps/pbwork/src/design-system/theme/
  key-catalog.json          语义层 + 常量层键定义、值类型、对比度配对、可变维度
  constants.json            PBWork 常量表（不进主题包、不进 Evidence、不进 Target）
  generated/keys.ts         W4 生成的类型（提交入库）
components/contracts/*.json 组件层键随 Contract 发布（新增 componentTokens 段）
```

每个键定义：

```json
{
  "id": "color.primary",
  "tier": "semantic",
  "valueType": "color",
  "bindable": true,
  "modeVariant": true,
  "accentable": true,
  "description": "…"
}
```

- `valueType`：`color | length | number | duration | easing | shadow | border | font-family | font-weight | font-features | filter | enum | asset | typography`。CSS 单位只由 `valueType` 决定，不再由键前缀正则决定。
- `modeVariant`：只有 color、shadow、opacity 类 number、filter、asset 可为 `true`。长度、字体、enum 不允许随模式变化，使明暗两态几何不变，这是 W3 探针能够成立的前提。
- `accentable`：只有颜色键可为 `true`；Accent 只能覆盖 `accentable` 键。

### 2.2 语义层（117 个可绑定键 + 6 个不可绑定输入 + 64 个字体部件）

**颜色（36，全部 modeVariant）**：`color.background`、`on-background`、`surface`、`on-surface`、`on-surface-muted`、`surface-variant`、`surface-recessed`、`surface-selected`、`surface-raised`、`inverse-surface`、`on-inverse-surface`、`primary`、`primary-soft`、`on-primary`、`action`、`action-soft`、`on-action`、`secondary`、`secondary-soft`、`on-secondary`、`error`、`error-soft`、`on-error`、`success`、`success-soft`、`on-success`、`warning`、`warning-soft`、`on-warning`、`info`、`on-info`、`border`、`outline`、`divider`、`disabled`、`scrim`。Accent 键：`color.primary`、`color.primary-soft`、`color.on-primary`。

**字体（3，不可绑定）**：`font.text`、`font.display`、`font.numeric`。值为 `{ "family": [..], "features": ["tnum"] }`；`features` 只对 numeric 有意义。

**字阶（16 个角色，可绑定）**：保留 13 个旧角色 ID（`typography.display`、`headline`、`title-lg`、`title`、`title-sm`、`subtitle`、`body-lg`、`content`、`body-sm`、`label`、`caption`、`caption-strong`、`micro`），新增 `typography.numeric-display`、`numeric-title`、`numeric-content`。每个角色是复合值：

```json
"typography.title": { "family": "{font.display}", "weight": 650, "size": 20, "lineHeight": 1.3 }
```

派生 64 个部件键 `typography.{role}.family|weight|size|line-height`：属于语义层、可被包覆盖，但不可绑定；Evidence 与 Target 只认角色。CSS 输出 `--pb-typography-title`（`font` 简写）、四个部件变量和 `--pb-typography-title-variant-numeric`。

**圆角（6）**：

| 键 | 基础值 | 用途 |
| --- | --- | --- |
| `radius.mark` | 4 | 徽标、小标记 |
| `radius.control-compact` | 8 | 紧凑控件、标签 |
| `radius.control` | 12 | 按钮、输入框、Tab |
| `radius.surface` | 16 | 卡片、列表容器 |
| `radius.overlay` | 24 | Sheet、Dialog |
| `radius.pill` | 999 | 胶囊 |

**间距（15，角色化，按 density 取值）**：

| 键 | regular 基础值 | 语义 |
| --- | --- | --- |
| `space.hairline` | 2 | 视觉微调 |
| `space.inline-tight` | 4 | 图标与文字等紧邻横向间距 |
| `space.inline` | 8 | 常规横向间距 |
| `space.inline-loose` | 12 | 宽松横向间距 |
| `space.stack-tight` | 4 | 标题与副标题等紧邻纵向间距 |
| `space.stack-compact` | 8 | 紧凑纵向间距 |
| `space.stack` | 12 | 常规纵向间距 |
| `space.stack-loose` | 16 | 宽松纵向间距 |
| `space.inset-compact` | 8 | 紧凑内边距 |
| `space.inset-control` | 12 | 控件内边距 |
| `space.inset-surface` | 16 | 卡片/容器内边距 |
| `space.inset-page` | 16 | 页面左右边距 |
| `space.section` | 24 | 区块间距 |
| `space.section-loose` | 40 | 大区块间距 |
| `space.page-end` | 48 | 页面末尾留白 |

基础包写法：`"space.inset-surface": { "$switch": "density", "cases": { "compact": 12, "regular": 16, "comfortable": 20 } }`。

**尺寸（16）**：`size.control-compact`(32)、`control`(40)、`control-large`(48)、`touch`(44)、`icon-inline`(16)、`icon-compact`(18)、`icon`(20)、`icon-prominent`(24)、`avatar-compact`(28)、`avatar`(40)、`avatar-large`(56)、`navigation-bar`(64)、`stroke`(2)、`indicator`(3)、`caret`(5)、`marker`(6)。数值沿用旧键现值，迁移等价测试锁定。

**描边（6）**：`border.width`（1）、`border.width-strong`（新增，2）、`border.width-accent`（4）、`border.hairline`、`border.default`、`border.focus`。复合描边写成 `{ "width": "{border.width}", "style": "solid", "color": "{color.border}" }`，不再在字符串里嵌 `var()`。

**阴影（5，modeVariant）**：`elevation.surface`、`raised`、`floating`、`menu`、`overlay`。"无阴影"绑定处改用字面量 `none`。

**透明度（4）**：`opacity.disabled`、`translucent`（旧 glass，modeVariant）、`hover`、`pressed`。

**动效（9）**：`motion.personality`（enum，不可绑定）、`duration-short`、`duration-medium`、`duration-long`、`easing-standard`、`easing-emphasized`、`easing-gentle`、`press-scale`、`press-scale-strong`。

**表面（2）**：`surface.treatment`（enum，不可绑定）、`surface.glass-backdrop`（filter）。

**密度（1）**：`density`（enum，不可绑定）。

**资产（4，modeVariant）**：`asset.brand-mark`、`asset.brand-wordmark`、`asset.launch-image`、`asset.empty-illustration`。基础值为 `none`。

### 2.3 性格键的值域与落地

| 键 | 值域 | 基础值 | CSS 落地 | Vuetify 落地 |
| --- | --- | --- | --- | --- |
| `density` | `compact \| regular \| comfortable` | `regular` | 根节点 `data-pb-density`；间距、控件高度由包内 `$switch` 解析成具体值，组件不读 enum | `createVuetify({ defaults })` 的全局 `density`：compact→`compact`，regular→`default`，comfortable→`comfortable` |
| `motion.personality` | `calm \| standard \| lively` | `standard` | 根节点 `data-pb-motion`；时长、缓动、按压缩放由包内 `$switch` 解析；`prefers-reduced-motion` 仍由组件现有分支处理 | Vuetify 过渡不受控，PBWork 组件不依赖 Vuetify 动效 |
| `surface.treatment` | `solid \| outlined \| glass` | `solid` | 根节点 `data-pb-surface-treatment`；组件层 `*-treatment` 键默认 `{surface.treatment}`，由新共享组件 `SurfaceMaterial` 按 `data-pb-treatment` 选择分支，各分支只消费 Token | 不映射 |
| `asset.*` | `none` 或 `{ "file": "assets/x.svg", "mediaType": "image/svg+xml", "alt": "…" }` | `none` | `--pb-asset-brand-mark: url("…")` 或 `none`；组件通过 `useToken('asset.brand-mark')` 取 URL 渲染 `<img>`，`none` 时不渲染 | 不映射 |

`$switch` 只在主题包内解析，产物是具体值，Evidence 与 Target 看到的是解析后的结果。enum 键不随模式和 Accent 变化（校验规则保证）。

### 2.4 组件层

规则：

1. Contract 每个 `tokenBindings` 槽，若旧值映射到常量，则删除该槽（`elevation.none` 改为字面量 `none`，共 4 槽保留）。
2. 若该槽由实例 prop 在语义族内选择（`tone`、颜色 Token 引用型 prop、`size`、`radius` prop），则直接绑定语义键，不建组件键。
3. 其余槽一律建组件键 `{componentId}.{slot-kebab}`。默认值是旧值对应的语义键引用；旧值只能落在组件层时，默认值写在基础包 `component.json`。
4. 封闭 variant（Button `kind`）展开为 `button.{primary|secondary|outlined}-{background|border|text}`。
5. 新增表面处理键：`primary-tabs.selection-treatment`（基础包覆盖为 `glass`，保持现状）、`tabbar.surface-treatment`、`app-bar.surface-treatment`（默认 `{surface.treatment}`）。`LiquidGlass.vue` 改造为 `SurfaceMaterial.vue`；`primary-tabs` 的 `visualAnatomy.selection.material` 改为引用 `primary-tabs.selection-treatment`。

Contract 新增段：

```json
"componentTokens": {
  "selection-surface": { "valueType": "color", "default": "{color.surface-selected}", "modeVariant": true },
  "selection-treatment": { "valueType": "enum", "default": "{surface.treatment}" }
},
"tokenBindings": { "selectionSurface": "primary-tabs.selection-surface", "height": "size.control" }
```

按上述规则从现有 30 份 Contract 机器推导：**253 个组件键 + 3 个表面处理键**；24 个槽改为直接绑定语义键；2 个槽保留 `transparent` 字面量；57 个槽映射到常量，其中 4 个 `elevation.none` 槽（`button`/`icon-button` 的 elevation、`app-bar`/`data-list` 的 restingElevation）改为字面量 `none` 保留，其余 53 个删除。逐组件清单（键名省略 `{componentId}.` 前缀）：

| 组件 | 组件键数 | 组件键 | 直接绑定语义键 / 字面量 | 删除的常量槽 |
| --- | --- | --- | --- | --- |
| `app-bar` | 7 | `surface` `border` `text` `elevation` `title` `padding` `icon-size` | — | safeInsetFallback restingElevation |
| `avatar` | 2 | `radius` `initials` | `background→color.primary` `text→color.on-primary` `size→size.avatar` | — |
| `badge` | 2 | `radius` `label` | `background→color.error` `text→color.on-error` | — |
| `bottom-sheet` | 10 | `surface` `border` `radius` `elevation` `title` `body` `padding` `header-control` `duration` `easing` | — | fill flexFill |
| `button` | 18 | `primary-background` `secondary-background` `outlined-background` `primary-border` `secondary-border` `outlined-border` `primary-text` `secondary-text` `outlined-text` `radius` `typography` `disabled-opacity` `border-width` `duration` `easing` `pressed-scale` `loader-size` `loader-stroke` | `height→size.control` `paddingX→space.inset-surface` | elevation overlayOpacity loadingOpacity |
| `card` | 4 | `surface` `border` `radius` `elevation` | — | — |
| `checkbox` | 5 | `on-selected` `target` `radius` `label` `disabled-opacity` | `selected→color.primary` `uncheckedBorder→color.outline` `text→color.on-surface` | — |
| `chip` | 3 | `radius` `elevation` `typography` | `background→color.primary-soft` `color→color.primary` | — |
| `confirm` | 8 | `scrim` `surface` `border` `text` `radius` `elevation` `title` `body` | — | maxWidth fill flexFill |
| `data-list` | 7 | `surface` `divider` `radius` `elevation` `content` `inset` `divider-border` | — | restingElevation |
| `divider` | 4 | `line` `text` `inset` `label` | — | — |
| `empty-state` | 12 | `icon-surface` `icon` `title` `description` `radius` `spacing` `icon-size` `typography` `body` `title-offset` `description-offset` `icon-surface-size` | — | — |
| `filter-bar` | 6 | `active` `active-surface` `inactive` `radius` `gap` `label` | `inactiveSurface=transparent` | minWidth grow |
| `flow-sheet` | 16 | `surface` `border` `description` `inactive-indicator` `active-indicator` `radius` `elevation` `title` `body` `step-label` `header-gap` `header-control` `dot-gap` `dot-size` `duration` `easing` | — | fill flexFill maxHeight reducedDuration trackTranslation |
| `icon-button` | 6 | `radius` `target` `duration` `easing` `pressed-scale` `disabled-opacity` | `color→color.secondary` `background→color.secondary-soft` `size→size.control` | elevation |
| `icon` | 0 | — | `size→size.icon` `color→color.on-surface` | — |
| `loading` | 7 | `scrim` `active` `text` `size` `stroke` `motion` `label` | — | — |
| `menu` | 18 | `surface` `border` `focus` `radius` `height` `text` `muted` `menu-surface` `menu-border` `menu-radius` `menu-elevation` `menu-item-height` `selected-background` `duration` `easing` `disabled-opacity` `menu-offset` `icon-size` | — | openRotation menuMaxHeight |
| `primary-tabs` | 20 | `track-surface` `selection-surface` `selection-opacity` `selection-elevation` `active-color` `inactive-color` `border` `track-radius` `radius` `target` `typography` `panel` `track-inset` `panel-gap` `indicator-inset` `indicator-offset` `indicator-thickness` `glass-backdrop` `duration` `easing` | `height→size.control` | fill selectionLayer reducedDuration bridgeOffset hiddenOpacity visibleOpacity |
| `progress` | 8 | `fill` `track` `radius` `motion` `gap` `text` `label` `track-height` | — | trackOpacity |
| `radio-group` | 4 | `label` `option` `gap` `disabled-opacity` | `selected→color.primary` `text→color.on-surface` | — |
| `screen-transition` | 4 | `surface` `duration` `easing` `incoming-scale` | — | fill enterTranslation leaveTranslation origin reducedDuration hidden visible restingLayer incomingLayer grow |
| `scrollable-data-list` | 13 | `background` `primary` `muted` `footer` `duration` `easing` `disabled-opacity` `refresh-target` `footer-height` `action-min-width` `action-height` `refresh-resting-distance` `sentinel` | — | hiddenOpacity visibleOpacity fill refreshTranslation loadMoreRootMargin refreshThreshold refreshMaxDistance |
| `search-bar` | 8 | `surface` `text` `placeholder` `radius` `height` `typography` `disabled-opacity` `icon` | — | fill |
| `secondary-tabs` | 12 | `indicator` `active-color` `inactive-color` `border` `radius` `target` `typography` `panel` `track-gap` `caret-size` `duration` `easing` | `activeBackground=transparent` `height→size.control` | caretOffset caretAnchor caretTranslation fill reducedDuration |
| `spinner` | 5 | `active` `text` `motion` `label` `stroke` | `size→size.icon` | — |
| `switch` | 5 | `track` `thumb` `target` `label` `disabled-opacity` | `active→color.primary` `text→color.on-surface` | — |
| `tab-viewport` | 3 | `background` `duration` `easing` | — | fill |
| `tabbar` | 10 | `surface` `active` `inactive` `border` `target` `height` `label` `selected-label` `focus-outline` `icon-size` | — | fill focusInset contentLayer safeInsetFallback overlayOpacity |
| `text-field` | 12 | `border` `surface` `radius` `height` `label` `input` `error-color` `error-text` `reveal-color` `reveal-size` `reveal-target` `disabled-opacity` | — | — |
| `textarea` | 7 | `surface` `border` `focus` `radius` `text` `disabled-opacity` `rows` | — | — |
| `toast` | 7 | `surface` `text` `radius` `padding-x` `padding-y` `message` `duration` | — | — |

"直接绑定语义键"列给的是当前默认 prop 下的绑定；实例 prop 改变时绑定随之切换（`resolveLiveTokenBindings.ts` 的现有逻辑改为输出新键）。迁移实施中允许按代码事实微调槽名，但规则不变，且必须由 `validateRegistries` 检查：任何非常量、非 prop 选择的槽都不得直接绑定语义键。

组件键数量较大，但其 Target 映射、默认值和类型都由默认引用自动生成，边际成本主要在 Contract 改写与 CSS 迁移。

### 2.5 常量层

`constants.json` 只承载实现常量，不可被主题包覆盖、不可绑定、不进入 Target 映射：

- `layout.*` 全部 22 项（`layout.fill`、`half`、`half-negative`、`translate-full-negative`、`focus-inset`、`sheet-max-height`、`load-more-root-margin`、`menu-max-height`、`dialog-max-width`、`form-max-width`、`pull-refresh-threshold`、`pull-refresh-max-distance`、`inset-xs-negative`、`inset-sm-negative`、`flex-fill`、`flex-grow`、`gesture-axis-lock`、`gesture-drag-limit`、`gesture-swipe-threshold`、`viewport-height`、`chart-min-height`、`chart-plot-height`）。
- 新增 `layout.zero`（取代 `spacing.none`、`radius.none`）。
- `layer.base`、`layer.content`、`opacity.hidden`、`opacity.visible`、`motion.duration-instant`、`motion.rotate-half-turn`、`motion.duration-click-suppression`、`elevation.none`。

`layout.inset-xs-negative`/`inset-sm-negative` 是间距的负值，density 生效后会与 `space.*` 脱钩；迁移时把消费处改为 `calc(-1 * var(--pb-space-…))` 并删除这两个常量。

常量继续以 `--pb-{id}` CSS 变量输出，DS 与原型 CSS 可以使用。AGENTS.md 红线"具体值只存在于 Foundation/Theme"改写为"具体值只存在于主题包或 PBWork 常量表"，`flex-layout-policy.test.ts` 的固定值门禁不变。

### 2.6 旧键 → 新键映射

154 个旧键全部有去向：语义层 102、组件层 11、退回 Primitive（包私有）9、常量层 32。以下 34 个颜色键 ID 不变，直接保留为语义键：`background`、`surface`、`primary`、`primary-soft`、`on-primary`、`action`、`action-soft`、`on-action`、`secondary`、`secondary-soft`、`border`、`error`、`error-soft`、`info`、`success`、`success-soft`、`warning`、`warning-soft`、`on-surface`、`on-surface-muted`、`surface-variant`、`surface-recessed`、`surface-selected`、`surface-raised`、`on-background`、`on-secondary`、`outline`、`divider`、`disabled`、`scrim`、`on-error`、`on-success`、`on-warning`、`on-info`（均带 `color.` 前缀）。13 个 `typography.*` ID 不变，拆部件。22 个 `layout.*`、2 个 `layer.*` ID 不变，转常量。其余变化如下：

| 旧键 | 新层 | 新键 / 去向 |
| --- | --- | --- |
| `color.navigation-active` | 组件 | `tabbar.active`，默认 `{color.primary}`（两态取值与 primary 相同） |
| `color.section-tab-active` | 组件 | `primary-tabs.active-color`、`secondary-tabs.active-color`、`secondary-tabs.indicator`，默认 `{color.on-surface}`（两态相同） |
| `color.toast` / `color.on-toast` | 语义 | `color.inverse-surface` / `color.on-inverse-surface` |
| `spacing.xxs` | 语义 | `space.hairline` |
| `spacing.xs` | 语义 | `space.inline-tight`；纵向 `space.stack-tight` |
| `spacing.sm` | 语义 | `space.inline`；纵向 `space.stack-compact`；内边距 `space.inset-compact` |
| `spacing.sm-plus` | 语义 | `space.inline-loose`；纵向 `space.stack`；控件内边距 `space.inset-control` |
| `spacing.md` | 语义 | `space.inset-surface`；页面边距 `space.inset-page`；纵向 `space.stack-loose` |
| `spacing.lg` | 语义 | `space.section` |
| `spacing.lg-plus` | 语义 | `space.section-loose` |
| `spacing.2xl` | 语义 | `space.page-end` |
| `spacing.xs-plus` | 组件 | 仅组件层使用，基础包 `component.json` 引用 Primitive 6 |
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
| `sizing.touch` | 语义 | `size.touch` |
| `sizing.bottom-navigation` | 语义 | `size.navigation-bar` |
| `sizing.indicator-thickness` / `caret` / `step-dot` / `progress-stroke` | 语义 | `size.indicator` / `caret` / `marker` / `stroke` |
| `sizing.menu-item` | 组件 | `menu.menu-item-height`，默认 `{size.control-large}` |
| `sizing.refresh-action-min-width` / `refresh-action-height` | 组件 | `scrollable-data-list.action-min-width` / `action-height`（基础包字面量） |
| `sizing.progress-track` | 组件 | `progress.track-height`（基础包字面量） |
| `sizing.textarea-rows` | 组件 | `textarea.rows`（基础包字面量） |
| `sizing.tab` | Primitive | 无消费 |
| `border.width-hairline` / `accent-width` | 语义 | `border.width` / `border.width-accent` |
| `border.hairline` / `default` / `focus` | 语义 | ID 不变，改为复合值 |
| `border.strong` | Primitive | 无消费 |
| `opacity.disabled` / `hover` / `pressed` | 语义 | ID 不变 |
| `opacity.glass` | 语义 | `opacity.translucent` |
| `opacity.muted` / `overlay` | Primitive | 无组件消费（overlay 仅 TokenGallery 预览） |
| `opacity.hidden` / `visible` | 常量 | ID 不变 |
| `motion.duration-fast` / `normal` / `slow` | 语义 | `motion.duration-short` / `medium` / `long` |
| `motion.easing-standard` / `emphasized` / `gentle` | 语义 | ID 不变 |
| `motion.scale-pressed` / `scale-pressed-strong` | 语义 | `motion.press-scale` / `press-scale-strong` |
| `motion.duration-sheet` | 组件 | `flow-sheet.duration`、`bottom-sheet.duration`（基础包字面量 220ms） |
| `motion.duration-tab-viewport` | 组件 | `tab-viewport.duration`（基础包字面量 240ms） |
| `motion.duration-toast` | 组件 | `toast.duration`（基础包字面量 4000ms） |
| `motion.duration-instant` / `rotate-half-turn` / `duration-click-suppression` | 常量 | ID 不变 |
| `effect.glass-backdrop` | 语义 | `surface.glass-backdrop` |

旧刻度名（xs/sm/md…）只作为基础包 Primitive 名存在于 `theme-packs/base/primitives.json`（如 `space.4`、`space.8`、`radius.12`），对 Coding Agent、Evidence 和 Target 不可见。

## 3. 主题包格式与解析

### 3.1 目录

```text
apps/pbwork/src/design-system/theme-packs/
  base/                 pbwork-base，全部语义键与组件键的完整取值
  sample/               pbwork-sample，仅 Playground 可选，用于验证"换包不改代码"
apps/pbwork/src/prototypes/{prototypeId}/theme/
  pack.json  primitives.json  semantic.json  component.json  accents.json  fonts/  assets/
```

原型包 `id` 必须等于 `prototypeId`。冷链使用基础包，不建目录。

### 3.2 文件 Schema

`pack.json`：

```json
{
  "schemaVersion": 1,
  "id": "cold-chain-ops",
  "label": "冷链运营",
  "extends": "pbwork-base",
  "scope": "prototype",
  "modes": ["light", "dark"],
  "defaultMode": "light",
  "accentKeys": ["color.primary", "color.primary-soft", "color.on-primary"],
  "defaultAccent": "default",
  "fonts": [
    { "family": "Brand Sans", "files": ["fonts/brand-sans-600.woff2"], "weights": [600], "style": "normal", "license": "OFL-1.1", "licenseFile": "fonts/OFL.txt" }
  ],
  "contrastWaivers": [
    { "pair": ["color.on-warning", "color.warning"], "modes": ["light"], "reason": "…" }
  ]
}
```

- `scope`：`base`（仅 pbwork-base）、`prototype`、`playground`（样例包，不能被原型登记引用）。
- `modes` 至少含 `defaultMode`；`system` 不是包模式，是 Runtime 偏好值，运行时解析为包内 light/dark。
- 基础包 `extends` 为空，其余包必须 `extends` 一个包（可多级）。

`primitives.json`：`{ "values": { "blue.600": "#1F5FBF", "space.16": 16 } }`，不分模式，键名自由但须匹配 `^[a-z0-9]+(\.[a-z0-9-]+)+$`。

`semantic.json` / `component.json`：

```json
{
  "values": { "color.primary": "{blue.600}", "radius.control": 12 },
  "modes": { "dark": { "color.primary": "{blue.300}" } }
}
```

`values` 是所有模式共享的取值，`modes.{mode}` 覆盖模式相关键。

`accents.json`：

```json
{ "accents": { "default": { "label": "默认" }, "teal": { "label": "青", "values": { "color.primary": "{teal.600}" }, "modes": { "dark": { "color.primary": "{teal.300}" } } } } }
```

### 3.3 表达式

值只能是以下四种：

1. 字面量：string、number、`none`、`transparent`。
2. 整串引用 `"{key}"`：可引用本包或祖先包的 Primitive、语义键、组件键。不支持字符串内插、不支持颜色运算。
3. `{ "$switch": "<enum key>", "cases": { "<value>": <expr>, … } }`：`cases` 必须覆盖 enum 全部值。
4. 复合对象：typography、font、border、asset，字段内可嵌套 1–3。

Primitive 只能引用 Primitive；语义键不能引用组件键（`theme.tier-violation`）。

### 3.4 解析算法

输入：`KeyCatalog`、`ConstantTable`、包集合（id → 文件内容）、目标 `(packId, mode, accent)`。

1. **继承链**：从目标包沿 `extends` 走到 `pbwork-base`。重复访问即报 `theme.extends-cycle`，链必须终止于 scope=base 的包。
2. **有效表达式**：对每个语义/组件键 k，按优先级取：目标 Accent 的 `modes[mode][k]` → Accent `values[k]` → 链上最近包的 `modes[mode][k]` → 最近包的 `values[k]`。基础包必须为全部键给出取值（`theme.base-incomplete`）。
3. **Primitive 作用域**：Primitive 引用按"表达式所在包"的 Primitive 表解析（沿该包自身祖先链向上），在步骤 2 选中表达式时立即内联；语义键与组件键引用保持晚绑定，在目标包上下文解析。因此子包改 `color.primary` 会影响基础包中引用 `{color.primary}` 的组件默认值，而基础包私有 Primitive 永远不被子包误改。
4. **求值**：深度优先求值，维护访问栈。`$switch` 的选择键也算依赖。回到栈中节点即报 `theme.reference-cycle`，附完整环路径。
5. **类型检查**：按 `valueType` 校验求值结果（`theme.value-type`）；enum 必须在值域内。
6. **输出** `ResolvedThemeTable`：

```ts
interface ResolvedThemeTable {
  identity: { packId: string; packDigest: string; mode: string; accent: string };
  values: Record<string, ResolvedTokenValue>;    // 语义 + 组件 + 字体部件
  provenance: Record<string, { sourcePackId: string; chain: string[]; inherited: boolean }>;
  constants: Record<string, ResolvedTokenValue>; // 原样带出，供 CSS 生成
}
```

`chain` 是引用链（如 `["primary-tabs.active-color", "color.on-surface", "base:gray.900"]`），供 Gallery 与 MCP 展示；`inherited` 表示该键沿用祖先包取值。

### 3.5 Digest

`packDigest = "sha1:" + sha1Hex(canonicalJson(digestInput))`，使用 Core 已有的浏览器安全 `contracts/hash-sha1.ts`：

```text
digestInput = {
  packId, extendsChain, keyCatalogDigest,
  modes, defaultMode, accents: [ids], defaultAccent,
  resolved: { [mode]: { [accent]: values } },   // 全部模式 × 全部 Accent 的解析结果
  files: { [relativePath]: sha1 }               // 字体与资产字节
}
```

不计入：`label`、描述、表达式写法、Primitive 名。因此"等价重构"不改变 digest，任何可见取值变化必然改变 digest。`keyCatalogDigest` 是键目录（不含描述）的 sha1，键目录变化同样改变全部包的 digest。

### 3.6 Core 模块与公开 API

新目录 `packages/core/src/v2/theme/`（浏览器安全，不引入 Node API），从 `@proto-bridge/core/v2` 导出，并新增子路径 `./v2/theme`：

| 文件 | 内容 |
| --- | --- |
| `schema.ts` | `KeyCatalog`、`KeyDefinition`、`ConstantTable`、`ThemePackManifest`、`ThemePackLayer`、`AccentFile`、`ThemeIdentity`、`ResolvedThemeTable` 的 zod schema |
| `expression.ts` | 表达式解析、引用抽取、依赖图 |
| `resolve.ts` | `resolveThemePack(input): ThemeResolution`、`listPackChain` |
| `digest.ts` | `computeThemePackDigest`、`computeKeyCatalogDigest`、`formatThemeIdentity`/`parseThemeIdentity`（`packId@sha1:…/mode/accent`） |
| `contrast.ts` | sRGB 相对亮度、alpha 合成、`contrastRatio` |
| `validate.ts` | `validateThemePacks(input): ThemeDiagnostic[]` |
| `index.ts` | 公开出口 |

```ts
export function resolveThemePack(input: {
  keyCatalog: KeyCatalog;
  constants: ConstantTable;
  packs: ReadonlyMap<string, ThemePackSource>;
  packId: string;
  mode: string;
  accent?: string;
}): { table: ResolvedThemeTable; diagnostics: ThemeDiagnostic[] };

export function resolveAllThemeTables(input): { digest: string; tables: ResolvedThemeTable[]; diagnostics: ThemeDiagnostic[] };
```

文件字节哈希由调用方提供（PBWork 用 Vite `?url` + 构建期哈希；Node 脚本直接读文件），Core 不做 I/O。

### 3.7 校验规则

`ThemeDiagnostic { code, severity: 'block' | 'warning' | 'info', packId, key?, mode?, accent?, message, path? }`，复用 Authoring Diagnostic 的 block/warning 语义：

| code | 级别 | 规则 |
| --- | --- | --- |
| `theme.unknown-key` | block | `semantic.json`/`component.json`/`accents.json` 出现键目录与 Contract 之外的键 |
| `theme.tier-violation` | block | 覆盖常量；Primitive 引用非 Primitive；语义键引用组件键 |
| `theme.unresolved-reference` | block | 引用不存在 |
| `theme.reference-cycle` | block | 引用环（含 `$switch` 选择键） |
| `theme.extends-cycle` | block | 继承环或链未终止于基础包 |
| `theme.value-type` | block | 值不符合 `valueType` 或 enum 值域 |
| `theme.mode-variant-forbidden` | block | 非 `modeVariant` 键在 `modes.*` 中被覆盖 |
| `theme.accent-out-of-scope` | block | Accent 覆盖了 `accentKeys` 之外或非 `accentable` 的键 |
| `theme.mode-undeclared` | block | `modes.*` 出现 `pack.modes` 之外的模式；`defaultMode` 不在 `modes` |
| `theme.base-incomplete` | block | 基础包缺键 |
| `theme.font-license-missing` | block | 字体缺 `license` 或 `licenseFile` |
| `theme.font-file-missing` / `theme.asset-missing` | block | 文件不存在或哈希缺失 |
| `theme.contrast-insufficient` | block | 未豁免的对比度失败 |
| `theme.contrast-waived` | warning | 已在 `contrastWaivers` 声明的失败（附理由） |
| `theme.scope-violation` | block | 原型登记引用 `scope: playground` 包；原型包 id 与 prototypeId 不一致 |
| `theme.inherited` | info | 键沿用祖先值（Gallery 用来显示"沿用基础值"） |

### 3.8 WCAG 配对定义

配对写在键目录 `contrastPairs`，组件级配对写在 Contract `componentTokens` 旁的 `contrastPairs`：

```json
{ "foreground": "color.on-warning", "background": "color.warning", "level": "text", "backdrop": "color.background" }
```

- `level: text` 要求 4.5:1，`ui` 要求 3:1。
- 任一侧带 alpha 时，先合成到 `backdrop`（缺省 `color.background`）再计算。
- 每个包对每个声明模式 × 每个 Accent 全部检查。

初始语义配对（text）：`on-background/background`、`on-surface` 对 `surface`、`surface-variant`、`surface-raised`、`surface-recessed`、`surface-selected`，`on-surface-muted/surface`、`on-primary/primary`、`primary/primary-soft`、`on-action/action`、`on-secondary/secondary`、`secondary/secondary-soft`、`on-error/error`、`error/error-soft`、`error/surface`、`on-success/success`、`success/success-soft`、`on-warning/warning`、`warning/warning-soft`、`on-info/info`、`on-inverse-surface/inverse-surface`。

初始配对（ui）：`outline/surface`、`primary/surface`。

初始组件配对：`tabbar.active/tabbar.surface`、`primary-tabs.active-color/primary-tabs.selection-surface`、`button.primary-text/button.primary-background`、`switch.thumb/switch.track`。`color.disabled` 与 `opacity.disabled` 相关组合按 WCAG 豁免，不入表。

## 4. 主题身份接入 Core

身份统一为 `ThemeIdentity { packId, packDigest, mode, accent }`，字符串形态 `packId@sha1:…/mode/accent`。核心取舍：**`CaseKey.themeId` 字段保留，语义收窄为模式 ID**。这样取值变化不改变 Case identity，只通过 inputVersion 使 Evidence 过期，符合"Case 只采默认模式"。

| 改动点 | 文件与符号 | 改动 |
| --- | --- | --- |
| Runtime 清单 | `runtime-contract/protocol.ts` `RuntimeCaptureManifest` | 新增必填 `theme: { packId, packDigest, keyCatalogDigest, modes, defaultMode, accents, defaultAccent }`；`RUNTIME_CAPTURE_PROTOCOL_VERSION` 升到 3 |
| 实际维度 | `RuntimeActualDimensions`、`PrepareRequest.expected` | `themeId` 换成 `theme: { packId, packDigest, mode, accent }` |
| 路由保留键 | `RuntimeRouteQueryKey` | 保留键改为 `variant`、`mode`、`accent`（去掉 `theme`） |
| Case | `contracts/case.ts` | `themeId` 文档化为模式 ID；`RESERVED_THEME_ID` 仅用于无主题 Runtime（Flutter review）；`computeCaseId` 不变 |
| Selection | `capture/selection.ts` `ScreenSelectionDraft` | 删除 `themeIds`；展开矩阵时 `themeId = manifest.theme.defaultMode`；Selection 携带 `themePack: ThemeIdentity`（accent 取 `defaultAccent`） |
| Case URL | `capture/runtime-url.ts` | 写 `mode`、`accent`，不再写 `theme` |
| Capture 环境 | `capture/playwright-driver.ts` | `colorScheme = caseKey.themeId`（即模式；`light`/`dark` 以外报协议错误）；URL 环境校验与 `actualFact` 改为 `theme.mode`、`theme.accent`、`theme.packDigest`；actual digest 与 Selection 不一致即 `environment.theme-digest-mismatch` |
| Preflight | `capture/runtime-preflight.ts` | `colorScheme` 取 `manifest.theme.defaultMode`（发现阶段先用 light 读取清单，再按清单重建上下文）；`preflight.ts` 校验 `theme-pack` Catalog 的 digest 与清单一致，否则 `theme.digest-mismatch`（block）；Runtime 自报的 `ThemeDiagnostic` 以 Authoring Diagnostic 透传 |
| inputVersion | PBWork `runtime/capture-protocol.ts` `versionInput` | 加入 `theme.packDigest` 与 `keyCatalogDigest`。主题取值或键目录变化 → inputVersion 变化 → 现有 `revision.inputDigest === input.inputVersion` 判定使 Evidence 过期（截图同样依赖取值） |
| Catalog 种类 | `contracts/catalog.ts` `CATALOG_KINDS` | 新增 `theme-pack`。条目：`{packId}/manifest`（pack 元数据、继承链、digest、字体/资产文件表）、`{packId}/{mode}/{accent}`（`ResolvedThemeTable` 的 values + provenance）。`inputDigest = packDigest` |
| token Catalog | `capture-protocol.ts` token 条目 | 改为键目录：语义键 + 组件键定义（valueType、bindable、modeVariant、description、来源 Contract），不含取值；常量不进入 |
| Blob | `contracts/blob.ts` `BLOB_KINDS` | 新增 `theme-file`；owner kind `catalog` 已存在。Core 在 Capture 时通过 Playwright request 拉取清单中的字体/资产 URL，校验 sha1 后写 Blob，挂在 `theme-pack` 条目 `blobIds` |
| Snapshot | `contracts/snapshot.ts` `catalogRefs` | 结构不变，多一个 `theme-pack` 引用 |
| 固定取值表 | Bundle 是可变控制对象，不承载 Catalog | 计划中的"Bundle 固定取值表"落为：Snapshot 的 `theme-pack` CatalogRef + Handoff 字段 |
| Handoff | `contracts/handoff.ts` `AgentHandoff` | 新增必填 `themePack: { packId, packDigest, defaultMode, defaultAccent, catalogRevisionId }`；`capture/handoff.ts` 有 tokenBindings 事实时 `requiredCatalogKinds` 同时要求 `token` 与 `theme-pack` |
| Case 已解析值 | `evidence-read-model.ts`、`consumer-projection.ts` | 不逐节点复制取值。读模型以 Case 的 tokenBindings 关联 Handoff 固定的 `{packId}/{defaultMode}/{defaultAccent}` 表，派生 `resolvedValue` 与引用链；token 清单新增 `resolvedValue`、`chain`、`tier` |
| 读模型字段 | `evidence-inventory.ts`、`review/profile.ts` | `themeId` 展示名改为"模式"；Flutter review 路径保持 `unspecified` |
| CLI | `cli.ts` | 删除 `--theme`；Snapshot 摘要打印主题身份 |
| Local Service | 无语义改动 | 只透传新的 Selection/Handoff 结构；PBWork 捕获面板不再提交 themeIds |
| MCP 新入口 | `packages/mcp-server/src/tools/registry.ts` | 新增 `read_theme_pack { handoffId, mode?, accent?, tokenIds? }`：只经 `handoff.snapshot.catalogRefs` 读取 `theme-pack` 修订（复用 `evidence-store-reader.readCatalog` 的可达性检查），默认返回 Handoff 的默认模式与 Accent；请求非默认模式时返回该表并标注 `capturedMode: false`。`read_screen_packet` 的 token 清单附 `resolvedValue`、`chain` |

非默认模式与 Accent 的取值表随 Snapshot 固定，供 Coding Agent 实现 dark/Accent，但不产生 Case 证据。

## 5. Runtime、Vuetify、CSS 变量与 Workbench

### 5.1 加载与解析

- `loaders.ts`：`import.meta.glob` 读取 `theme-packs/*/` 与 `prototypes/*/theme/`，字体与资产用 `?url` 取 URL，构建期插件计算文件 sha1，组成 `ThemePackSource`。
- 新 `design-system/theme/runtime-theme.ts`：`resolveRuntimeTheme(packId, mode, accent)` 调 Core `resolveThemePack`，结果按身份缓存。删除 `resolveThemeTokens.ts`、`themes/light.json`、`themes/dark.json`、`tokens/tokens.json`、`bindTokens.ts`、`tokenDefaults.ts`。
- `PrototypeRecord.defaultThemeId` 换成 `themePackId`（冷链为 `pbwork-base`）。`validateRegistries.ts` 校验包存在、scope 合法、Diagnostics 无 block。

### 5.2 CSS 变量生成

`themeTableToCssVars(table)` 取代 `tokensToCssVars`：

- 命名规则不变：`--pb-${id.replaceAll('.', '-')}`，跨层冲突检测保留。
- 单位按 `valueType`：`length` 补 `px`，`duration` 补 `ms`，`number`/`easing`/`shadow`/`filter` 原样。
- 复合值展开：typography 输出简写 + 部件 + `-variant-numeric`；border 输出 `width style color`；asset 输出 `url("…")` 或 `none`。
- enum 同时输出 CSS 变量与根节点 data 属性 `data-pb-density`、`data-pb-surface-treatment`、`data-pb-motion`。
- 常量单独生成一次，不随主题变化。

### 5.3 JS 侧读取

- `RuntimeLayout.vue` 与 Playground 根节点 `provide(ThemeTableKey, table)`；新 `useToken(key)`、`useTokenNumber(key)` 返回 `computed`。
- 约 40 处模块级 `tokenDefault*` 调用分两类：常量（手势阈值、点击抑制、拖拽上限）改为从 `constants.json` 导入；主题键（尺寸、时长）改为组件内 `useToken`。
- 资产与字体：`FontFace` API 按包注册字体，`document.fonts.ready` 纳入 Runtime readiness；资产用 `useToken('asset.*')` 渲染。

### 5.4 Vuetify

`createVuetifyThemes.ts` 改为按 `ResolvedThemeTable` 动态注册 `pb-{packId}-{mode}-{accent}`，`vuetify-bindings.ts` 改指新键（toast → `color.inverse-surface` 等），`dark` 标志取自模式。density 映射到 Vuetify 全局 defaults。`main.ts` 不再静态创建双主题，改由 Runtime/Playground 在身份变化时 `theme.themes.value[name] = …` 后切换。`workbench-themes.ts` 不变。

### 5.5 Runtime 偏好与 URL

- 偏好键升到 `pbwork.runtime.theme.v2`，值为 `{ [prototypeId]: { mode: 'light' | 'dark' | 'system', accent } }`；v1 值丢弃。
- URL 保留键 `mode`、`accent`。`resolveThemeSync` 语义不变（Capture/强制导航钉住 URL、偏好写回、返回时盖章），字段从 theme 改为 mode/accent。
- `system` 只是偏好：通过 `matchMedia('(prefers-color-scheme: dark)')` 解析为包内模式；Case URL 总是写具体模式。
- capture bridge 的 `getContext` 返回 `theme: ThemeIdentity`。

### 5.6 Inspector

`runtime/inspect/snapshot.ts`：`tokenVarCatalog` 的键列表来自键目录（可绑定键）；typography 匹配改用部件变量比较（不再用 `font` 简写探针）；`readDatasetTokenBindings` 以键目录 `bindable` 集合 + 字面量校验。`BINDING_SLOT_PROPERTIES` 抽到共享模块，供 W4 生成器复用。

### 5.7 Token Gallery 与 Playground

- **TokenGallery.vue**：顶部选择 包 × 模式 × Accent；按层分组（语义 / 组件 / 常量只读）；每键显示解析值、引用链、来源包；子包沿用祖先值时显示"沿用基础值"；对比度表显示每个配对比值与豁免状态；Diagnostics 面板列出 block/warning。
- **双包对比**：Gallery 支持选择第二个包并排显示差异键（仅显示解析值不同的键）。
- **ComponentPlayground.vue**：工具条增加包、模式、Accent 选择，`pbwork-sample` 只在这里可选。切换时同一组件即时换肤，用于验证"换包不改组件代码"。
- `ThemePreview.vue`、`PhoneCanvasView.vue`、`navigation.ts` themeItems 改为模式/Accent 维度；`WorkbenchOverview.vue` 显示原型包身份。
- 样例包 `pbwork-sample` 至少改变：品牌色与 Accent、字体（一套 OFL 字体）、`radius.*`、`density: compact`、`surface.treatment: glass`、`motion.personality: lively`、一个 `asset.brand-mark`。它同时是 Core 解析器、Runtime 字体加载、资产 Blob 化的端到端样本。

## 6. W3 / W4 / W5 耦合设计

### 6.1 W3 主题一致性探针

- **挂载点**：`capture/runtime-preflight.ts` `preflightInstrumentedRuntime`，在现有单页面完成 Authoring Lint 之后调用新模块 `capture/theme-probe.ts`。
- **范围**：每个选中 Screen 的 default Variant × 清单声明的每个模式（Accent 取默认）。同一页面上通过 prepare 切换 mode 后执行 readiness，再读取完整语义快照，不截图。
- **比较内容**（纯函数 `compareModeSemanticTrees`，放在浏览器安全的 `runtime-contract/theme-probe-compare.ts`）：以 fragment identity（`data-pb-id` + `data-pb-key`）为键，比较每个节点的 `role`、`visible`、bbox 是否非零、`componentId`、排序后的 `tokenBindings`、语义父节点。不比较坐标、尺寸、文本和取值。
- **结果**：任一差异产生 Authoring Diagnostic `theme.mode-divergence`（block），附 Screen、模式对、节点与差异字段。结果不写 Evidence，按 inputVersion 与 W1 的 Preflight 缓存一起缓存。
- 因为长度与 enum 键不允许随模式变化（`theme.mode-variant-forbidden`），合法包的结构差异只可能来自原型代码按模式分支，这正是探针要拦截的。

### 6.2 W4 `pbStyle` 类型生成

- 新脚本 `pnpm ds:keys:generate`（`apps/pbwork/scripts/generate-theme-keys.mjs`）读取键目录、常量表与全部 Contract `componentTokens`，生成提交入库的 `design-system/theme/generated/keys.ts`：

```ts
export type SemanticKey = "color.primary" | …;
export type ComponentKey = "button.primary-background" | …;
export type BindableKey = SemanticKey | ComponentKey;   // 去掉 bindable:false
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
- W4 只消费生成物；W2 交付时 `keys.ts` 已存在，W4 无需等待 W2 的组件迁移。

### 6.3 W5 Target `pending`

- **Target 清单**：`proto-bridge.target.json` 的 token/component 条目允许 `{ "status": "pending", "reason": "…" }` 代替访问器。
- **Core**：`packages/core/src/target/types.ts` `TargetResolutionStatus` 新增 `pending`；`flutter-app/resolver.ts` `resolveOne` 遇到 pending 声明直接返回 `pending`（不跑启发式），说明"Target 待实现"。`inspect_target_readiness` 将 pending 计为未就绪项并列出；`validate_target_changes` 对绑定到 pending 键的改动给出提示而非冲突。
- **同步脚本**：`scripts/verify-ds-target-sync.mjs` 将 pending 单独计数并列出；未声明的缺失仍然失败；`resolved` 要求放宽为 `resolved | pending`。
- **与 `proto-bridge.sync.json` 的区别**：sync.json 的 synced/pending 是批次级摘要状态；条目级 pending 是逐键事实。两者在文档中分开命名（批次状态 / 条目状态）。
- **在 W2 中提前**：W2 的 Flutter 适配需要它承载 Flutter 暂不实现的键（`asset.*`、`*-treatment` 中的 glass 分支、`motion.personality`）。因此 pending 作为 W2 的一个早期切片落地，W5 只补"新组件 → Contract → Target pending"的流程。

### 6.4 Target 映射范围

- 映射覆盖：全部可绑定语义键 + 全部组件键。组件键由默认引用自动生成访问器（如 `primary-tabs.active-color` → `TS.colors.onSurface`），只有基础包字面量默认的组件键需要手写。
- 常量与 typography 部件不进入 Target 映射；`verify-ds-target-sync.mjs` 的 `tokenCatalog` 摘要改为键目录摘要，`themes` 摘要改为基础包 digest。
- Flutter 侧：`ts.dart` 按新键重命名访问器（`TS.spacing.md` → `TS.space.insetSurface` 等，按第 2.6 节逐处判定），`proto_bridge_tokens.dart` 快照由脚本从基础包生成，`ThemeModeNotifier` 保持 light/dark。

## 7. 实施切片

所有切片遵守：不改动 W1 正在修改的文件，直到 W1 合入；每片结束运行列出的命令并保持全绿。

| 切片 | 内容 | 依赖 | 主要文件 | 验证 | 模型 / 规模 |
| --- | --- | --- | --- | --- | --- |
| S0 视觉基线 | 迁移前截取冷链全部 Screen default Variant、Playground 全部组件在 light/dark 下的截图，作为等价对照（存于 `output/`，不提交） | 无 | 临时 Playwright 脚本 | 截图数量与 Screen 数一致 | Sonnet / S |
| S1 Core 主题模块 | `v2/theme/*` 全部：schema、表达式、解析、digest、对比度、校验；子路径导出 | 无 | `packages/core/src/v2/theme/`、`index.ts`、`package.json` exports | `pnpm --filter @proto-bridge/core test`（新增解析、继承、Primitive 作用域、环检测、digest 稳定性、对比度、全部 Diagnostic 用例）；`pnpm --filter @proto-bridge/core typecheck` | **Opus** / L |
| S2 键目录与基础包 | `key-catalog.json`、`constants.json`、`theme-packs/base/*`、迁移映射表；等价测试：对 154 个旧键，旧 `resolveThemeTokens` 结果 = 新解析结果（light/dark） | S1 | `design-system/theme/`、`theme-packs/base/`、`test/theme-equivalence.test.ts` | `pnpm --filter pbwork test -- theme`；对比度用例输出与第 1.4 节一致 | **Opus** / L |
| S3 W5 pending | Core `pending` 状态、resolver、readiness、sync 脚本计数 | 无 | `packages/core/src/target/*`、`scripts/verify-ds-target-sync.mjs`、Target 文档 | `pnpm --filter @proto-bridge/core test -- target`；`pnpm ds:target-sync:verify` | Sonnet / S |
| S4 键类型生成（W4 前置） | `slots.ts`、`generate-theme-keys.mjs`、`generated/keys.ts`、新鲜度测试 | S2 | `apps/pbwork/scripts/`、`design-system/theme/` | `pnpm --filter pbwork test -- theme-keys`；`pnpm --filter pbwork typecheck` | Sonnet / S |
| S5 Contract 组件层 | 30 份 Contract 加 `componentTokens`、重写 `tokenBindings`；`validateRegistries` 新规则；基础包 `component.json` | S2 | `components/contracts/*.json`、`schemas/`、`validateRegistries.ts`、`resolveLiveTokenBindings.ts` | `pnpm --filter pbwork test -- registries`；脚本核对组件键数 = 第 2.4 节 | Sonnet / M（可按组件分两批） |
| S6 PBWork 主题运行时 | loaders、`runtime-theme.ts`、CSS 生成、`useToken`、Vuetify 动态主题、FontFace、偏好 v2、URL `mode`/`accent`、`PrototypeRecord.themePackId` | S2 | `design-system/loaders.ts`、`themes/*`、`runtime/RuntimeLayout.vue`、`runtime/url.ts`、`runtime/theme-preference.ts`、`main.ts`、`prototypes/registry.ts` | `pnpm --filter pbwork test -- theme-preference runtime-url vuetify-themes`；`pnpm --filter pbwork typecheck` | Sonnet / M |
| S7a DS 迁移：action/display | Button、IconButton、Icon、Spinner、Avatar、Badge、Chip、Card、Divider、EmptyState、Progress：CSS 改新键、`getTokenBindings` 改读 Contract、模块级读取改 `useToken`/常量 | S5、S6 | 对应 `.vue`、`_shared/appearance.ts`、`radius.ts` | `pnpm --filter pbwork test`；`flex-layout-policy`；S0 对照截图零差异 | Sonnet / M |
| S7b DS 迁移：navigation/feedback/input/data | Tabs、Tabbar、AppBar、Sheet、Dialog、Toast、Menu、TextField、Textarea、SearchBar、FilterBar、Checkbox、Radio、Switch、DataList、ScrollableDataList、TabViewport、ScreenTransition；`LiquidGlass` → `SurfaceMaterial` | S7a | 对应 `.vue`、`_shared/*` | 同上 | Sonnet / L（可再拆两批） |
| S8 冷链迁移 | 冷链 4 个 Vue 文件的 `var(--pb-*)` 与 `data-pb-token-*` 按第 2.6 节判定角色 | S7b | `prototypes/cold-chain-ops/*` | `pnpm --filter pbwork test`；`authoring:lint`；S0 对照零差异 | Sonnet / M |
| S9 Core 身份接入 | 第 4 节全部 Core 改动：协议 v3、Selection、Case URL、driver colorScheme、Preflight digest 校验、`theme-pack` Catalog、Blob、Handoff、读模型、CLI；PBWork capture-protocol 清单与 inputVersion | S1、S6、**W1 合入** | `packages/core/src/v2/{runtime-contract,capture,contracts}/*`、读模型、`packages/cli/src/cli.ts`、`apps/pbwork/src/runtime/capture-protocol.ts`、`app/stores/capture.ts` | `pnpm --filter @proto-bridge/core test`；`pnpm test:e2e:runtime`；`pnpm test:e2e:evidence-slice`；改主题值后 Evidence 判定过期的新回归 | **Opus** / L |
| S10 MCP | `read_theme_pack`、`read_screen_packet` 附解析值、README 与工具注册测试 | S9 | `packages/mcp-server/src/tools/*`、README | `pnpm --filter @proto-bridge/mcp-server test`；`pnpm test:e2e:mcp` | Sonnet / S |
| S11 Inspector 与 Workbench | snapshot 键表与字体部件匹配、TokenGallery、Playground 选择器与样例包、双包对比 | S6、S7b | `runtime/inspect/snapshot.ts`、`workbench/*`、`theme-packs/sample/` | `pnpm --filter pbwork test -- inspector`；`pnpm --filter pbwork test:e2e`（inspector、design-system-closure） | Sonnet / M |
| S12 Flutter 适配 | target.json 新键与 pending 条目、`ts.dart` 访问器重命名、快照生成、sync 脚本摘要改写、Flutter 测试 | S3、S5 | `apps/flutter_pb_app/**`、`scripts/verify-ds-target-sync.mjs` | `pnpm ds:target-sync:verify`；`flutter test`（Flutter 目录） | Sonnet / L |
| S13 W3 探针 | `theme-probe.ts`、`theme-probe-compare.ts`、Preflight 接入与缓存、诱发分支的回归夹具 | S9 | `packages/core/src/v2/capture/*`、`runtime-contract/*` | `pnpm --filter @proto-bridge/core test -- theme-probe`；`pnpm test:e2e:runtime` | **Opus** / M |
| S14 文档与收尾 | ADR 0012（三层 Token 与主题包，修订 ADR 0005 的 Foundation/Kit 身份）、ADR 0013（模式不入 Case 证据）；Token 手册、semantic-authoring、capture-pipeline、evidence-model、AGENTS.md 红线、两份 Skill、`verify-docs.mjs` 的 Token 计数规则；删除旧文件 | 全部 | `docs/**`、`apps/pbwork/docs/**`、`AGENTS.md`、`.agents/skills/**`、`scripts/verify-docs.mjs` | `pnpm docs:verify`；`pnpm verify` | Sonnet / M |

关键路径：S1 → S2 → S5/S6 → S7a → S7b → S8，与 S9 → S10/S13 并行；S3、S4、S0 可立即开始。S9 是唯一与 W1 冲突的切片（`orchestrator.ts`、`playwright-driver.ts`、`runtime-preflight.ts`、`local-file-store.ts` 周边），必须排在 W1 之后。

### 7.1 暂停时的切片进度（2026-10-16）

| 切片 | 状态 | 证据 / 缺口 |
| --- | --- | --- |
| S0 视觉基线 | 已完成，待复核 | `output/w2-baseline/` 共 70 张（不提交）：冷链 6 张（3 个 Screen × light/dark）正常；Playground 64 张（32 组件 × light/dark）因 Local Service 未运行握手返回 500，被标为 `error`，组件预览据报仍已渲染。恢复后先人工复核，不可用则在 Service 运行时重截 |
| S1 Core 主题模块 | 代码已齐，测试未复跑 | `packages/core/src/v2/theme/` 七个文件齐：`schema.ts`、`expression.ts`、`resolve.ts`、`contrast.ts`、`digest.ts`、`validate.ts`、`index.ts`。已从 `packages/core/src/v2/index.ts` 导出，`package.json` 有 `./v2/theme`。测试：`packages/core/test/v2/theme/` 的 contrast、digest、resolve、validate、fixtures。第 8 节豁免继承已实现（两侧解析值不变则继承 warning，任一侧改变则失效，含多级继承用例）。诊断码比第 3.7 节多 `theme.schema`（block）与 `theme.contrast-waiver-unused`（warning）。暂停时未复跑 `pnpm --filter @proto-bridge/core test -- theme` |
| S2 键目录与基础包 | 主体已落地，未接入 Runtime | `design-system/theme/`：`key-catalog.json`、`constants.json`、`legacy-migration.json`、`sources.ts`。`theme-packs/base/`：`pack.json`、`primitives.json`、`semantic.json`、`accents.json`；`component.json` 的 `values` 为空。`sources.ts` 注明尚未接入 runtime loader。测试：`theme-base-pack.test.ts`（键规模、6 条豁免与设计稿 1.4 一致、digest 稳定、density/motion `$switch`）、`theme-equivalence.test.ts`（154 旧键分层 102/11/9/32，light/dark 语义、常量、字阶、Primitive 等价）。11 个组件层旧键为 `it.todo`，留给 S5。暂停时未复跑 `pnpm --filter pbwork test -- theme` |
| S3 Target `pending` | 已完成 | Core target 类型、resolver、readiness、validation、claims，MCP 透传与 README，`verify-ds-target-sync.mjs`，Target 文档与两份 Target Skill。core target 测试 31 个（新增 8 个）通过，core 与 mcp-server typecheck 通过，`ds:target-sync:verify` 通过（基线未变，pending 0），`docs:verify`、`test:e2e:mcp` 通过。缺口：`v2/prompts` 三份模板未加入 `pending`；claim 路径无 `pending` 专项测试；有 pending 条目时的脚本输出未用真实数据运行 |
| S4 键类型生成 | 未开始 | 依赖 S2 的目录已在；生成器读取 S5 的 Contract，S5 后需重新生成。无 `design-system/theme/generated/keys.ts` |
| S5 Contract 组件层 | 未开始 | 依赖 S2、S3；Contract 尚无 `componentTokens`。同时为 Flutter 未映射的新键写入条目级 pending 并重新生成同步基线 |
| S6–S14 | 未开始 | S9 依赖 W1 验收合入 |

### 7.2 成本与风险

| 风险 | 说明 | 缓解 |
| --- | --- | --- |
| 间距角色化 | Web 约 335 处、Flutter 约 170 处间距引用需要逐处判定角色，不能机械替换 | 第 2.6 节判定规则 + S0 截图零差异；若选 Q1-B 可降为机械重命名 |
| 组件层规模 | 253+3 个组件键，30 份 Contract 全部改写 | 由规则机器推导，默认值、Target 映射和类型全部生成 |
| JS 侧取值 | 约 40 处模块级读取需要变成响应式或常量 | S7 中按组件随迁移处理，`tokenDefaults.ts` 最后删除以防遗漏 |
| Core 身份与 W1 冲突 | 同文件并行修改 | S9 严格排在 W1 合入后，由 Opus 执行 |
| 协议 v3 破坏性 | Runtime 清单、actual、Selection、Handoff 都是 strict schema | 计划允许不兼容；fixtures 与 e2e 一次性更新 |
| 基础包 WCAG 失败 | 6 个配对不达标 | 见 Q3 |
| 字体确定性 | 基础包名义 Inter，实际系统字体，跨机器截图不稳定 | 见 Q2 |
| 视觉回归无基线 | 仓库无截图基线 | S0 先建对照，S7/S8 要求零像素差异 |

**成本判断：明显超出计划预期。** 计划正文对 W2 的 8 个步骤没有体现以下必需工作：

- 组件层约 256 键与 30 份 Contract 全量改写；
- Selection 删除主题维度、Runtime 协议升 v3、Handoff/Catalog/Blob 新结构；
- 常量从 Evidence 与 Target 中移出；
- 约 40 处 JS 侧取值改造；
- 基础包 WCAG 失败与字体确定性的处置；
- Flutter 约 170 处间距调用的角色化。

本文估算 W2 为 15 个切片，其中 4 个需要 Opus。体量约为 W1 + W4 之和，约是计划文字暗示量级的 1.5–2 倍。按计划风险条款"若中途发现成本明显超出预期，先暂停并与用户确认"，实施前请先确认 Q4。

## 8. 待用户决策问题

> **全部已决（2026-10-16）**：Q1 选 A、Q2 选 A、Q3 选 A、Q4 选 A。各题下方保留原选项作为决策记录；落地后理由迁入 ADR 0012。

### 已决事项的执行约定

- **Q1-A**：语义层只保留第 2.2 节的 15 个 `space.*` 用途角色，不保留刻度步进；旧刻度名只作为基础包 Primitive。
- **Q2-A**：基础包 `font.text`/`font.display`/`font.numeric` 为纯系统字体栈 `system-ui, -apple-system, "PingFang SC", sans-serif`，不随仓库分发字体文件；等价测试只比较字重、字号、行高，字族按本决策替换。
- **Q3-A**：`pack.json` 的 `contrastWaivers` 必须写非空理由，命中即 `theme.contrast-waived`（warning），未声明的失败仍为 block。豁免绑定到"具体的前景/背景解析值对"，而不是绑定到声明它的包：子包经 `extends` 继承祖先包时，若该配对在同一模式（及同一 Accent；祖先无该 Accent 时取祖先的 `defaultAccent`）下前景与背景的解析值都与声明豁免的祖先包相同，豁免随之继承，仍报 warning；子包只要改变了配对中任一侧的解析值，继承的豁免即失效，必须重新满足 AA 或在自己的 `pack.json` 中声明豁免。基础包首批豁免第 1.4 节的 6 个配对。
- **S5 之后的 Target 临时状态**：S5 让 Contract 绑定新键，Flutter 映射在 S12 之前不覆盖这些键。期间在 `proto-bridge.target.json` 中把 Contract 绑定、但 Target 尚未映射的新键显式标为条目级 `pending`（带理由），并重新生成同步基线，使 `pnpm ds:target-sync:verify` 保持通过且如实列出 pending。这是 S12 之前的临时状态：S12 完成时 Token 键的 pending 必须清零（Flutter 适配全部新键名并取基础包取值），之后只允许 W5 新组件保持 pending。
- **Q4-A**：W2 全量执行第 7 节的 15 个切片，不缩减。

### 后续事项

- **基础包修色（W2 之后的独立任务）**：修正第 1.4 节 6 个配对使基础包对比度全部通过，随后删除对应 `contrastWaivers`，并重建 S0 视觉基线。不得混入 W2 等价迁移。

### Q1 间距刻度去向（已决：A）

- A：按计划字面角色化，15 个 `space.*` 角色，逐处判定（第 2.2、2.6 节）。
- B：语义层保留按 density 缩放的步进刻度（`space.1`…`space.8`），只改名不改用法。
- C：组件内部间距全部走组件层键，业务原型只用 4–6 个粗角色。

推荐 A。B 能省下约 500 处判定（约一个切片），但 Evidence 只能表达"8px"，表达不了"内边距"，Coding Agent 仍需猜用途；并且 density 无法按角色差异化缩放，与计划"语义层表达意图"的目标冲突。C 会让原型间距表达力不足。如果 Q4 选择压缩成本，B 是首选降级项。

### Q2 基础包字体（已决：A）

- A：基础包改为纯系统字体栈（`system-ui, -apple-system, "PingFang SC", sans-serif`），与当前实际渲染一致，无许可问题。
- B：随仓库打包 Inter woff2（OFL），跨机器渲染确定，但冷链视觉会变化，需要重建基线。
- C：保持名义 Inter 栈，并对基础包豁免字体文件规则。

推荐 A。它零视觉变化，基础包无需字体文件；字体确定性交给声明了字体的原型包，由 FontFace 与 Blob 保证。C 会让"声明字体必须有文件和许可"的规则出现例外。

### Q3 基础包 WCAG 失败的处置（已决：A）

- A：`pack.json` 引入 `contrastWaivers`，必须写理由，并在 Gallery 与校验中显示为 warning；未声明的失败仍然 block。基础包首批豁免第 1.4 节的 6 个配对。
- B：W2 内直接修色使基础包全部通过，冷链有轻微视觉变化，需要重建基线。
- C：对比度整体降为 warning。

推荐 A，并把 B 列为 W2 之后的独立修色任务。A 保持等价迁移零视觉差异，门禁对新包依然严格；B 混入迁移会破坏 S0 对照的可判定性；C 让计划要求的 WCAG 门禁形同虚设。

### Q4 是否接受成本上调（已决：A）

- A：接受，全量执行第 7 节的 15 个切片（推荐）。
- B：W2 内推迟 Accent 运行时选择器与 `asset.*` 的 Blob 化，只保留键与 Schema；这两项挪到 W5 之前补齐。
- C：采用 Q1-B 并推迟 B 中两项，W2 降到约 12 个切片。

推荐 A。计划明确 W2 不缩减，且 B、C 削减的部分正是"换包不改代码"和主题身份闭环的组成部分，推迟只会把成本转移到 W5 与第二阶段。若时间约束优先，按 C 的顺序降级，影响最小。
