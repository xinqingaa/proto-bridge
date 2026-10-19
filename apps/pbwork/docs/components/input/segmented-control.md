# SegmentedControl

> 组件 id：`segmented-control` · 分类：`input`
> 实现：[SegmentedControl.vue](../../../src/design-system/components/input/SegmentedControl.vue)
> 契约：[segmented-control.json](../../../src/design-system/components/contracts/segmented-control.json)

互斥的局部模式选择，不创建视图区或导航历史。

## 职责与边界

固定使用 `role=filter`；实例身份与 Token Evidence 由 Registry 提供，业务传稳定 `inspectId`。主题值只从当前原型包解析，组件不另建明暗模式分支。

## 行为要点

- 只有未禁用的选项可以被选中；方向键、Home 与 End 支持跳过禁用项。
- `material=glass` 使用共享玻璃材质，降低透明度或无模糊支持时回退实色；默认 `solid` 保持原有表现。
- 选中项使用 roving tabindex；不拥有 viewport，data-no-swipe 防止父级横滑误触。

## States

| id | label | kind |
| --- | --- | --- |
| `month` | 按月 | `content` |
| `disabled` | 禁用 | `interaction` |
| `glass` | 玻璃 | `content` |
| `glass-disabled` | 玻璃禁用 | `interaction` |
| `compact` | 紧凑 | `variant` |

## 用法与反例

用于同一区域的有限互斥筛选；拥有内容视图区时改用 PrimaryTabs / SecondaryTabs，不把它当路由栏。

Props、Slots、Events、默认值与 Token 槽以 [SegmentedControl Contract](../../../src/design-system/components/contracts/segmented-control.json) 为准。

## 展示与组合

采用紧凑连体选择结构、等分选项与清晰选中表面。职责是局部属性/粒度选择，保持 radiogroup，不拥有 viewport；PrimaryTabs 则负责具名面板，FilterBar 表达独立筛选项。

`density="compact"` 压低可见轨道与选中底板，点击区域仍至少为 `size.touch`；文字垂直居中、保留主题圆角和材质、单选与键盘行为。高度分别消费组件键 `compact-height`、`compact-selection-height`，默认常规密度不变。
