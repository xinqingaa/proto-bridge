# 页面转场

> 组件 id：`screen-transition` · 分类：`navigation`
> 实现：[ScreenTransition.vue](../../../src/design-system/components/navigation/ScreenTransition.vue)
> 契约：[screen-transition.json](../../../src/design-system/components/contracts/screen-transition.json)

栈级页面转场容器。换 Screen 时播放进入或返回动画，不拥有路由表、手势或业务页面。

## 职责与边界

- 装饰性组件：不写 `data-pb-id` / `data-pb-role`，不进入 Evidence。
- 只根据 `navigation` 与 `mode` 给当前页加上转场；`screenKey` 变化时切换页面。
- 不提供边缘返回或其它手势。同屏只改 Variant 时 `screenKey` 不变，不播放。

## 行为要点

- `push` 与换页的 `replace` 播进入动画；`back` 播返回动画。同一主壳内的根 Tab 切换不换 `screenKey`，因此不播。
- 首次挂载只有一页，以及 `prefers-reduced-motion: reduce`，瞬间切换。
- 默认 `mode=ios`：新页从右侧滑入，返回时当前页向右滑出。
- `mode=android`：新页淡入并轻微缩放（Fade Through），不使用水平滑入。
- Runtime 默认 iOS；模式不进入 URL 或 Case identity。Capture 环境强制 reduced-motion，截图仍为静帧。
- Playground 主预览并置 iOS / Android，共用同一手机视口，只用进入、返回观察，不另铺静态状态。

## States

| id | label | kind |
| --- | --- | --- |
| `android` | Android 淡入 | `variant` |
| `push` | 进栈 | `content` |
| `back` | 返回 | `content` |

## 用法与反例

- 由 Runtime 包住当前 Screen：`screenKey` 用已加载的 view，`navigation` 用路由意图。
- 同屏 Overlay / 空态等 Variant 不要为了播动画去改 `screenKey`。
- 不要在页面里再包一层平行转场，也不要把 TabViewport 横滑当成栈动画。
- Props、Slots、Events、默认值与 Token 槽以 [页面转场 Contract](../../../src/design-system/components/contracts/screen-transition.json) 为准。
