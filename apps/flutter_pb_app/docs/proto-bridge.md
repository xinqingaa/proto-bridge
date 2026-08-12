# ProtoBridge 目标适配

本文件定义 PBWork 语义在本 Flutter 工程中的翻译策略；精确、可机读的完整表位于 `proto-bridge.target.json`。Producer Contract 决定组件职责、状态、行为、布局/结构承诺和 Token 槽，Flutter 侧可以使用不同 API，但不得改变这些语义。

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
| `menu` | `CommonSelect` | `common/widgets/widgets.dart` |
| `primary-tabs` | `CommonTabs` | `common/widgets/widgets.dart` |
| `progress` | `CommonProgress` | `common/widgets/widgets.dart` |
| `radio-group` | `CommonRadioGroup` | `common/widgets/widgets.dart` |
| `scrollable-data-list` | `CommonScrollableDataList` | `common/widgets/widgets.dart` |
| `search-bar` | `CommonSearchBar` | `common/widgets/widgets.dart` |
| `secondary-tabs` | `CommonTabs` | `common/widgets/widgets.dart` |
| `spinner` | `CommonSpinner` | `common/widgets/widgets.dart` |
| `switch` | `CommonSwitch` | `common/widgets/widgets.dart` |
| `tab-viewport` | `CommonTabView` | `common/widgets/widgets.dart` |
| `tabbar` | `CommonBottomNav` | `common/widgets/widgets.dart` |
| `text-field` | `CommonTextField` | `common/widgets/widgets.dart` |
| `textarea` | `CommonTextArea` | `common/widgets/widgets.dart` |
| `toast` | `AppPop.toast` | `common/overlay/app_pop.dart` |

`page`、`section`、`summary`、`list`、`field` 等 role 要结合 Fragment 上下文选择本地容器，不能覆盖一个已存在且更精确的 `componentId`。

## Component mapping 兼容别名

这些别名只用于读取旧 Handoff；新 Producer 不再产生它们。

| 旧 Evidence id | 本工程目标组件 | import |
| --- | --- | --- |
| `select` / `select-field` | `CommonSelect` | `common/widgets/widgets.dart` |
| `switch-control` | `CommonSwitch` | `common/widgets/widgets.dart` |
| `tabs` | `CommonTabs` | `common/widgets/widgets.dart` |
| `bottom-navigation` | `CommonBottomNav` | `common/widgets/widgets.dart` |
| `dialog` | `AppPop.confirm` | `common/overlay/app_pop.dart` |
| `snackbar` | `AppPop.toast` | `common/overlay/app_pop.dart` |
| `search` | `CommonSearchBar` | `common/widgets/widgets.dart` |
| `card-summary` | `CommonCard` | `common/widgets/widgets.dart` |

## Token mapping

完整 Token id → `TS.*` accessor 映射只维护在 `proto-bridge.target.json`，当前覆盖所有组件 Contract 实际消费的 Catalog Token。`lib/theme/proto_bridge_tokens.dart` 提供同一映射的可执行使用点，让 resolver 同时验证“声明存在”和“当前 Dart API 可访问”。

`transparent` 与 `none` 是绑定字面量，不是 Foundation Token，也不得生成 `TS.*` accessor 或 Target token obligation。

Target 只翻译语义，不复制 Web 表达：例如百分比映射为 Flutter 比例、CSS shadow 映射为 Material elevation、CSS easing 映射为 `Curve`。Theme 值由 `TS` 的 light/dark 服务提供，业务页面不得创建平行常量。

## Resolver 与同步状态

1. `proto-bridge.target.json` 是精确映射，本文解释策略，Dart 公开 API 是可执行事实；三者不一致时 resolver 必须返回 `stale` 或 `conflict`。
2. `proto-bridge.sync.json` 记录最后一次已确认同步的 Producer surface fingerprint、分区/逐组件 digest 与计数；清单元数据必须整体一致，不能只手改总 digest。
3. `pnpm ds:target-sync:verify` 比较 Component/Token/Theme Schema、Contract、role、Catalog、Theme、Bind 池、同步清单和 Flutter resolver；任一协议或 Target API 漂移都会失败并列出变化项。
4. DS 连续迭代期间可以暂缓 Flutter 视觉精修，但必须把清单状态改为 `pending` 并记录原因；稳定后统一恢复 `synced`。不得靠记忆或口头提醒维持同步。

## 当前适配边界

- `CommonTabs` 同时承载一级/二级 Tab，通过目标参数翻译选择层级；不是复制 Vue props。
- `CommonSelect` 是 `menu` 的有限选项实现；锚定式自定义菜单仍走 `AppPop.menu`。
- Flutter elevation、glass blur、Lucide id → `IconData` 属于平台近似，最终构图仍需结合固定 Screenshot 验证。
- 部分既有公共组件保留旧构造参数以兼容现有 feature；新 Evidence 实现只使用本表和 Producer Contract 明确的职责。

## 实现与验证

实现前批量解析组件和 Token；只有 `resolved` 可视为已验证落点。Case/variant/interaction 必须映射到页面状态和命名路由；新增页面遵循 [routing.md](routing.md)，验证遵循 [testing.md](testing.md)。最终报告保留固定引用、映射结果、平台近似和未解决项。
