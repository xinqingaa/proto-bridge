# Flow Sheet

> 组件 id：`flow-sheet` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/FlowSheet.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/flow-sheet.json`

底部多步面板：在同一张 Sheet 内左右滑动切换步骤。`data-pb-role` 暂用 `sheet`。

## 职责

- **做什么**：把确认 → 执行 → 结果 → 下一步收成连续分步，而不是跳多个页面。
- **边界**：半屏操作流；Workbench 交付流可复用同一交互范式，但实现分层分开。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `分步面板` | |
| `modelValue` | boolean | `false` | |
| `step` | number | `0` | 当前步（0-based） |
| `stepCount` | number | `3` | |
| `swipe` | boolean | `true` | 允许左右滑 |

## Slots / Events

- **Slots**：`default`（每步一页）、`actions`
- **Events**：`update:modelValue`、`update:step`

## tokenBindings

与 Bottom Sheet 一致：`surface` / `border` / `radius` / `elevation` / `title` / `body`。
