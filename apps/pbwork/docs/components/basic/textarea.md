# Textarea

> 组件 id：`textarea` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Textarea.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/textarea.json`

填写多行说明，如问题描述、现场备注。

## 职责

- **做什么**：多行描述。
- **边界**：多行文本；与 TextField 分工明确，不要互相替代。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `问题描述` | |
| `modelValue` | string | `现场设备出现异常噪声` | |
| `rows` | number | `3` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.surface` |
| `border` | `color.border` |
| `focus` | `color.primary` |
| `radius` | `radius.md` |
| `text` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

