# Checkbox

> 组件 id：`checkbox` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Checkbox.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/checkbox.json`

独立确认项，如提交前核对、业务偏好勾选。

## 职责

- **做什么**：可独立勾选的条件。
- **边界**：二元开关；多选一组用多个 Checkbox，互斥用 RadioGroup。
- **色**：`selectedColor`（选中填充）与 `uncheckedBorderColor`（未选中边框）均为 Token-ref；勾选框圆角 `radius.xs`。

## 行为要点

- 禁止实例硬编码色值。
- `disabled` 使用 `opacity.disabled`。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id | label | kind |
| --- | --- | --- |
| `unchecked` | 未选中 | content |
| `disabled` | 禁用 | interaction |

Playground：`single`；场景「多选一组」演示多个独立 Checkbox。

## 用法要点

1. 从 `@/design-system/components/basic/Checkbox.vue` 引入。
2. 需要新能力先改 Contract + registry + 本文叙事。
3. 业务原型必须传业务稳定 `inspectId`。
