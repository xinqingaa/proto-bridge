# Token 全量目录

> 权威源：`apps/pbwork/src/design-system/tokens/tokens.json`（共 131 项）
> Bind 池：`apps/pbwork/src/design-system/bindTokens.ts`（110 项可进组件 `tokenBindings`）

未进 Bind 池的 Token 仍可在 Foundations 浏览，但**不得**写入通用组件契约（`transparent` / `none` 除外）。

## 颜色（`color` · 36）

| ID                         | 标签          | 默认值      | Bind | 说明                                                          |
| -------------------------- | ------------- | ----------- | ---- | ------------------------------------------------------------- |
| `color.background`         | 背景          | `#f7f8fa`   | 是   | 页面背景色                                                    |
| `color.surface`            | 表面          | `#ffffff`   | 是   | 卡片与面板表面色                                              |
| `color.primary`            | 主色          | `#2f73d2`   | 是   | 克制强调色，仅用于选择、焦点、链接与进度                      |
| `color.navigation-active`  | 导航激活      | `#2f73d2`   | 是   | 应用导航和页签的当前定位色；默认与主色一致，但不复用主操作色  |
| `color.section-tab-active` | 页内 Tab 激活 | `#1d1f23`   | 是   | 一级、二级页内 Tab 的中性当前定位色；不复用应用导航或主操作色 |
| `color.primary-soft`       | 主色软底      | `#eaf2fd`   | 是   | 主色混合实色软底（非 alpha），用于 Chip / tonal               |
| `color.on-primary`         | 主色上文字    | `#ffffff`   | 是   |                                                               |
| `color.action`             | 主操作        | `#202124`   | 是   | 实心主按钮使用的中性色，不复用强调色                          |
| `color.action-soft`        | 主操作软底    | `#e8e9ea`   | 是   | 主操作混合实色软底，用于 tonal 按钮                           |
| `color.on-action`          | 主操作上文字  | `#ffffff`   | 是   |                                                               |
| `color.secondary`          | 次色          | `#66707a`   | 是   |                                                               |
| `color.secondary-soft`     | 次色软底      | `#f0f2f4`   | 是   | 次色混合实色软底                                              |
| `color.border`             | 边框          | `#dde1e6`   | 是   |                                                               |
| `color.error`              | 错误          | `#b44a42`   | 是   |                                                               |
| `color.error-soft`         | 错误软底      | `#f7ecea`   | 是   | 错误色混合实色软底                                            |
| `color.info`               | 信息          | `#397bc1`   | 是   | 信息色：比主色更冷、更灰，避免与品牌色撞车                    |
| `color.success`            | 成功          | `#39715a`   | 是   |                                                               |
| `color.success-soft`       | 成功软底      | `#eaf2ee`   | 是   | 成功色混合实色软底                                            |
| `color.warning`            | 警告          | `#87651c`   | 是   |                                                               |
| `color.warning-soft`       | 警告软底      | `#f5f0e4`   | 是   | 警告色混合实色软底                                            |
| `color.on-surface`         | 表面上文字    | `#1d1f23`   | 是   |                                                               |
| `color.on-surface-muted`   | 表面弱化文字  | `#666b73`   | 是   | 表面上文字约 62% 透明度，用于副标题与提示                     |
| `color.surface-variant`    | 次级表面      | `#f0f2f4`   | 是   | 弱分区、表格表头与次级容器                                    |
| `color.surface-recessed`   | 内凹表面      | `#f5f6f8`   | 是   | 承托页内选择态的中性内凹背景；可按主题独立压深                |
| `color.surface-selected`   | 选中表面      | `#fbfcfd`   | 是   | 分段、Tab 等非主色选择态的中性浅灰层                          |
| `color.surface-raised`     | 浮层表面      | `#ffffff`   | 是   | 菜单、Dialog 与悬浮工具栏                                     |
| `color.on-background`      | 背景上文字    | `#1d1f23`   | 是   |                                                               |
| `color.on-secondary`       | 次色上文字    | `#ffffff`   | 是   |                                                               |
| `color.outline`            | 轮廓          | `#aeb4bc`   | 是   |                                                               |
| `color.divider`            | 分割线        | `#e5e7ea`   | 是   |                                                               |
| `color.disabled`           | 禁用内容      | `#9aa0a8`   | 是   |                                                               |
| `color.scrim`              | 遮罩          | `#0f172a99` | 是   |                                                               |
| `color.on-error`           | 错误色上文字  | `#ffffff`   | 是   |                                                               |
| `color.on-success`         | 成功色上文字  | `#ffffff`   | 是   |                                                               |
| `color.on-warning`         | 警告色上文字  | `#251a00`   | 是   |                                                               |
| `color.on-info`            | 信息色上文字  | `#ffffff`   | 是   |                                                               |

