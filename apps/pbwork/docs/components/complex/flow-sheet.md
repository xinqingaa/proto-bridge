# Flow Sheet

> 组件 id：`flow-sheet` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/FlowSheet.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/flow-sheet.json`

底部多步面板：在同一张 Sheet 内左右滑动切换步骤。`data-pb-role` 暂用 `sheet`。

## 职责

- **做什么**：把确认 → 执行 → 结果 → 下一步收成连续分步，而不是跳多个页面。
- **边界**：半屏操作流；Workbench 交付流可复用同一交互范式，但实现分层分开。

## Props

| Prop         | 类型    | 默认       | 说明              |
| ------------ | ------- | ---------- | ----------------- |
| `title`      | string  | `分步面板` |                   |
| `modelValue` | boolean | `true`     |                   |
| `step`       | number  | `0`        | 当前步（0-based） |
| `stepCount`  | number  | `3`        |                   |
| `swipe`      | boolean | `true`     | 允许左右滑        |

## Slots / Events

- **Slots**：`default`（每步一页）、`actions`
- **Events**：`update:modelValue`、`update:step`

## States

- `step-one`：第一步，`step=0`、`stepCount=3`
- `step-two`：第二步，`step=1`、`stepCount=3`

## tokenBindings

| 槽                  | Token                    |
| ------------------- | ------------------------ |
| `surface`           | `color.surface`          |
| `border`            | `color.border`           |
| `description`       | `color.on-surface-muted` |
| `inactiveIndicator` | `color.outline`          |
| `activeIndicator`   | `color.primary`          |
| `radius`            | `radius.lg`              |
| `elevation`         | `elevation.raised`       |
| `title`             | `typography.subtitle`    |
| `body`              | `typography.content`     |
| `stepLabel`         | `typography.micro`       |
| `headerGap`         | `spacing.sm-plus`        |
| `dotGap`            | `spacing.xs-plus`        |
| `dotSize`           | `sizing.step-dot`        |
| `fill`              | `layout.fill`            |
| `maxHeight`         | `layout.sheet-max-height` |
| `duration`          | `motion.duration-sheet`  |
| `easing`            | `motion.easing-gentle`   |

## 使用检查

业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
