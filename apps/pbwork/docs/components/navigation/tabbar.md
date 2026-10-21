# Tabbar

> 组件 id：`tabbar` · 分类：`navigation`
> 实现：[Tabbar.vue](../../../src/design-system/components/navigation/Tabbar.vue)
> 契约：[tabbar.json](../../../src/design-system/components/contracts/tabbar.json)

应用根目的地导航；底部只负责当前位置和目的地切换。

## 职责与边界

- 固定使用 `role=bottom-bar`，适用于 2–5 个应用根目的地。
- Tabbar 不拥有内容视图区、转场或横滑；上方内容使用 Tab Viewport。
- 固定同时展示图标与文字，选中态使用一个连续移动的薄玻璃底，不增加顶部指示器。
- 小圆角浮动容器保留外侧和安全区留白，所有目的地始终均分轨道，不提供自适应模式。外框使用 `radius.surface`，选中底使用 `radius.control`。

## 行为要点

- 点击无 ripple 并立即切换受控当前位置。
- 主体使用共享玻璃材质；选中底消费 `tabbar.selection-tint`，仅叠加透明填色、高光和阴影，避免重复模糊。图标与文字通过 `tabbar.active` 强调。
- 点击与键盘切换驱动同一选中底滑动并调整宽度；首次定位、容器缩放和文字变化重新测量。方向键与 Home/End 支持循环选择，减少动态效果时取消动画。
- 图标、文字、触控目标、底栏高度和边界全部消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `tasks-selected` | 任务选中 | `content` |


## 用法与反例

- 页面壳用同一 value 连接 Tabbar 与 Tab Viewport。
- Props、Slots、Events、默认值与 Token 槽以 [Tabbar Contract](../../../src/design-system/components/contracts/tabbar.json) 为准。

## 手机预览

预览直接占满手机内容区，通过 TabViewport 承接首页、任务、我的三个目的地；Tabbar 固定在手机底部，内容可从其下方滚过。点击导航切换真实面板，各面板保留自己的滚动状态，不再嵌套小型展示框。

选中底与交互项的圆角由 `radius.surface - spacing.xs` 推导，最低为零，使内外轮廓与实际内边距一致；不使用独立的全局 `radius.control`。
