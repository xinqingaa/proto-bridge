# Card

> 组件 id：`card` · 分类：`display`
> 实现：[Card.vue](../../../src/design-system/components/display/Card.vue)
> 契约：[card.json](../../../src/design-system/components/contracts/card.json)

只提供背景、边框、圆角与可选抬升的单层 surface。

## 职责与边界

- Card 不拥有标题、副标题、指标、表单、点击行为或任何业务摘要类型；所有内容来自默认 slot。
- semantic policy 为 contextual；调用方只可按真实上下文选择 `section`、`card` 或 `summary`。
- 组件只建立一个内容容器，不插入固定标题区、操作区或内部网格。
- 默认边框和可选 elevation 只作用于整体 surface，不叠加业务状态装饰。

## 行为要点

- flat/elevated 只改变 surface 层级，不改变 slot 内容、职责或语义 identity。
- 标题、说明、指标、列表和表单由页面用语义化结构组织。
- 需要点击时由调用方提供真实 Button/Action，不让整个 Card 隐式成为无名按钮。

## States

| id | label | kind |
| --- | --- | --- |
| `flat` | 平面 | `variant` |
| `elevated` | 抬升 | `variant` |

## 用法与反例

- 用于独立内容 surface；列表整体 surface 优先使用 Data List。
- 不新增“摘要卡、指标卡、表单卡”等 Card type；这些是 slot 内容组织。
- Props、Slots、Events、默认值与 Token 槽以 [Card Contract](../../../src/design-system/components/contracts/card.json) 为准。
