# Checkbox

> 组件 id：`checkbox` · 分类：`input`
> 实现：[Checkbox.vue](../../../src/design-system/components/input/Checkbox.vue)
> 契约：[checkbox.json](../../../src/design-system/components/contracts/checkbox.json)

独立布尔确认项；多选集合由多个 Checkbox 组合。

## 职责与边界

- 固定使用 `role=field`，表达一个可勾选值，不同时承担整组选择或提交职责。
- 选中填充、未选中边框和圆角均来自受控 Token 槽。
- 业务实例不能用硬编码色或自由样式覆盖选中/禁用状态。

## 行为要点

- `selectedColor` 与 `uncheckedBorderColor` 只接受 Bind 池 Token ID。
- 勾选框轮廓固定消费 `radius.xs`。
- disabled 阻止鼠标、键盘和原生提交路径，并使用 `opacity.disabled`。
- 多选语义由页面组合多个独立 Checkbox，不把数组协议塞入本组件。

## States

| id | label | kind |
| --- | --- | --- |
| `unchecked` | 未选中 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于条款确认、独立标记和多选项中的单项。
- 互斥选择使用 Radio Group；即时二态设置使用 Switch。
- Props、Slots、Events、默认值与 Token 槽以 [Checkbox Contract](../../../src/design-system/components/contracts/checkbox.json) 为准。