## 字体（`typography` · 13）

| ID                          | 标签     | 默认值                                       | Bind | 说明                           |
| --------------------------- | -------- | -------------------------------------------- | ---- | ------------------------------ |
| `typography.title`          | 标题     | `650 20px/1.3 Inter, system-ui, sans-serif`  | 是   | fontWeight 650 · fontSize 20px |
| `typography.subtitle`       | 副标题   | `600 16px/1.4 Inter, system-ui, sans-serif`  | 是   | fontWeight 600 · fontSize 16px |
| `typography.content`        | 正文     | `400 14px/1.5 Inter, system-ui, sans-serif`  | 是   | fontWeight 400 · fontSize 14px |
| `typography.caption`        | 辅助说明 | `400 12px/1.4 Inter, system-ui, sans-serif`  | 是   | fontWeight 400 · fontSize 12px |
| `typography.display`        | 展示标题 | `700 40px/1.15 Inter, system-ui, sans-serif` | 否   |                                |
| `typography.headline`       | 页面标题 | `700 28px/1.2 Inter, system-ui, sans-serif`  | 否   |                                |
| `typography.title-sm`       | 小标题   | `650 18px/1.35 Inter, system-ui, sans-serif` | 否   |                                |
| `typography.title-lg`       | 大标题   | `700 24px/1.25 Inter, system-ui, sans-serif` | 否   |                                |
| `typography.body-sm`        | 小正文   | `400 13px/1.5 Inter, system-ui, sans-serif`  | 否   |                                |
| `typography.body-lg`        | 大正文   | `400 16px/1.55 Inter, system-ui, sans-serif` | 否   |                                |
| `typography.label`          | 控件标签 | `600 14px/1.4 Inter, system-ui, sans-serif`  | 是   |                                |
| `typography.caption-strong` | 强调说明 | `600 12px/1.4 Inter, system-ui, sans-serif`  | 是   |                                |
| `typography.micro`          | 微型标签 | `500 0.72rem/1.2 Inter, system-ui, sans-serif` | 是 | 流程步骤等空间受限的状态标签 |

## 间距（`spacing` · 12）

| ID                | 标签       | 默认值 | Bind | 说明 |
| ----------------- | ---------- | ------ | ---- | ---- |
| `spacing.xs`      | 超小间距   | `4`    | 是   |      |
| `spacing.sm`      | 小间距     | `8`    | 是   |      |
| `spacing.md`      | 中间距     | `16`   | 是   |      |
| `spacing.lg`      | 大间距     | `24`   | 是   |      |
| `spacing.xl`      | 超大间距   | `32`   | 否   |      |
| `spacing.none`    | 无间距     | `0`    | 否   |      |
| `spacing.xxs`     | 极小间距   | `2`    | 否   |      |
| `spacing.xs-plus` | 紧凑间距   | `6`    | 是   | 密集状态和进度提示 |
| `spacing.sm-plus` | 中小间距   | `12`   | 是   |      |
| `spacing.lg-plus` | 大间距     | `40`   | 否   |      |
| `spacing.2xl`     | 二倍大间距 | `48`   | 否   |      |
| `spacing.3xl`     | 三倍大间距 | `64`   | 否   |      |

## 尺寸（`sizing` · 18）

