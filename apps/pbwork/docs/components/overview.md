# 组件总论

## 唯一注册源

同一组件必须在下列位置一致，禁止平行维护第二份列表：

| 产物 | 路径 |
| --- | --- |
| 实现 | `components/basic|complex/*.vue` |
| 契约 | `components/contracts/{id}.json` |
| 注册 | `components/registry.ts`（Playground controls、描述） |
| 场景 | `components/scenarios.ts`（可选组合示例） |
| 文档 | `apps/pbwork/docs/components/**` |

Contract 必含：`schemaVersion`、`id`、`category`、`semantic`、`propsSchema`、`defaultProps`、`states`、`slots`、`events`、`tokenBindings`、`playground`（含 `presentation: single|tile|trigger`）。

可选跨栈语义字段：`summary`、`behavior`、`states[].kind`、`icons`（`pack` 仅 `lucide`）。详见 [alignment-protocol.md](./alignment-protocol.md)。

`playground.presentation`：**默认 `single`**；**`tile` 目前仅 `button` / `icon`**；overlay 用 `trigger`。

`semantic.policy` 只能是 `fixed`、`contextual` 或 `decorative`。fixed 组件由 Contract 固定根 role；contextual 组件只允许通过公开 prop 从 `allowedRoles` 选择；decorative 组件默认不写 `data-pb-id` / `data-pb-role`，不会独立进入 Evidence。

禁止「一个组件 + 大 type 兼多种语义角色」→ 拆成独立 `componentId`；审计见 [audit-large-types.md](./audit-large-types.md)。

## Playground 可调项

只允许三类：

| 分组 | 含义 | 例 |
| --- | --- | --- |
| 内容 | 文案与当前值 | `label`、`title`、`modelValue` |
| 类型 | 契约内有限枚举 | `variant`、`tone`、`size` |
| 行为 | 开关与交互态 | `disabled`、`loading`、`elevated`、`swipe` |

圆角档、阴影等级、字阶属于默认外观（经 bindings），不进自由旋钮；可用 `elevated` 等布尔表达有无阴影。

## 检查标记

- 注册组件必须提供根节点 role、`componentId` 和 Contract/运行时 token bindings。
- 业务原型中的 DS 实例必须传业务稳定 `inspectId`，命名为 `{screenId}.{slotPath}`；不得让 required Fragment 依赖默认 `ds.*`。
- Component Contract 必须声明 `fixed`、`contextual` 或 `decorative` semantic role policy；contextual 组件同时声明 allowed roles。
- 业务局部节点不借用组件默认标记，按[语义标记与证据门禁](../../../../docs/reference/semantic-authoring.md)显式声明。

## 新增组件清单

1. 写 `contracts/{id}.json`（Ajv / schema 通过）  
2. 实现 Vue，只读 `--pb-*`，并提供 semantic role policy 与 Inspect registration
3. 登记 `registry.ts` controls  
4. 需要时补 `scenarios.ts`  
5. 写本文档对应页  
6. 单元 / playground 相关测试
7. 运行 `pnpm docs:verify`

修改已有组件也执行同一流程。Agent 必须在开始组件任务时提醒文档同步义务，并在交付时说明更新了哪些 Contract、Registry、文档和测试。

## 目录

- 跨栈对齐：[alignment-protocol.md](./alignment-protocol.md)  
- 大类型审计：[audit-large-types.md](./audit-large-types.md)  
- 组合铁律：[composition.md](./composition.md)  
- 手势仲裁：[shared-gestures.md](./shared-gestures.md)  
- 页面配方：[../prototypes/recipes.md](../prototypes/recipes.md)  

### 基础（16）

[avatar](./basic/avatar.md) · [badge](./basic/badge.md) · [button](./basic/button.md) · [card](./basic/card.md) · [checkbox](./basic/checkbox.md) · [chip](./basic/chip.md) · [divider](./basic/divider.md) · [icon](./basic/icon.md) · [icon-button](./basic/icon-button.md) · [progress](./basic/progress.md) · [radio-group](./basic/radio-group.md) · [select](./basic/select.md) · [spinner](./basic/spinner.md) · [switch](./basic/switch.md) · [text-field](./basic/text-field.md) · [textarea](./basic/textarea.md)

### 复杂（15）

[app-bar](./complex/app-bar.md) · [bottom-navigation](./complex/bottom-navigation.md) · [bottom-sheet](./complex/bottom-sheet.md) · [data-list](./complex/data-list.md) · [dialog](./complex/dialog.md) · [empty-state](./complex/empty-state.md) · [filter-bar](./complex/filter-bar.md) · [flow-sheet](./complex/flow-sheet.md) · [form-section](./complex/form-section.md) · [scrollable-data-list](./complex/scrollable-data-list.md) · [search-bar](./complex/search-bar.md) · [snackbar](./complex/snackbar.md) · [tab-viewport](./complex/tab-viewport.md) · [tabs](./complex/tabs.md) · [underline-tabs](./complex/underline-tabs.md)
