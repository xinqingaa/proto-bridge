# Textarea

> 组件 id：`textarea` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Textarea.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/textarea.json`

填写多行说明，如问题描述、现场备注。

## 职责

- **做什么**：多行描述。
- **边界**：多行文本；与 TextField 分工明确，不要互相替代。

## Props

| Prop         | 类型    | 默认                   | 说明 |
| ------------ | ------- | ---------------------- | ---- |
| `label`      | string  | `问题描述`             |      |
| `modelValue` | string  | `现场设备出现异常噪声` |      |
| `disabled`   | boolean | `false`                |      |

可见行数不是实例样式入口，统一绑定 Foundation `sizing.textarea-rows`。

## States（Playground / Contract）

- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位              | Token                  |
| ----------------- | ---------------------- |
| `surface`         | `color.surface`        |
| `border`          | `color.border`         |
| `focus`           | `color.primary`        |
| `radius`          | `radius.md`            |
| `text`            | `typography.content`   |
| `disabledOpacity` | `opacity.disabled`     |
| `rows`            | `sizing.textarea-rows` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
