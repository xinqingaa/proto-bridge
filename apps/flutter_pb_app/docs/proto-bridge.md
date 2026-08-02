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
| `search` | `CommonSearchBar` | `common/widgets/widgets.dart` |
| `select` / `select-field` | `CommonSelect` | `common/widgets/widgets.dart` |
| `textarea` | `CommonTextArea` | `common/widgets/widgets.dart` |
| `radio-group` | `CommonRadioGroup` | `common/widgets/widgets.dart` |
| `checkbox` | `CommonCheckbox` | `common/widgets/widgets.dart` |
| `switch-control` | `CommonSwitch` | `common/widgets/widgets.dart` |
| `button` | `CommonButton` | `common/widgets/widgets.dart` |

该表是目标工程自己的适配契约，不应被 ProtoBridge 核心代码硬编码到其他目标工程。

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
