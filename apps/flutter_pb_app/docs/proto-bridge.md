# ProtoBridge 目标适配

本文件只描述固定 ProtoBridge Evidence 如何落到本工程，不定义本产品的一般架构。Evidence 决定源页面结构、文案、状态、交互和构图；本文件决定 Flutter 侧采用哪种已有实现。

## 语义组件落点

当 Fragment 提供可靠的 `componentId` 或 role 时，优先使用下表中的本地组件：

| Evidence 语义 | 本工程目标组件 | import |
| --- | --- | --- |
| `app-bar` | `CommonAppBar` | `common/widgets/widgets.dart` |
| `card` / `summary` | `CommonCard` | `common/widgets/widgets.dart` |
| `form-section` | `CommonFormSection` | `common/widgets/widgets.dart` |
| `badge` | `CommonBadge` | `common/widgets/widgets.dart` |
| `chip` | `CommonChip` | `common/widgets/widgets.dart` |
| `filter-bar` | `CommonFilterBar` | `common/widgets/widgets.dart` |
| `scrollable-data-list` | `CommonScrollableDataList` | `common/widgets/widgets.dart` |
| `data-list` | `CommonDataList` | `common/widgets/widgets.dart` |
| `search` / `search-bar` | `CommonSearchBar` | `common/widgets/widgets.dart` |
| `select` / `select-field` | `CommonSelect` | `common/widgets/widgets.dart` |
| `textarea` | `CommonTextArea` | `common/widgets/widgets.dart` |
| `radio-group` | `CommonRadioGroup` | `common/widgets/widgets.dart` |
| `checkbox` | `CommonCheckbox` | `common/widgets/widgets.dart` |
| `switch-control` | `CommonSwitch` | `common/widgets/widgets.dart` |
| `button` | `CommonButton` | `common/widgets/widgets.dart` |
| `icon-button` | `CommonIconButton` | `common/widgets/widgets.dart` |
| `tabs` | `CommonTabs` | `common/widgets/widgets.dart` |
| `tab-viewport` | `CommonTabView` | `common/widgets/widgets.dart` |
| `bottom-navigation` | `CommonBottomNav` | `common/widgets/widgets.dart` |
| `empty-state` | `CommonEmptyState` | `common/widgets/widgets.dart` |
| `dialog` | `AppPop.confirm` | `common/overlay/app_pop.dart` |
| `bottom-sheet` | `AppPop.sheet` | `common/overlay/app_pop.dart` |
| `flow-sheet` | `AppPop.flowSheet` | `common/overlay/app_pop.dart` |
| `snackbar` | `AppPop.toast` | `common/overlay/app_pop.dart` |

该表是目标工程自己的适配契约，不应被 ProtoBridge 核心代码硬编码到其他目标工程。

## 来源优先级与 resolver 职责

1. 本工程 `AGENTS.md`、本文件、`components.md`、`theme.md` 和公开 Dart API 是当前目标约束的首要来源。
2. `packages/core/src/target/flutter-app` 只负责发现这些来源、解析受控表格、扫描当前 Dart inventory 并验证 symbol/import/constructor/accessor/usage；它不得内置本工程的 `Common*` 或 `TS.*` 映射。
3. 可选 `docs/proto-bridge.target.json` 仅用于把稳定映射机器化；缺失不影响文档解析。它与 `AGENTS.md` 冲突时 resolver 返回 `conflict`，与当前代码不符时返回 `stale`，不能用优先级静默覆盖。
4. 没有显式声明时，代码搜索只能返回 `candidate`；多个候选或未知 ID 返回 `unresolved`，由 Agent 披露或补充目标侧声明。

因此本工程文档回答“应当使用什么”，Flutter adapter 回答“声明在哪里、当前代码是否仍支持以及有哪些候选”。

## 适配规则

- 语义组件映射优先于外观相似性。`CommonChip` 不替代 `CommonBadge`，`Wrap` 不替代 `CommonFilterBar`，普通 `ListView` 不替代 `CommonScrollableDataList`。
- 构造参数、状态和 Theme 映射以 Dart 定义及相似页面为准。
- Evidence 没有对应本地组件时，先报告 unresolved mapping；不要在 feature 中手写平行公共组件。
- 实现前列出 `Evidence componentId/role -> target symbol/import/依据`，最终报告保留未解决项。

## Token 对照

| Evidence token | 目标 token |
| --- | --- |
| `color.error` | `TS.colors.error` |
| `color.error-soft` | `TS.colors.errorSoft` |
| `spacing.sm-plus` | `TS.spacing.smPlus` |
| `spacing.md` | `TS.spacing.md` |
| `radius.lg` | `TS.radius.lg` |
| `typography.title` | `TS.textStyle.title` |
| `typography.caption` | `TS.textStyle.caption` |

Evidence 未提供的布局敏感值不能静默接受目标组件默认值；必须检查 Screenshot，仍不确定时记录剩余风险。

## 状态和验证

Evidence Case/variant/interaction 必须映射到页面状态和命名路由。新增页面遵循 [routing.md](routing.md)，验证遵循 [testing.md](testing.md)，并在最终报告中说明实际执行的场景。
