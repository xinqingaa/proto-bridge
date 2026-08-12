# Textarea

> 组件 id：`textarea` · 分类：`input`
> 实现：`apps/pbwork/src/design-system/components/input/Textarea.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/textarea.json`

填写多行说明。默认 plain 无标题无描边；`showLabel` 时显示标题并启用边框。

## 职责

- **做什么**：多行描述。
- **边界**：多行文本；与 TextField 分工明确，不要互相替代。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `问题描述` | 仅 `showLabel` 时渲染 |
| `showLabel` | boolean | `false` | 是否显示标题（同时启用边框） |
| `modelValue` | string | `现场设备出现异常噪声` | |
| `placeholder` | string | `` | |
| `disabled` | boolean | `false` | |

可见行数不是实例样式入口，统一绑定 Foundation `sizing.textarea-rows`。

## States（Playground / Contract）

- `labeled` — 显示标题
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
| `disabledOpacity` | `opacity.disabled` |
| `rows` | `sizing.textarea-rows` |

## 用法要点

1. 从 `@/design-system/components/input/Textarea.vue` 引入。
2. 默认不传 `showLabel`，得到最简洁的多行输入区域。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`。
