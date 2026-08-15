# Text Field

> 组件 id：`text-field` · 分类：`input`
> 实现：[TextField.vue](../../../src/design-system/components/input/TextField.vue)
> 契约：[text-field.json](../../../src/design-system/components/contracts/text-field.json)

单行文本输入；默认是无标题、无描边的 plain 形态，并支持密码显隐、自动填充和字段错误。

## 职责与边界

- 固定使用 `role=field`，只处理单行输入、错误反馈与禁用状态。
- `showLabel=false` 时不渲染标题且不绘制边框；`showLabel=true` 同时启用标题和边框。
- 密码仍属于单行文本职责；`type=password + revealable` 使用统一 Lucide 眼睛图标，不由业务页复制。
- 搜索上下文使用 Search Bar；多行内容使用 Textarea。

## 行为要点

- 默认 plain 形态仍保留可聚焦、可编辑和可访问名称，不依赖边框证明输入能力。
- labeled 形态把 label 与输入绑定，并使用 Contract 边框/间距语义。
- 密码默认隐藏；显示与隐藏只改变呈现类型，不改变当前值。
- `errorMessage` 同时建立字段错误状态和就近可访问说明。
- autocomplete 只接受 Contract 内的姓名、账号、当前密码、新密码或关闭枚举。
- disabled 时不可聚焦或编辑，整体使用 `opacity.disabled`。
- 错误文案属于字段反馈，不通过固定红色或业务页伪元素重做。

## States

| id | label | kind |
| --- | --- | --- |
| `labeled` | 显示标题 | `variant` |
| `password` | 密码输入 | `variant` |
| `error` | 字段错误 | `interaction` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于姓名、编号、账号和密码等单行文本；上下文已有明确标题时保持 plain。
- 不在业务页复制边框、label 或错误布局，也不把 `showLabel` 当作纯视觉旋钮。
- Props、Slots、Events、默认值与 Token 槽以 [Text Field Contract](../../../src/design-system/components/contracts/text-field.json) 为准。
