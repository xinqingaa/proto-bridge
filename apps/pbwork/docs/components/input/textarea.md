# Textarea

> 组件 id：`textarea` · 分类：`input`
> 实现：[Textarea.vue](../../../src/design-system/components/input/Textarea.vue)
> 契约：[textarea.json](../../../src/design-system/components/contracts/textarea.json)

多行文本输入；默认是无标题、无描边的 plain 形态，填充使用内凹表面。

## 职责与边界

- 固定使用 `role=field`，用于备注、说明和其它多行自由文本。
- `showLabel=false` 时不渲染标题、不绘制边框，填充 `color.surface-recessed`；`showLabel=true` 同时启用标题和边框。
- 默认可见行数来自语义 Token，不由业务页面传入固定高度绕过 Contract。

## 行为要点

- plain 与 labeled 共享同一输入、错误和可访问性行为，只改变受控结构状态。
- disabled 时不可聚焦或编辑，整体使用 `opacity.disabled`。
- 长内容由输入自身处理，不把页面主滚动职责转移给组件内部自由高度逻辑。

## States

| id | label | kind |
| --- | --- | --- |
| `labeled` | 显示标题 | `variant` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于处理说明、备注等多行内容；短单行值使用 Text Field。
- 不在业务页写固定 rows、高度、边框或错误色来制造平行 Textarea。
- Props、Slots、Events、默认值与 Token 槽以 [Textarea Contract](../../../src/design-system/components/contracts/textarea.json) 为准。
