# ProtoBridge 目标适配

本文件定义 PBWork 语义在本 Flutter 工程中的翻译策略；精确、可机读的完整表位于工程根目录 `proto-bridge.target.json`，同步基线位于根目录 `proto-bridge.sync.json`。Producer Contract 决定组件职责、状态、行为、布局/结构承诺和 Token 槽，Flutter 侧使用目标技术栈的自然 API 实现这些语义，不复制 Vue props 或 DOM。

## 语义组件落点

优先按 `componentId` 映射；role 只在没有可靠 `componentId` 时提供通用语义回退。比如 `flow-sheet` 的身份是 `componentId=flow-sheet`，role 仍是通用的 `sheet`，不需要创建 `flow-sheet` role。

| Evidence 组件 id | 本工程目标组件 | import |
| --- | --- | --- |
| `app-bar` | `CommonAppBar` | `common/widgets.dart` |
| `avatar` | `CommonAvatar` | `common/widgets.dart` |
| `badge` | `CommonBadge` | `common/widgets.dart` |
| `bottom-sheet` | `AppPop.sheet` | `common/overlay/app_pop.dart` |
| `button` | `CommonButton` | `common/widgets.dart` |
| `card` | `CommonCard` | `common/widgets.dart` |
| `checkbox` | `CommonCheckbox` | `common/widgets.dart` |
| `chip` | `CommonChip` | `common/widgets.dart` |
| `confirm` | `AppPop.confirm` | `common/overlay/app_pop.dart` |
| `data-list` | `CommonDataList` | `common/widgets.dart` |
| `divider` | `CommonDivider` | `common/widgets.dart` |
| `empty-state` | `CommonEmptyState` | `common/widgets.dart` |
| `filter-bar` | `CommonFilterBar` | `common/widgets.dart` |
| `flow-sheet` | `AppPop.flowSheet` | `common/overlay/app_pop.dart` |
| `icon` | `CommonIcon` | `common/widgets.dart` |
| `icon-button` | `CommonIconButton` | `common/widgets.dart` |
| `loading` | `AppPop.loading` | `common/overlay/app_pop.dart` |
| `menu` | `AppPop.dropMenu` | `common/overlay/app_pop.dart` |
| `primary-tabs` | `CommonPrimaryTabs` | `common/widgets.dart` |
| `progress` | `CommonProgress` | `common/widgets.dart` |
| `radio-group` | `CommonRadioGroup` | `common/widgets.dart` |
| `scrollable-data-list` | `CommonScrollableDataList` | `common/widgets.dart` |
| `screen-transition` | `PbPageTransitions.theme` | `common/widgets.dart` |
| `search-bar` | `CommonSearchBar` | `common/widgets.dart` |
| `secondary-tabs` | `CommonSecondaryTabs` | `common/widgets.dart` |
| `spinner` | `CommonSpinner` | `common/widgets.dart` |
| `switch` | `CommonSwitch` | `common/widgets.dart` |
| `tab-viewport` | `CommonTabView` | `common/widgets.dart` |
| `tabbar` | `CommonBottomNav` | `common/widgets.dart` |
| `text-field` | `CommonTextField` | `common/widgets.dart` |
| `textarea` | `CommonTextArea` | `common/widgets.dart` |
| `toast` | `AppPop.toast` | `common/overlay/app_pop.dart` |

`page`、`section`、`summary`、`list`、`field` 等 role 要结合 Fragment 上下文选择本地容器，不能覆盖一个已存在且更精确的 `componentId`。

## Token mapping

完整 Token id → `TS.*` accessor 映射只维护在根目录 `proto-bridge.target.json`，当前覆盖 PBWork 全部 154 个 Token，而不只覆盖组件已绑定的 128 个。`lib/theme/proto_bridge_tokens.dart` 提供同一映射的可执行使用点，让 resolver 同时验证“声明存在”和“当前 Dart API 可访问”。这份 Target 映射不等于恢复 MCP 完整 Catalog 读取；Agent 仍按当前任务读取必要的 Producer Contract、文档和源码。

`transparent` 与 `none` 是绑定字面量，不是 Foundation Token，也不得生成 `TS.*` accessor 或 Target token obligation。

Target 只翻译语义，不复制 Web 表达：例如百分比映射为 Flutter 比例、CSS shadow 映射为 Material elevation、CSS easing 映射为 `Curve`。Theme 值由 `TS` 的 light/dark 服务提供，业务页面不得创建平行常量。

## Resolver 与同步状态

1. 根目录 `proto-bridge.target.json` 是精确映射，本文解释策略，Dart 公开 API 是可执行事实；三者不一致时 resolver 必须返回 `stale` 或 `conflict`。
2. 根目录 `proto-bridge.sync.json` 记录最后一次已确认同步的 Producer surface fingerprint、分区/逐组件 digest 与计数；清单元数据必须整体一致，不能只手改总 digest。
3. `pnpm ds:target-sync:verify` 比较 Component/Token/Theme Schema、Contract、role、Catalog、Theme、Bind 池、同步清单和 Flutter resolver；任一协议或 Target API 漂移都会失败并列出变化项。
4. DS 连续迭代期间可以暂缓 Flutter 视觉精修，但必须把清单状态改为 `pending` 并记录原因；稳定后统一恢复 `synced`。不得靠记忆或口头提醒维持同步。

## 当前适配边界

