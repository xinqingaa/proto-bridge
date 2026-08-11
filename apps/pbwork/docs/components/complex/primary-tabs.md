# 一级 Tab

> 组件 id：`primary-tabs` · 契约：`contracts/primary-tabs.json`

页面内的主分区导航，轨道和选中胶囊均由主题语义表面令牌提供颜色。

## 职责与边界

- 用于同一页面的第一层内容分区；每项对应一个具名内容视图。
- 轨道使用 `color.surface-variant`，当前项使用 `color.surface-selected`，并以 `border.hairline` 和 `elevation.level-1` 分隔层级；两者均为中性浅灰表面。组件 CSS 不写固定色、fallback 色或渐变。
- 可按页面决定是否接受横滑；同一触摸区域只能有一个横滑 owner。
- 不作为应用根目的地导航，也不作为只改变数据集合的筛选条。

## 状态与动效

`equal` 是等宽排列的外观状态。选中项在轨道中水平移动；系统要求减少动效时取消位移动画。Playground 直接点选或横滑查看内容切换。
