# Radio Group

> 组件 id：`radio-group` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/RadioGroup.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/radio-group.json`

互斥单选，如工单优先级、上门时段。

## 职责

- **做什么**：互斥选项。
- **边界**：互斥单选；不要用 Tabs 表达同一表单内的互斥选项。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `优先级` | |
| `modelValue` | string | `普通` | |
| `options` | array | `["低", "普通", "紧急"]` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `selected` | `color.primary` |
| `text` | `color.on-surface` |
| `label` | `typography.caption` |
| `option` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

