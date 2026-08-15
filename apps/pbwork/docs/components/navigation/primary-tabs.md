# 一级 Tab

> 组件 id：`primary-tabs` · 分类：`navigation`
> 实现：[PrimaryTabs.vue](../../../src/design-system/components/navigation/PrimaryTabs.vue)
> 契约：[primary-tabs.json](../../../src/design-system/components/contracts/primary-tabs.json)

当前页面的主要内容分区；每项对应一个具名内容面板，轨道和选中胶囊由中性主题表面语义表达。

## 职责与边界

- 固定使用 `role=tab-bar`，每项对应一个具名内容视图；不用于应用根目的地、局部筛选或不占主要区域的轻量分段。
- 轨道填满父容器而非视口；默认项按内容宽排列，`equal` 才平分轨道，过多时横向滚动。
- 内容视图区与水平转场由组件所有；同一物理区域只能有一个横滑 owner。
- recessed 轨道上只悬浮一个无描边的半透明 glass selection，不增加第二道表面或高对比轮廓。

## 行为要点

- 轨道消费 `color.surface-recessed`，当前项消费 `color.surface-selected`、glass opacity/elevation/effect。
- 首次进入先完成选中胶囊定位，再启用后续切换动效，避免无选中面的首帧。
- 点击或允许的触摸/鼠标横滑进入对应具名视图；嵌套时由页面关闭其中一层横滑。
- 系统减少动效时取消位移动画，但不改变选中状态和内容 identity。

## States

| id | label | kind |
| --- | --- | --- |
| `equal` | 等宽 | `variant` |

## 用法与反例

- Playground 直接并置“自适应/等宽”两个真实视图区，不使用场景下拉。
- 不用一级 Tab 替代 Tabbar、Filter Bar 或无 viewport 的局部分段。时间周期、活动分类等业务字段不单独决定组件类型；只要形成主要具名内容面板即可使用一级 Tab。
- Props、Slots、Events、默认值与 Token 槽以 [Primary Tabs Contract](../../../src/design-system/components/contracts/primary-tabs.json) 为准。