| ID                         | 标签         | 默认值 | Bind | 说明 |
| -------------------------- | ------------ | ------ | ---- | ---- |
| `sizing.control-sm`        | 小控件高度   | `32`   | 是   |      |
| `sizing.control-md`        | 标准控件高度 | `40`   | 是   |      |
| `sizing.control-lg`        | 大控件高度   | `48`   | 是   |      |
| `sizing.icon-sm`           | 小图标       | `16`   | 否   |      |
| `sizing.icon-md`           | 标准图标     | `20`   | 是   |      |
| `sizing.icon-lg`           | 大图标       | `24`   | 是   |      |
| `sizing.avatar-sm`         | 小头像       | `28`   | 否   |      |
| `sizing.avatar-md`         | 标准头像     | `40`   | 是   |      |
| `sizing.avatar-lg`         | 大头像       | `56`   | 否   |      |
| `sizing.touch`             | 最小触控目标 | `44`   | 是   |      |
| `sizing.menu-item`         | 菜单项高度   | `48`   | 是   |      |
| `sizing.tab`               | 页签高度     | `44`   | 否   |      |
| `sizing.bottom-navigation` | 底部导航高度 | `64`   | 是   |      |
| `sizing.indicator-thickness` | 指示器厚度 | `3` | 是 | 页签等线性定位指示器 |
| `sizing.caret` | 小三角尺寸 | `5` | 是 | 页签与菜单的小三角 |
| `sizing.step-dot` | 步骤圆点 | `6` | 是 | 流程等紧凑圆点 |
| `sizing.refresh-action-min-width` | 刷新操作最小宽度 | `96` | 是 | 列表刷新操作 |
| `sizing.refresh-action-height` | 刷新操作高度 | `36` | 是 | 刷新辅助操作 |

## 圆角（`radius` · 7）

| ID            | 标签     | 默认值 | Bind | 说明 |
| ------------- | -------- | ------ | ---- | ---- |
| `radius.none` | 无圆角   | `0`    | 否   |      |
| `radius.sm`   | 小圆角   | `8`    | 是   |      |
| `radius.md`   | 中圆角   | `12`   | 是   |      |
| `radius.lg`   | 大圆角   | `16`   | 是   |      |
| `radius.full` | 全圆角   | `999`  | 是   |      |
| `radius.xs`   | 极小圆角 | `4`    | 是   |      |
| `radius.xl`   | 超大圆角 | `24`   | 是   |      |

## 边框（`border` · 6）

| ID                | 标签     | 默认值                              | Bind | 说明 |
| ----------------- | -------- | ----------------------------------- | ---- | ---- |
| `border.hairline` | 细线     | `1px solid var(--pb-color-divider)` | 是   |      |
| `border.default`  | 标准边框 | `1px solid var(--pb-color-border)`  | 是   |      |
| `border.strong`   | 强调边框 | `2px solid var(--pb-color-outline)` | 否   |      |
| `border.focus`    | 焦点边框 | `2px solid var(--pb-color-primary)` | 是   |      |
| `border.width-hairline` | 细线宽度 | `1px` | 是 | 动态颜色的细线 |
| `border.accent-width` | 强调边宽 | `4px` | 是 | 状态消息的强调边 |

## 阴影（`elevation` · 9）

| ID                  | 标签     | 默认值                                                         | Bind | 说明                     |
| ------------------- | -------- | -------------------------------------------------------------- | ---- | ------------------------ |
| `elevation.none`    | 无阴影   | `none`                                                         | 是   |                          |
| `elevation.card`    | 卡片阴影 | `0 1px 2px rgba(15, 23, 42, 0.08), 0 8px 24px rgba(15, 23,...` | 是   |                          |
| `elevation.raised`  | 浮起阴影 | `0 4px 12px rgba(15, 23, 42, 0.12), 0 16px 32px rgba(15, 2...` | 是   |                          |
| `elevation.glass`   | 玻璃阴影 | `0 6px 18px rgba(15, 23, 42, 0.08)`                            | 是   | 低浓度、宽扩散的单层阴影 |
| `elevation.level-1` | 阴影一级 | `0 1px 3px rgba(15, 23, 42, 0.12)`                             | 是   |                          |
| `elevation.level-2` | 阴影二级 | `0 4px 10px rgba(15, 23, 42, 0.12)`                            | 否   |                          |
| `elevation.level-3` | 阴影三级 | `0 8px 20px rgba(15, 23, 42, 0.14)`                            | 是   |                          |
| `elevation.level-4` | 阴影四级 | `0 14px 32px rgba(15, 23, 42, 0.16)`                           | 是   |                          |
| `elevation.level-5` | 阴影五级 | `0 22px 48px rgba(15, 23, 42, 0.2)`                            | 是   |                          |

