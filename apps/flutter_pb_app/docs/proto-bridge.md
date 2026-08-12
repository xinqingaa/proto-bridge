# ProtoBridge 目标适配

本文件定义 PBWork 语义在本 Flutter 工程中的翻译策略；精确、可机读的完整表位于工程根目录 `proto-bridge.target.json`，同步基线位于根目录 `proto-bridge.sync.json`。Producer Contract 决定组件职责、状态、行为、布局/结构承诺和 Token 槽，Flutter 侧使用目标技术栈的自然 API 实现这些语义，不复制 Vue props 或 DOM。

## 语义组件落点

优先按 `componentId` 映射；role 只在没有可靠 `componentId` 时提供通用语义回退。比如 `flow-sheet` 的身份是 `componentId=flow-sheet`，role 仍是通用的 `sheet`，不需要创建 `flow-sheet` role。

| Evidence 组件 id | 本工程目标组件 | import |
| --- | --- | --- |
| `app-bar` | `CommonAppBar` | `common/widgets/widgets.dart` |
| `avatar` | `CommonAvatar` | `common/widgets/widgets.dart` |
| `badge` | `CommonBadge` | `common/widgets/widgets.dart` |
| `bottom-sheet` | `AppPop.sheet` | `common/overlay/app_pop.dart` |
| `button` | `CommonButton` | `common/widgets/widgets.dart` |
| `card` | `CommonCard` | `common/widgets/widgets.dart` |
| `checkbox` | `CommonCheckbox` | `common/widgets/widgets.dart` |
| `chip` | `CommonChip` | `common/widgets/widgets.dart` |
| `confirm` | `AppPop.confirm` | `common/overlay/app_pop.dart` |
| `data-list` | `CommonDataList` | `common/widgets/widgets.dart` |
| `divider` | `CommonDivider` | `common/widgets/widgets.dart` |
| `empty-state` | `CommonEmptyState` | `common/widgets/widgets.dart` |
| `filter-bar` | `CommonFilterBar` | `common/widgets/widgets.dart` |
| `flow-sheet` | `AppPop.flowSheet` | `common/overlay/app_pop.dart` |
| `icon` | `CommonIcon` | `common/widgets/widgets.dart` |
| `icon-button` | `CommonIconButton` | `common/widgets/widgets.dart` |
| `loading` | `AppPop.loading` | `common/overlay/app_pop.dart` |
| `menu` | `AppPop.dropMenu` | `common/overlay/app_pop.dart` |
| `primary-tabs` | `CommonPrimaryTabs` | `common/widgets/widgets.dart` |
| `progress` | `CommonProgress` | `common/widgets/widgets.dart` |
| `radio-group` | `CommonRadioGroup` | `common/widgets/widgets.dart` |
| `scrollable-data-list` | `CommonScrollableDataList` | `common/widgets/widgets.dart` |
| `search-bar` | `CommonSearchBar` | `common/widgets/widgets.dart` |
| `secondary-tabs` | `CommonSecondaryTabs` | `common/widgets/widgets.dart` |
| `spinner` | `CommonSpinner` | `common/widgets/widgets.dart` |
| `switch` | `CommonSwitch` | `common/widgets/widgets.dart` |
| `tab-viewport` | `CommonTabView` | `common/widgets/widgets.dart` |
| `tabbar` | `CommonBottomNav` | `common/widgets/widgets.dart` |
| `text-field` | `CommonTextField` | `common/widgets/widgets.dart` |
| `textarea` | `CommonTextArea` | `common/widgets/widgets.dart` |
| `toast` | `AppPop.toast` | `common/overlay/app_pop.dart` |

`page`、`section`、`summary`、`list`、`field` 等 role 要结合 Fragment 上下文选择本地容器，不能覆盖一个已存在且更精确的 `componentId`。

## Token mapping

完整 Token id → `TS.*` accessor 映射只维护在根目录 `proto-bridge.target.json`，当前覆盖 PBWork 全部 153 个 Token，而不只覆盖组件已绑定的 106 个。`lib/theme/proto_bridge_tokens.dart` 提供同一映射的可执行使用点，让 resolver 同时验证“声明存在”和“当前 Dart API 可访问”。这份 Target 映射不等于恢复 MCP 完整 Catalog 读取；Agent 仍按当前任务读取必要的 Producer Contract、文档和源码。

`transparent` 与 `none` 是绑定字面量，不是 Foundation Token，也不得生成 `TS.*` accessor 或 Target token obligation。

Target 只翻译语义，不复制 Web 表达：例如百分比映射为 Flutter 比例、CSS shadow 映射为 Material elevation、CSS easing 映射为 `Curve`。Theme 值由 `TS` 的 light/dark 服务提供，业务页面不得创建平行常量。

## Resolver 与同步状态

1. 根目录 `proto-bridge.target.json` 是精确映射，本文解释策略，Dart 公开 API 是可执行事实；三者不一致时 resolver 必须返回 `stale` 或 `conflict`。
2. 根目录 `proto-bridge.sync.json` 记录最后一次已确认同步的 Producer surface fingerprint、分区/逐组件 digest 与计数；清单元数据必须整体一致，不能只手改总 digest。
3. `pnpm ds:target-sync:verify` 比较 Component/Token/Theme Schema、Contract、role、Catalog、Theme、Bind 池、同步清单和 Flutter resolver；任一协议或 Target API 漂移都会失败并列出变化项。
4. DS 连续迭代期间可以暂缓 Flutter 视觉精修，但必须把清单状态改为 `pending` 并记录原因；稳定后统一恢复 `synced`。不得靠记忆或口头提醒维持同步。

## 当前适配边界

- `data-list` 使用 Flutter `ListView.builder/separated`；`scrollable-data-list` 使用 `pull_to_refresh_flutter3`，并在公共壳内固定 Clamping physics、有限越界和高阻尼 spring，避免刷新完成后的二次回弹。
- `CommonPrimaryTabs` 和 `CommonSecondaryTabs` 分文件维护，均基于官方 `TabBar`；一级轨道直接使用 `unified_popups` 导出的 `LiquidGlass`，内容切换使用 `CommonTabView` / `TabBarView`。
- `menu` 精确映射为 `AppPop.dropMenu`；表单锚点 `CommonMenuField` 只是目标工程便利壳，不是第二套菜单实现。
- `bottom-sheet`、`confirm`、`flow-sheet`、`loading`、`toast` 与 `menu` 全部经 `AppPop` 调用 `unified_popups`。
- `CommonIcon` 使用 `lucide_icons_flutter` 映射 Producer 策展的 26 个稳定 id。
- Flutter elevation、glass blur、布局比例和交互曲线属于平台语义翻译，不要求与 Web 数据结构同构。
- 本工程只维护 31 个当前 componentId，不保留历史组件别名或旧 Dart API。

## 实现与验证

实现前批量解析组件和 Token；`resolved` 只证明映射 symbol/accessor 可定位，组件完成还必须通过状态、交互和 Token 消费测试。Case/variant/interaction 必须映射到页面状态和命名路由；新增页面遵循 [routing.md](routing.md)，验证遵循 [testing.md](testing.md)。最终报告保留固定引用、映射结果、平台近似和未解决项。
