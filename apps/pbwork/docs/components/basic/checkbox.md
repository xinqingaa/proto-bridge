# Checkbox

> 组件 id：`checkbox` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Checkbox.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/checkbox.json`

独立确认项，如提交前核对、业务偏好勾选。

## 职责

- **做什么**：可独立勾选的条件。
- **边界**：二元开关；多选一组用多个 Checkbox，互斥用 RadioGroup。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `仅查看高优先级` | |
| `modelValue` | boolean | `true` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `unchecked` — 未选中
- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `selected` | `color.primary` |
| `onSelected` | `color.on-primary` |
| `text` | `color.on-surface` |
| `target` | `sizing.touch` |
| `radius` | `radius.xs` |
| `label` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

