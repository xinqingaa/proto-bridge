# Radio Group

> 组件 id：`radio-group` · 分类：`input`
> 实现：[RadioGroup.vue](../../../src/design-system/components/input/RadioGroup.vue)
> 契约：[radio-group.json](../../../src/design-system/components/contracts/radio-group.json)

在一组明确选项中进行互斥单选。

## 职责与边界

- 固定使用 `role=field`，拥有整组值和选项语义。
- 只处理互斥选择，不用于多个独立布尔值或即时开关。
- 选中色与禁用外观均来自 Contract Token 槽。

## 行为要点

- 选择新项时更新唯一 `modelValue`，同组其它项同时取消选中。
- `color` 只接受 Bind 池 Token ID，禁止硬编码色值。
- disabled 阻止整组交互并使用 `opacity.disabled`。

## States

| id | label | kind |
| --- | --- | --- |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于配送方式、优先级等有限且互斥的业务选择。
- 多选使用 Checkbox 组合；单一即时设置使用 Switch。
- Props、Slots、Events、默认值与 Token 槽以 [Radio Group Contract](../../../src/design-system/components/contracts/radio-group.json) 为准。
