# SegmentedControl

> 组件 id：`segmented-control` · 分类：`input`
> 实现：[SegmentedControl.vue](../../../src/design-system/components/input/SegmentedControl.vue)
> 契约：[segmented-control.json](../../../src/design-system/components/contracts/segmented-control.json)

互斥的局部模式选择，不创建视图区或导航历史。

## 职责与边界

固定使用 `role=filter`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 只有未禁用的选项可以被选中；方向键、Home 与 End 支持跳过禁用项。
- 选中项使用 roving tabindex；不拥有 viewport，data-no-swipe 防止父级横滑误触。

## States

| id | label | kind |
| --- | --- | --- |
| `month` | 按月 | `content` |
| `disabled` | 禁用 | `interaction` |

## 用法与反例

用于同一区域的有限互斥筛选；拥有内容视图区时改用 PrimaryTabs / SecondaryTabs，不把它当路由栏。

Props、Slots、Events、默认值与 Token 槽以 [SegmentedControl Contract](../../../src/design-system/components/contracts/segmented-control.json) 为准。
