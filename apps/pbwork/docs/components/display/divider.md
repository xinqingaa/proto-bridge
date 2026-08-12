# Divider

> 组件 id：`divider` · 分类：`display`
> 实现：`apps/pbwork/src/design-system/components/display/Divider.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/divider.json`

分隔设置项或内容分区，可带中间标题。

## 职责

- **做什么**：区块或列表分隔。
- **边界**：分隔，不承载业务操作。

## Props

| Prop    | 类型    | 默认    | 说明 |
| ------- | ------- | ------- | ---- |
| `label` | string  | `或者`  |      |
| `inset` | boolean | `false` |      |

## States（Playground / Contract）

- `plain` — 无文案
- `inset` — 缩进

## Slots / Events

- **Slots**：无
- **Events**：无

## tokenBindings

| 槽位    | Token                    |
| ------- | ------------------------ |
| `line`  | `color.divider`          |
| `text`  | `color.on-surface-muted` |
| `inset` | `spacing.md`             |
| `label` | `typography.caption`     |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/display/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
