# Text Field

> 组件 id：`text-field` · 分类：`input`
> 实现：`apps/pbwork/src/design-system/components/input/TextField.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/text-field.json`

采集单行业务信息。默认 plain 无标题无描边；`showLabel` 时显示标题并启用边框。

## 职责

- **做什么**：单行业务字段。
- **边界**：单行输入；多行用 Textarea。Search Bar 封装本组件。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `标题` | 标题文案；仅 `showLabel` 时渲染 |
| `showLabel` | boolean | `false` | 是否显示标题（同时启用边框） |
| `modelValue` | string | `` | 当前值 |
| `placeholder` | string | `` | 占位文案 |
| `disabled` | boolean | `false` | 禁用 |
| `clearable` | boolean | `false` | 清除按钮（Search Bar 使用） |

## States（Playground / Contract）

- `labeled` — 显示标题
- `disabled` — 禁用

## Slots / Events

- **Slots**：`prepend-inner`、`append-inner`
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `border` | `color.border` |
| `surface` | `color.surface` |
| `radius` | `radius.md` |
| `height` | `sizing.control-md` |
| `label` | `typography.caption` |
| `input` | `typography.content` |
| `disabledOpacity` | `opacity.disabled` |

## 用法要点

1. 从 `@/design-system/components/input/TextField.vue` 引入。
2. 默认不传 `showLabel`，得到最简洁的输入区域。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`。
