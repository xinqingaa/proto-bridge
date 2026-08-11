# 嵌套手势与滚动仲裁

> 纯 Web 没有 Flutter Gesture Arena。一级横滑 + 下拉刷新 + 嵌套横滚必须在 DS 层统一仲裁，业务页只组合。

实现锚点：

- `components/_shared/usePointerSwipe.ts` — 一级 Tab / 二级 Tab / TabViewport
- `components/_shared/useHorizontalDragScroll.ts` — 嵌套横向条
- `components/complex/ScrollableDataList.vue` — 纵滚 / 下拉 / 触底 / 鼠标拖滚
- 测试：`apps/pbwork/test/pointer-gestures.test.ts`

无 window 分段须带 `data-no-swipe`（共享忽略表另含 `.pb-filter-bar`、`.period-segment` 等约定 class）。

## 为什么不能页内各写一套

浏览器默认拥有原生 pan；Pointer 在触屏平移时可能被 cancel；拖完会合成 click。组件各自 `preventDefault` 会必然打架。仲裁必须集中。

## 总决策表

1. 起点在忽略区 → 父级 Tab **不处理**
   - 选择器含：`input/textarea/select/[contenteditable]`、`[data-no-swipe]`、`[data-gesture-ignore]`、`.pb-filter-bar`、`.period-segment`
2. 起点在 `[data-horizontal-scroll]` 且 `scrollWidth > clientWidth` → 父级 Tab **整次忽略**（含边缘外拖）；子级 `useHorizontalDragScroll` 接管
3. 否则轴锁定（位移 ≥ 8px）：
   - 横向 → 当前拥有手势的一级 Tab、二级 Tab 或 TabViewport 翻页
   - 纵向 → 列表原生滚；仅 **开始时在顶部且向下** → 下拉刷新
4. `swipe` 只控制 touch/pen；`mouseSwipe` 只控制 mouse；**不可互兜底**
5. 确认横向后才 `setPointerCapture` + `preventDefault`；纵向则释放，让给列表
6. 有效拖动（≥ 8px）后 ~450ms 内 capture 阶段抑制 click

## 双事件路径（触屏）

Chrome 设备模拟与真机常在原生平移开始后取消 Pointer Events：

| 能力     | Pointer                              | Touch（非被动边界）                           |
| -------- | ------------------------------------ | --------------------------------------------- |
| Tab 横滑 | mouse/pen；touch 的 pointer 路径不抢 | 独立 touch；仅横向锁轴后 `preventDefault`     |
| 下拉刷新 | mouse（需 `pullRefresh.mouse`）      | 独立 touch；仅顶部确认下拉后 `preventDefault` |

表面 CSS：`touch-action: pan-y`（纵给浏览器，横由 JS）。

## ScrollableDataList

- `pullRefresh` / `loadMore` / `dragScroll`：布尔或配置对象
- 轴变横向 → 立刻取消，不与 Tab 抢
- 触底 IntersectionObserver + `loadRequested` 锁；`loadingMore` 结束后解锁
- `dragScroll`：鼠标拖 `scrollTop`，可选动量；滚轮保持原生
- 父级有本组件时：`overflow: hidden`，本组件为唯一纵滚

## 嵌套横滚取舍

**有溢出则边界外拖也不接力父级翻页。** Web 上「滑到头再外拖翻父 Tab」极难做稳；当前规范明确不做。

## 一级 / 二级 Tab 的 fill

短内容面板也要可滑：`fill` 撑满剩余高度，空白区仍属可滑动面板。

## 反模式

- 过早 pointer capture
- 只绑 Pointer、不补 Touch
- 两个相邻层级同时接管同一横滑区域
- 双滚动容器导致 `scrollTop===0` 失效
- 页内复制手势逻辑
- 用整块 `pointer-events: none`「防误触」
- 期望横条滑到头接力翻父页

## 验收

- 纵滚不误触横滑；横滑不触发刷新
- 刷新仅顶部；触底不并发
- 有溢出横条可拖；无溢出时父级可翻页
- 拖后不误进详情
- 外层刷新 + 内层一级/二级 Tab 可并存
- Tabbar 点击与上方视图区使用同一当前位置
- 状态页已关闭下拉刷新/分页
- 一级/二级 Tab `fill` 时父级高度链完整（见 recipes R3）

更短的实现笔记若写在业务原型目录，不得与本手册冲突；冲突以本手册与 contract 为准。