- `data-list` 使用 Flutter `ListView.builder/separated`；`scrollable-data-list` 使用 `pull_to_refresh_flutter3`，并在公共壳内固定 Clamping physics、有限越界和高阻尼 spring，避免刷新完成后的二次回弹。
- `CommonPrimaryTabs` 和 `CommonSecondaryTabs` 分文件维护，均基于官方 `TabBar`；一级轨道是无阴影的 `surface-recessed` 普通表面，选中面使用 Target 自有 `LiquidGlassDecoration` 并由官方 indicator 直接跟随 `TabController.animation`，内容切换使用 `CommonTabView` / `TabBarView`。Flutter 将 `sizing.control-md` 用作 40 高的选中面，并在其外叠加上下 `spacing.xs` 轨道内缩，形成 48 高点击轨道。
- `LiquidGlassDecoration` 只复刻一级 Tab 所需的半透明 `surface-selected`、`radius.full` 和主题化 `elevation.glass`；`Decoration` 没有 Widget 合成层，无法承载 `BackdropFilter`，在统一纯色 recessed 轨道上不伪造背景模糊。这是 Flutter 平台近似，不改变 `effect.glass-backdrop` 的完整 Target 映射。
- `CommonSecondaryTabs` 的 `sizing.caret` 表示三角单侧半宽和高度：默认总宽 10、高 5；`layout.inset-sm-negative` 从文字行盒而非整个 Tab 底边定位。
- Demo 将 `CommonBottomNav` 作为 `Scaffold.bottomNavigationBar` 的真实根导航；遵守 2–5 个目的地约束，第五个“更多”目的地以内层一级 Tabs 承接 Data 与 Feedback，不使用 Drawer/Sheet 选择组件分类。
- `menu` 精确映射为 `AppPop.dropMenu`；表单锚点 `CommonMenuField` 只是目标工程便利壳，不是第二套菜单实现。
- `bottom-sheet`、`confirm`、`flow-sheet`、`loading`、`toast` 与 `menu` 全部经 `AppPop` 调用 `unified_popups`。
- `CommonIcon` 使用 `lucide_icons_flutter` 映射 Producer 策展的 34 个稳定 id 。
- `CommonButton` 只公开 `kind=primary|secondary|outlined`，配色由组件内部绑定 `color.action` / `color.action-soft` / `color.outline`；不保留 variant/tone 矩阵或 `text` 类型。
- `CommonTextField` / `CommonTextArea` 在 `showLabel=false` 时无描边并填充 `color.surface-recessed`；`showLabel=true` 时显示标题、边框并填充 `color.surface`。
- `screen-transition` 映射为 `PbPageTransitions.theme`：默认全部平台使用 iOS 侧滑（`CupertinoPageTransitionsBuilder`）；Android Fade Through 近似为 `ZoomPageTransitionsBuilder`，经 `PbPageTransitions.theme(mode: android)` 选择。不提供包住页面的容器，也不暴露 `screenKey` / `navigation`。
- Flutter elevation、glass blur、布局比例和交互曲线属于平台语义翻译，不要求与 Web 数据结构同构。
- 本工程只维护 32 个当前 componentId，不保留历史组件别名或旧 Dart API。公共 Widget 按 `action/input/display/navigation/data` 五类放在 `lib/common/widgets/`；`feedback` 由 `AppPop` 适配层承接，目标侧组合壳单列 `composition/`，统一从 `lib/common/widgets.dart` 导入。

## Flutter 实现暂不需要

下列 Producer 能力保持差异，Flutter 公开 API 不镜像：

- 手势仲裁 Token（`layout.gesture-*`、`motion.duration-click-suppression`）的组件消费；Tab/列表使用官方 Gesture Arena。
- 一级 Tab 玻璃 `effect.glass-backdrop` 与顶部过渡弧；选中面仍是静态 `LiquidGlassDecoration`。
- Button / Icon Button 按压缩放。
- TextField `clearable`（清除由 `CommonSearchBar` 承担）。
- Checkbox / Switch / Radio 的实例 Token-ref 色槽参数；只保留 Contract 默认色。
- FlowSheet 步骤点、`layout.sheet-max-height` 与弹层时长；`AppPop` 继续交给 `unified_popups` 默认几何。
- 图表 Token 的业务消费。
- `CommonIconButton.quarterTurns` 是 Target 便利参数，不是 Producer prop。

## 实现与验证

实现前批量解析组件和 Token；`resolved` 只证明映射 symbol/accessor 可定位，组件完成还必须通过状态、交互和 Token 消费测试。Case/variant/interaction 必须映射到页面状态和命名路由；新增页面遵循 [routing.md](routing.md)，验证遵循 [testing.md](testing.md)。最终报告保留固定引用、映射结果、平台近似和未解决项。

## Flutter authoritative review Harness

正式 Runtime/Visual Review 使用 `review.version: 2` contract 和
`dart-flutter-mcp` provider。它只 attach 到用户或 IDE 已启动的 debug App；
Target 不提供设备选择、启动脚本或 stdout/图片 fallback。

当前基础设施在 debug App 中注册三个 VM service extension：identity、prepare
和 observe，并启用 Flutter Driver text-entry emulation。业务 feature 必须在实际
路由和 Riverpod state 已存在后安装 delegate，才能在 `proto-bridge.target.json`
中声明固定 Handoff 的 Case、Scenario 与 finder；未绑定时 extension 会明确拒绝
请求，不能伪造 Runtime receipt。

启动供 Review attach 的 App 时，调用方必须用 `--dart-define` 传入实际 build 的
`PB_TARGET_COMMIT`、`PB_TARGET_CONTENT_DIGEST` 和 `PB_APP_BUILD_DIGEST`。identity
extension 将从运行 App 返回这些值，Local Service 会把它们与 Review 固定的 Target
revision 交叉校验。
