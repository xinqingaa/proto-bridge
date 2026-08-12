# Badge

> 组件 id：`badge` · 分类：`display`
> 实现：[Badge.vue](../../../src/design-system/components/display/Badge.vue)
> 契约：[badge.json](../../../src/design-system/components/contracts/badge.json)

只读数量、状态或严重度徽标。

## 职责与边界

- 固定使用 `role=badge`，只表达紧凑状态，不承担选择、筛选或提交交互。
- tone 是有限状态语义，不是业务页面自由选色入口。
- 复杂说明、操作或多段内容应由调用方另行组织。

## 行为要点

- 状态变化只切换 Contract 允许的 tone 和文本，不把 Badge 变成可点击 Chip。
- 标签保持短而单义；需要辅助说明时使用独立文本 Evidence 节点。
- 视觉尺寸、圆角、字阶和配色全部来自 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `success` | 成功 | `variant` |
| `warning` | 警告 | `variant` |

## 用法与反例

- 用于数量、严重度、只读状态；选择标签使用 Chip 或 Filter Bar。
- 不给 Badge 添加点击事件，也不使用任意颜色创造 Contract 外 tone。
- Props、Slots、Events、默认值与 Token 槽以 [Badge Contract](../../../src/design-system/components/contracts/badge.json) 为准。
