# Radio Group

> 组件 id：`radio-group` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/RadioGroup.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/radio-group.json`

互斥单选，如工单优先级、上门时段。

## 职责

- **做什么**：互斥选项。
- **边界**：互斥单选；不要用 Tabs 表达同一表单内的互斥选项。
- **色**：`color` 为选中控件 Token-ref（默认 `color.primary`）。

## 行为要点

- 禁止实例硬编码色值。
- `disabled` 使用 `opacity.disabled`。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id         | label | kind        |
| ---------- | ----- | ----------- |
| `disabled` | 禁用  | interaction |

## 用法要点

1. 从 `@/design-system/components/basic/RadioGroup.vue` 引入。
2. 需要新能力先改 Contract + registry + 本文叙事。
3. 业务原型必须传业务稳定 `inspectId`。
