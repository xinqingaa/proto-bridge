# Filter Bar

> 组件 id：`filter-bar` · 分类：`navigation`
> 实现：[FilterBar.vue](../../../src/design-system/components/navigation/FilterBar.vue)
> 契约：[filter-bar.json](../../../src/design-system/components/contracts/filter-bar.json)

三级 Tab：只改变当前数据集合的快捷筛选，不拥有内容视图区。

## 职责与边界

- 固定使用 `role=filter`，选择项只改变数据，不创建或切换 Tab viewport。
- 不内置右侧高级筛选入口；需要额外操作时由页面与其它控件组合。
- 筛选项可以横向滚动，但必须向父级横滑 owner 正确让权。

## 行为要点

- 选择筛选项后更新受控值，由页面重新计算当前数据集合。
- 横向拖动只滚动筛选项，不触发一级/二级内容视图切换。
- 组件不持有业务数据、请求或结果区域。

## States

| id | label | kind |
| --- | --- | --- |
| `all` | 全部 | `content` |

## 用法与反例

- 用于“全部/待处理/已完成”等只影响列表集合的快捷筛选。
- 不用 Filter Bar 承载具名内容视图；需要视图区时使用一级或二级 Tab。
- Props、Slots、Events、默认值与 Token 槽以 [Filter Bar Contract](../../../src/design-system/components/contracts/filter-bar.json) 为准。
