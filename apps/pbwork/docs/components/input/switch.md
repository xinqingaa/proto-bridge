# Switch

> 组件 id：`switch` · 分类：`input`
> 实现：[SwitchControl.vue](../../../src/design-system/components/input/SwitchControl.vue)
> 契约：[switch.json](../../../src/design-system/components/contracts/switch.json)

即时生效的二态设置控件。

## 职责与边界

- 固定使用 `role=field`，表达开/关状态；不承担表单提交或多项选择。
- 开启色和禁用透明度来自 Contract，不开放固定颜色或轨道样式入口。
- 对需要“确认后才生效”的布尔选择，优先使用 Checkbox 加提交操作。

## 行为要点

- 用户激活后立即更新布尔 `modelValue`。
- `color` 只接受 Bind 池 Token ID，禁止硬编码色值。
- disabled 阻止激活并使用 `opacity.disabled`。

## States

| id | label | kind |
| --- | --- | --- |
| `off` | 关闭 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 用于通知、自动同步等立即生效的开关设置。
- 不用 Switch 模拟互斥选项、批量多选或需要显式提交的确认项。
- Props、Slots、Events、默认值与 Token 槽以 [Switch Contract](../../../src/design-system/components/contracts/switch.json) 为准。
