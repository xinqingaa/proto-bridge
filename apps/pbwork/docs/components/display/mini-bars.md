# MiniBars

> 组件 id：`mini-bars` · 分类：`display`
> 实现：[MiniBars.vue](../../../src/design-system/components/display/MiniBars.vue)
> 契约：[mini-bars.json](../../../src/design-system/components/contracts/mini-bars.json)

紧凑柱形对比，零值、空集合与数值标签均可辨识。

## 职责与边界

固定使用 `role=chart`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 按非负有限值归一，负值和非法值按零；不把零画成正值。
- 每项使用稳定 id，原始数值保留在可访问文本中；不承担复杂图表交互。

## States

| id | label | kind |
| --- | --- | --- |
| `empty` | 无数据 | `content` |
| `zero` | 零值 | `content` |

## 用法与反例

用于小规模序列的概览；值不大于零时条高为零，原始值仍可读；需要轴、缩放或复杂图表时用原型自有图表。

Props、Slots、Events、默认值与 Token 槽以 [MiniBars Contract](../../../src/design-system/components/contracts/mini-bars.json) 为准。

## 展示与组合

图表使用独立 plot 尺度而非头像尺寸，柱宽受控并保留零值真实高度；默认示例为完整七日。图例文案与样本数量一致，空/零值仍可辨识。
