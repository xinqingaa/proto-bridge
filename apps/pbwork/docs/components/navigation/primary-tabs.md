# 一级 Tab

> 组件 id：`primary-tabs` · 分类：`navigation`
> 实现：[PrimaryTabs.vue](../../../src/design-system/components/navigation/PrimaryTabs.vue)
> 契约：[primary-tabs.json](../../../src/design-system/components/contracts/primary-tabs.json)

当前页面的主要内容分区；每项对应一个具名内容面板，轨道和选中胶囊由中性主题表面语义表达。

## 职责与边界

- 固定使用 `role=tab-bar`，每项对应一个具名内容视图；不用于应用根目的地、局部筛选或不占主要区域的轻量分段。
- 轨道填满父容器而非视口；默认项按内容宽排列，`equal` 才平分轨道，过多时横向滚动。
- 内容视图区与水平转场由组件所有；同一物理区域只能有一个横滑 owner。
- 小圆角玻璃轨道承托一个中性选中底，材质和阴影比 Tabbar 更轻；选中项不叠加第二层背景模糊。轨道保留玻璃底色、边缘与原有内外光影；仅将浅色选中底调整为半透明白色，减少灰蓝叠色。

## 行为要点

- 轨道使用共享 GlassMaterial，外框消费 `radius.control`，选中项消费 `radius.control-compact`、`primary-tabs.selection-tint` 和轻阴影。选中文字保持中性色，与主 Tabbar 的强调色区分。
- 首次进入先按布局坐标完成选中胶囊定位，再启用后续切换动效，避免无选中面的首帧。手机预览缩放不改变胶囊尺寸。
- 点击、方向键 / Home / End 或允许的触摸/鼠标横滑进入对应具名视图；嵌套时由页面关闭其中一层横滑。
- 系统减少动效时取消位移动画，但不改变选中状态和内容 identity。

## States

| id | label | kind |
| --- | --- | --- |
| `equal` | 等宽 | `variant` |


## 用法与反例

- Playground 直接并置“自适应/等宽”两个真实视图区，不使用场景下拉。
- 不用一级 Tab 替代 Tabbar、Filter Bar 或无 viewport 的局部分段。时间周期、活动分类等业务字段不单独决定组件类型；只要形成主要具名内容面板即可使用一级 Tab。
- Props、Slots、Events、默认值与 Token 槽以 [Primary Tabs Contract](../../../src/design-system/components/contracts/primary-tabs.json) 为准。

内部 tab / panel 的语义归属由 Inspect Registry 的 `semanticParts` 显式声明，Token Evidence 沿用所属组件绑定；slot 内的业务局部节点仍须自行声明所需绑定。见[制作工具](../../prototypes/authoring-tools.md)。
