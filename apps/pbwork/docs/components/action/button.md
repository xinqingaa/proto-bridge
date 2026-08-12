# Button

> 组件 id：`button` · 分类：`action`
> 实现：[Button.vue](../../../src/design-system/components/action/Button.vue)
> 契约：[button.json](../../../src/design-system/components/contracts/button.json)

表单主次操作；色槽走 Token-ref，loading 保留文案，disabled 统一使用禁用透明度。

## 职责与边界

- 用于提交、确认、保存和空态 CTA；纯图标操作使用 Icon Button。
- 固定语义为 `role=button`，业务实例仍需提供稳定 `inspectId`。
- 外观由有限 Token-ref 色槽表达，不向调用方开放自由样式、固定色或实现层 variant 枚举。

## 行为要点

- `bgColor`、`borderColor`、`textColor` 只接受 Bind 池 Token ID 或允许的绑定字面量，禁止实例硬编码色值。
- 未传边框色时跟随背景色；未传文字色时根据背景语义推导配对前景色。
- loading 时阻止重复触发，spinner 与文案同时可见，并保持操作强调度。
- disabled 才使用 `opacity.disabled`；loading 不得伪装成 disabled。
- 默认主操作消费 `color.action` 及其配对前景/边框语义。

## States

| id | label | kind |
| --- | --- | --- |
| `loading` | 加载 | `interaction` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

- 需要软底、描边或透明观感时组合受控 Token 槽，不新增任意 CSS/颜色参数。
- 不用 Button 模拟 Icon Button、Tab、Chip 或导航目的地。
- Props、Slots、Events、默认值与 Token 槽以 [Button Contract](../../../src/design-system/components/contracts/button.json) 为准。
