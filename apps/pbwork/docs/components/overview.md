# 组件总论

## 唯一注册源

同一组件必须在下列位置一致，禁止平行维护第二份列表：

| 产物 | 路径                                                  |
| ---- | ----------------------------------------------------- |
| 实现 | `components/basic                                     | complex/*.vue` |
| 契约 | `components/contracts/{id}.json`                      |
| 注册 | `components/registry.ts`（Playground controls、描述） |
| 场景 | `components/scenarios.ts`（可选组合示例）             |
| 文档 | `apps/pbwork/docs/components/**`                      |

Contract 必含：`schemaVersion`、`id`、`category`、`semantic`、`propsSchema`、`defaultProps`、`states`、`slots`、`events`、`tokenBindings`、`playground`（含 `presentation: interactive|gallery|trigger`）。

可选跨栈语义字段：`summary`、`behavior`、`layout`、`visualAnatomy`、`states[].kind`、`icons`（`pack` 仅 `lucide`）。详见 [alignment-protocol.md](./alignment-protocol.md)。

`playground.presentation`：**默认 `interactive`**；**`gallery` 仅 `icon` / `icon-button`**；overlay 用 `trigger`。互动状态必须在舞台内可观察，Token 绑定只读折叠展示。

`semantic.policy` 只能是 `fixed`、`contextual` 或 `decorative`。fixed 组件由 Contract 固定根 role；contextual 组件只允许通过公开 prop 从 `allowedRoles` 选择；decorative 组件默认不写 `data-pb-id` / `data-pb-role`，不会独立进入 Evidence。

禁止「一个组件 + 大 type 兼多种语义角色」→ 拆成独立 `componentId`；审计见 [audit-large-types.md](./audit-large-types.md)。

## Playground 可调项

只允许三类：

| 分组 | 含义           | 例                                         |
| ---- | -------------- | ------------------------------------------ |
| 内容 | 文案与当前值   | `label`、`title`、`modelValue`             |
| 类型 | 契约内有限枚举 | `variant`、`tone`、`size`                  |
| 行为 | 开关与交互态   | `disabled`、`loading`、`elevated`、`swipe` |

圆角档、阴影等级、字阶属于默认外观（经 bindings），不进自由旋钮，也不把 props 调试器当作组件展示。Playground 不提供“使用场景”下拉框：主预览展示真实交互；Contract states 直接展示为真实组件实例；没有 Contract state 的有限类型使用规范样例并置。仅 Icon / Icon Button 使用状态矩阵，Tabbar / 一级 Tab / 二级 Tab 使用专门布局对照，overlay 使用明确触发按钮；场景数据只作为展示样例与测试夹具。Filter Bar 直接操作筛选项并观察结果。

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

修改已有组件按[分级同步义务](./alignment-protocol.md#分级同步义务)选择产物：纯实现修不改 Contract 或文档；只有语义、布局策略、视觉层级、交互状态或 Playground 能力变化时，才同步对应产物。Agent 在交付时说明实际更新的范围。

## 目录

- 跨栈对齐：[alignment-protocol.md](./alignment-protocol.md)
- 大类型审计：[audit-large-types.md](./audit-large-types.md)
- 组合铁律：[composition.md](./composition.md)
- 手势仲裁：[shared-gestures.md](./shared-gestures.md)
- 页面配方：[../prototypes/recipes.md](../prototypes/recipes.md)

### 基础（16）

[avatar](./basic/avatar.md) · [badge](./basic/badge.md) · [button](./basic/button.md) · [card](./basic/card.md) · [checkbox](./basic/checkbox.md) · [chip](./basic/chip.md) · [divider](./basic/divider.md) · [icon](./basic/icon.md) · [icon-button](./basic/icon-button.md) · [progress](./basic/progress.md) · [radio-group](./basic/radio-group.md) · [select](./basic/select.md) · [spinner](./basic/spinner.md) · [switch](./basic/switch.md) · [text-field](./basic/text-field.md) · [textarea](./basic/textarea.md)

### 复杂（14）

[tabbar](./complex/tabbar.md) · [一级 Tab](./complex/primary-tabs.md) · [二级 Tab](./complex/secondary-tabs.md) · [三级 Tab（Filter Bar）](./complex/filter-bar.md) · [tab-viewport](./complex/tab-viewport.md) · [app-bar](./complex/app-bar.md) · [bottom-sheet](./complex/bottom-sheet.md) · [data-list](./complex/data-list.md) · [dialog](./complex/dialog.md) · [empty-state](./complex/empty-state.md) · [flow-sheet](./complex/flow-sheet.md) · [scrollable-data-list](./complex/scrollable-data-list.md) · [search-bar](./complex/search-bar.md) · [snackbar](./complex/snackbar.md)
