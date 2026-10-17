# GroupedList

> 组件 id：`grouped-list` · 分类：`data`
> 实现：[GroupedList.vue](../../../src/design-system/components/data/GroupedList.vue)
> 契约：[grouped-list.json](../../../src/design-system/components/contracts/grouped-list.json)

带组标题的列表组合，复用 DataList 与 ListCell。

## 职责与边界

固定使用 `role=list`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 不创建滚动所有者，长列表由外层 ScrollableDataList 承担。
- group.id 与 item.id 是稳定业务身份，选择与开关事件携带 groupId 和 itemId。

## States

| id | label | kind |
| --- | --- | --- |
| `empty` | 无分组 | `content` |
| `single` | 单分组 | `content` |

## 用法与反例

提供稳定 group.id / item.id 并处理 select / toggle；组件不拥有业务存储或纵滚。长内容复用共享滚动壳，不创建第二套刷新、分页或手势。

Props、Slots、Events、默认值与 Token 槽以 [GroupedList Contract](../../../src/design-system/components/contracts/grouped-list.json) 为准。
