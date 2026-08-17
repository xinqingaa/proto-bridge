# Tab Viewport

> 组件 id：`tab-viewport` · 分类：`navigation`
> 实现：[TabViewport.vue](../../../src/design-system/components/navigation/TabViewport.vue)
> 契约：[tab-viewport.json](../../../src/design-system/components/contracts/tab-viewport.json)

应用根目的地的独立内容视图区；负责面板保活与可选横向切换，不绘制导航。

## 职责与边界

- 固定使用 `role=tab-viewport`，拥有单一水平裁剪视口和等宽内容面板。
- Tabbar 只负责目的地导航；转场、裁剪与 keep-mounted 状态由 Tab Viewport 所有。
- 组件不绘制 Tabbar、指示器、边框或背景 surface。

## 行为要点

- `modelValue` 与 items 决定唯一可见面板，切换通过 `update:modelValue` 回传。
- `keepMounted` 保持非当前面板状态；`swipe` 与 `mouseSwipe` 分别控制触摸和鼠标手势。
- 根目的地关闭横滑，`transitionDuration` 使用 `motion.duration-instant`。
- 面板以完整视口宽度平移；相邻面板不得从裁剪边缘泄漏。

## States

| id | label | kind |
| --- | --- | --- |
| `second` | 第二屏 | `content` |
| `no-swipe` | 禁用滑动 | `interaction` |

## 用法与反例

- 与 Tabbar 共享当前目的地值；多个根 Screen 指向同一壳文件时，本组件负责面板切换。
- Props、Slots、Events、默认值与 Token 槽以 [Tab Viewport Contract](../../../src/design-system/components/contracts/tab-viewport.json) 为准。
