# 二级 Tab

> 组件 id：`secondary-tabs` · 分类：`navigation`
> 实现：[SecondaryTabs.vue](../../../src/design-system/components/navigation/SecondaryTabs.vue)
> 契约：[secondary-tabs.json](../../../src/design-system/components/contracts/secondary-tabs.json)

页面内第二层内容分区；当前项以激活文字和居中朝上的小三角标识。

## 职责与边界

- 固定使用 `role=tab-bar`，每项对应具名内容视图；分段筛选使用 Filter Bar。
- 轨道填满父容器，默认按内容宽排列，`equal` 才平分，过多时横向滚动。
- 内容视图区与水平转场由组件所有；与一级 Tab 嵌套时同一区域只保留一个横滑 owner。
- 当前项不使用宽滑线、胶囊、额外 surface 或 ripple。

## 行为要点

- 当前项只使用中性激活色、受控字重和与文字中心对齐的朝上小三角。
- 点击以及允许的触摸/鼠标横滑进入对应具名视图。
- 系统减少动效时取消位移动画，不改变内容和选中语义。

## States

| id | label | kind |
| --- | --- | --- |
| `equal` | 等宽 | `variant` |

## 用法与反例

- Playground 并置自适应/等宽真实视图区；页面负责嵌套横滑仲裁。
- 不用二级 Tab 做应用根导航、简单数据筛选或无 window 的维度分段。
- Props、Slots、Events、默认值与 Token 槽以 [Secondary Tabs Contract](../../../src/design-system/components/contracts/secondary-tabs.json) 为准。
