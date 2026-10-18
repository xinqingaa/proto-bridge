# Heatmap

> 组件 id：`heatmap` · 分类：`display`
> 实现：[Heatmap.vue](../../../src/design-system/components/display/Heatmap.vue)
> 契约：[heatmap.json](../../../src/design-system/components/contracts/heatmap.json)

按周分列的日强度图，以日期保持稳定身份。

## 职责与边界

固定使用 `role=chart`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 以 UTC 日期补齐中间日期并按周一到周日排列，单次最多展示 366 天。
- 缺失日期不伪装为观测到的零值；日期与原始值用可访问名称说明。
- 点击或键盘选择日期只发出受控值，颜色之外保留数值文本。

## States

| id | label | kind |
| --- | --- | --- |
| `empty` | 无数据 | `content` |
| `selected` | 已选择 | `content` |

## 用法与反例

按 UTC 日期分周排列，缺测日与数值 0 分开表达；最多从首日显示 366 天，调用方应先选定范围。不要把它当可无限加载的日历或把缺测补成零。

Props、Slots、Events、默认值与 Token 槽以 [Heatmap Contract](../../../src/design-system/components/contracts/heatmap.json) 为准。

## 展示与组合

提供星期、月份定位、强度图例及所选日期真实数值。按日期排列，缺失与零值保持区别；范围较长时横向滚动，不能为了填满宽度改变日期顺序。选中描边留在格子内部，横向滚动不裁掉格子边缘。
