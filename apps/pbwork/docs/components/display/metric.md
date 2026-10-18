# Metric

> 组件 id：`metric` · 分类：`display`
> 实现：[Metric.vue](../../../src/design-system/components/display/Metric.vue)
> 契约：[metric.json](../../../src/design-system/components/contracts/metric.json)

数字、单位、说明与变化量的只读指标。

## 职责与边界

固定使用 `role=summary`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 变化以正负文字和颜色共同表达，零为持平；省略 change 时不渲染变化。
- 指标不假设上涨必然是好事；业务可在外层解释统计口径。

## States

| id | label | kind |
| --- | --- | --- |
| `decrease` | 下降 | `content` |
| `unchanged` | 持平 | `content` |

## 用法与反例

用于一个数字、单位与可选百分比变化；未提供 change 时隐藏变化量，0 则显示持平。不要用颜色代替变化文字。

Props、Slots、Events、默认值与 Token 槽以 [Metric Contract](../../../src/design-system/components/contracts/metric.json) 为准。

## 展示与组合

主值采用数字展示字阶，单位、变化与说明分层，保留调用方提供的真实值和正负变化语义。
