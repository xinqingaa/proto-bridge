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

Contract 必含：`schemaVersion`、`id`、`category`、`propsSchema`、`defaultProps`、`states`、`slots`、`events`、`tokenBindings`。

## Playground 可调项

只允许三类：

| 分组 | 含义 | 例 |
| --- | --- | --- |
| 内容 | 文案与当前值 | `label`、`title`、`modelValue` |
| 类型 | 契约内有限枚举 | `variant`、`tone`、`size`、`selectionStyle` |
| 行为 | 开关与交互态 | `disabled`、`loading`、`elevated`、`swipe` |

圆角档、阴影等级、字阶属于默认外观（经 bindings），不进自由旋钮；可用 `elevated` 等布尔表达有无阴影。

## 检查标记

原型中优先提供：

- `inspectId`（组件支持时）  
- `data-pb-id`：建议 `{prototype}.{screen}.{slot}`  
- `data-pb-role`：与 conventions / 组件内置 role 对齐（如 `tab-bar`、`scroll-list`）

## 新增组件清单

1. 写 `contracts/{id}.json`（Ajv / schema 通过）  
2. 实现 Vue，只读 `--pb-*`  
3. 登记 `registry.ts` controls  
4. 需要时补 `scenarios.ts`  
5. 写本文档对应页  
6. 单元 / playground 相关测试
7. 运行 `pnpm docs:verify`

修改已有组件也执行同一流程。Agent 必须在开始组件任务时提醒文档同步义务，并在交付时说明更新了哪些 Contract、Registry、文档和测试。

## 目录

- 组合铁律：[composition.md](./composition.md)  
- 手势仲裁：[shared-gestures.md](./shared-gestures.md)  
- 页面配方：[../prototypes/recipes.md](../prototypes/recipes.md)  

### 基础（15）

[avatar](./basic/avatar.md) · [badge](./basic/badge.md) · [button](./basic/button.md) · [card](./basic/card.md) · [checkbox](./basic/checkbox.md) · [chip](./basic/chip.md) · [divider](./basic/divider.md) · [icon-button](./basic/icon-button.md) · [progress](./basic/progress.md) · [radio-group](./basic/radio-group.md) · [select](./basic/select.md) · [spinner](./basic/spinner.md) · [switch](./basic/switch.md) · [text-field](./basic/text-field.md) · [textarea](./basic/textarea.md)

### 复杂（13）

[app-bar](./complex/app-bar.md) · [bottom-navigation](./complex/bottom-navigation.md) · [bottom-sheet](./complex/bottom-sheet.md) · [data-list](./complex/data-list.md) · [dialog](./complex/dialog.md) · [empty-state](./complex/empty-state.md) · [filter-bar](./complex/filter-bar.md) · [form-section](./complex/form-section.md) · [scrollable-data-list](./complex/scrollable-data-list.md) · [search-bar](./complex/search-bar.md) · [snackbar](./complex/snackbar.md) · [tab-viewport](./complex/tab-viewport.md) · [tabs](./complex/tabs.md)
