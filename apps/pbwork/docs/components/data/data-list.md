# Data List

> 组件 id：`data-list` · 分类：`data`
> 实现：[DataList.vue](../../../src/design-system/components/data/DataList.vue)
> 契约：[data-list.json](../../../src/design-system/components/contracts/data-list.json)

管理列表整体的表面、分隔、圆角和可选抬升；列表项结构完全由默认 slot 定义。

## 职责与边界

- 固定使用 `role=list`，只管理列表整体 surface 与相邻项分隔。
- 不拥有纵向滚动、刷新、分页或业务行结构；这些分别属于 Scrollable Data List 和调用方。
- 容器随父级宽度伸展；surface/border/radius/elevation 不进入每个列表项内部。

## 行为要点

- plain 移除容器 surface；raised 只改变整体层级，不改变业务项内容。
- inset 只控制受控分隔缩进，不创建新列表项类型。
- 调用方可以提供 Button 或自定义业务行，但必须保留真实列表与 Evidence 语义。

## States

| id | label | kind |
| --- | --- | --- |
| `plain` | 无容器 | `variant` |
| `raised` | 抬升容器 | `variant` |

## 用法与反例

- 需要刷新/分页时组合 Scrollable Data List → Data List → 业务行。
- 不给每一行套 Card，也不把滚动、分页或行模型塞进 Data List Props。
- Props、Slots、Events、默认值与 Token 槽以 [Data List Contract](../../../src/design-system/components/contracts/data-list.json) 为准。
