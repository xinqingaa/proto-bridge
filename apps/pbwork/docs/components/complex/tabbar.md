# Tabbar

> 组件 id：`tabbar` · 契约：`contracts/tabbar.json`

应用最根本的目的地导航；视图区始终位于它上方。

## 职责与边界

- 只表达 2–5 个应用根目的地和当前位置。
- 每项始终同时呈现图标与文字；图标尺寸固定绑定 `sizing.icon-md`，选中用 `color.navigation-active` 和 `typography.caption-strong` 表达。
- 不显示顶部指示器；点击无 ripple 反馈，直接更新当前位置。
- 不承载内容、转场或横滑手势。
- 不用于页面内分区、筛选或临时操作。
- 填满、焦点内缩、内容层级与无反馈覆盖层分别消费 `layout.fill`、`layout.focus-inset`、`layer.content`、`opacity.hidden`；不在组件 CSS 中写数值。

## 组合

页面壳把 Tabbar 与上方 TabViewport 或路由内容绑定到同一当前位置。根目的地默认通过点击切换，避免与页内一级、二级 Tab 争夺横滑手势。

## 状态

`tasks-selected` 是当前目的地变为任务的内容状态。切换时更新上方视图区。Playground 使用完整“视图区在上、Tabbar 在下”的互动场景。
