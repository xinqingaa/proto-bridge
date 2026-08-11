# Text Field

> 组件 id：`text-field` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/TextField.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/text-field.json`

采集单行业务信息，如联系人、电话。

## 职责

- **做什么**：单行业务字段。
- **边界**：单行输入；多行用 Textarea。外观由 tokenBindings 决定，不在页内覆写边框色。

## Props

| Prop         | 类型    | 默认    | 说明 |
| ------------ | ------- | ------- | ---- |
| `label`      | string  | `标题`  |      |
| `modelValue` | string  | ``      |      |
| `disabled`   | boolean | `false` |      |

## States（Playground / Contract）

- （无预置 state）

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位      | Token                |
| --------- | -------------------- |
| `border`  | `color.border`       |
| `surface` | `color.surface`      |
| `radius`  | `radius.md`          |
| `height`  | `sizing.control-md`  |
| `label`   | `typography.caption` |
| `input`   | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
