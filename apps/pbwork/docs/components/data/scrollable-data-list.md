# Scrollable Data List

> 组件 id：`scrollable-data-list` · 分类：`data`
> 实现：[ScrollableDataList.vue](../../../src/design-system/components/data/ScrollableDataList.vue)
> 契约：[scrollable-data-list.json](../../../src/design-system/components/contracts/scrollable-data-list.json)

唯一纵向滚动壳，集中处理刷新、分页、可选鼠标拖滚和禁用交互。

## 职责与边界

- 固定使用 `role=scroll-list`，拥有唯一纵向滚动容器；父级应关闭第二个主纵滚。
- 刷新位于顶部越界区，加载更多位于内容尾部观察区；业务内容结构保持调用方所有。
- 不透传 Data List 的 surface/rounded 等 Props；需要列表表面时在内部显式组合 Data List。
- loading/empty/error 整页态应关闭不适用的刷新和分页手势。

## 行为要点

- refreshing、loadingMore 和 hasMore 都是业务受控状态，组件只发出刷新/加载请求。
- disabled 时不触发刷新、加载更多或鼠标拖滚，并使用 `opacity.disabled`。
- 下拉刷新使用统一阈值和最大距离；触底观察、手动重试与鼠标拖滚共享集中手势仲裁。
- 拖动后抑制合成 click，不通过整块 `pointer-events:none` 破坏子项交互。

## States

| id | label | kind |
| --- | --- | --- |
| `refreshing` | 刷新中 | `interaction` |
| `loading-more` | 加载更多 | `interaction` |
| `complete` | 没有更多 | `content` |
| `disabled` | 禁用交互 | `interaction` |

## 用法与反例

- 标准组合是 Scrollable Data List → 页面头/筛选 → Data List → 业务行。
- 不在业务页复制下拉刷新、触底观察或拖滚；也不让父级保留第二个主纵滚。
- Props、Slots、Events、默认值与 Token 槽以 [Scrollable Data List Contract](../../../src/design-system/components/contracts/scrollable-data-list.json) 为准。
