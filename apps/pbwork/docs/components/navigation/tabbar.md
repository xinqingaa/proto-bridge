# Tabbar

> 组件 id：`tabbar` · 分类：`navigation`
> 实现：[Tabbar.vue](../../../src/design-system/components/navigation/Tabbar.vue)
> 契约：[tabbar.json](../../../src/design-system/components/contracts/tabbar.json)

应用根目的地导航；底部只负责当前位置和目的地切换。

## 职责与边界

- 固定使用 `role=bottom-bar`，适用于 2–5 个应用根目的地。
- Tabbar 不拥有内容视图区、转场或横滑；上方内容使用 Tab Viewport 或路由。
- 固定同时展示图标与文字，选中态不增加顶部指示器或独立胶囊。
- 默认等宽填满应用壳；`grow=false` 时才按内容自适应排列。

## 行为要点

- 点击无 ripple 并立即切换受控当前位置。
- 选中只使用 `color.navigation-active` 与受控强调字重表达。
- 图标、文字、触控目标、底栏高度和边界全部消费 Contract Token。

## States

| id | label | kind |
| --- | --- | --- |
| `tasks-selected` | 任务选中 | `content` |
| `adaptive` | 自适应 | `variant` |

## 用法与反例

- 页面壳用同一 value 连接 Tabbar 与 Tab Viewport/路由内容。
- 不用 Tabbar 模拟页内一级 Tab，也不让它同时管理面板和横滑。
- Props、Slots、Events、默认值与 Token 槽以 [Tabbar Contract](../../../src/design-system/components/contracts/tabbar.json) 为准。