## 透明度（`opacity` · 8）

| ID                 | 标签           | 默认值 | Bind | 说明                           |
| ------------------ | -------------- | ------ | ---- | ------------------------------ |
| `opacity.disabled` | 禁用透明度     | `0.38` | 是   | 所有 disabled 状态的统一透明度 |
| `opacity.muted`    | 弱化透明度     | `0.62` | 否   |                                |
| `opacity.glass`    | 玻璃表面透明度 | `0.76` | 是   | Tab 等半透明中性选择表面       |
| `opacity.hover`    | 悬停叠加       | `0.08` | 否   |                                |
| `opacity.pressed`  | 按下叠加       | `0.14` | 否   |                                |
| `opacity.overlay`  | 遮罩透明度     | `0.6`  | 否   |                                |
| `opacity.hidden`   | 隐藏透明度     | `0`    | 是   |                                |
| `opacity.visible`  | 完全可见透明度 | `1`    | 是   |                                |

## 动效（`motion` · 12）

| ID                         | 标签     | 默认值                           | Bind | 说明 |
| -------------------------- | -------- | -------------------------------- | ---- | ---- |
| `motion.duration-fast`     | 快速时长 | `120ms`                          | 是   |      |
| `motion.duration-normal`   | 标准时长 | `200ms`                          | 是   |      |
| `motion.duration-slow`     | 缓慢时长 | `320ms`                          | 是   |      |
| `motion.easing-standard`   | 标准缓动 | `cubic-bezier(0.2, 0, 0, 1)`     | 是   |      |
| `motion.easing-emphasized` | 强调缓动 | `cubic-bezier(0.2, 0.8, 0.2, 1)` | 否   |      |
| `motion.duration-instant` | 即时时长 | `0ms` | 是 | |
| `motion.easing-gentle` | 柔和缓动 | `ease` | 是 | |
| `motion.scale-pressed` | 常规按下缩放 | `0.98` | 是 | |
| `motion.scale-pressed-strong` | 明显按下缩放 | `0.96` | 是 | |
| `motion.rotate-half-turn` | 半周旋转 | `180deg` | 是 | |
| `motion.duration-sheet` | Sheet 切换时长 | `220ms` | 是 | 流程 Sheet 视图切换 |
| `motion.duration-tab-viewport` | 视图区切换时长 | `240ms` | 是 | 独立 Tab Viewport 水平切换 |

## 布局（`layout` · 7）

| ID | 标签 | 默认值 | Bind | 说明 |
| --- | --- | --- | --- | --- |
| `layout.fill` | 填满容器 | `100%` | 是 | |
| `layout.half` | 容器半宽 | `50%` | 是 | |
| `layout.half-negative` | 反向容器半宽 | `-50%` | 是 | |
| `layout.translate-full-negative` | 反向满幅平移 | `-100%` | 是 | |
| `layout.focus-inset` | 焦点内缩 | `-4px` | 是 | |
| `layout.sheet-max-height` | Sheet 最大高度 | `min(62vh, 560px)` | 是 | 流程 Sheet 高度上限 |
| `layout.load-more-root-margin` | 触底加载观察边距 | `0px 0px 120px 0px` | 是 | 列表触底加载的观察器边距 |

## 层级（`layer` · 2）

| ID | 标签 | 默认值 | Bind | 说明 |
| --- | --- | --- | --- | --- |
| `layer.base` | 基础层级 | `0` | 是 | |
| `layer.content` | 内容层级 | `1` | 是 | |

## 效果（`effect` · 1）

| ID | 标签 | 默认值 | Bind | 说明 |
| --- | --- | --- | --- | --- |
| `effect.glass-backdrop` | 玻璃背景滤镜 | `blur(12px) saturate(1.06)` | 是 | 半透明玻璃的背景效果 |
