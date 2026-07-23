# 原则与边界

## 1. 分层依赖

```text
Token / Theme
  → 基础组件（basic）
  → 复杂组件（complex）
  → Screen / Panel
  → Prototype（路由 + Variant + Runtime）
```

每一层只消费下一层的公开契约（props / slots / events / `tokenBindings`），不读取实现私有状态，不复制下层实现。

## 2. 升层标准

- 能被 **两个及以上** 组件或页面复用的能力，才进入共享注册表。
- 业务专用颜色、间距、组件名、页面状态 **不得** 以业务名写入共享 Token 或组件契约。
- 页面缺能力时，按序判断：已有 Token → 已有基础组件 → 已有复杂组件 → 页内局部 UI（仍须走 Token）。

## 3. 使用红线

1. **形状匹配时优先用对口 DS 组件**（AppBar、BottomNavigation、Tabs、TabViewport、DataList、ScrollableDataList、Dialog、Sheet、Snackbar、EmptyState、SearchBar、FilterBar 等）。  
   - 筛选条：标准一排 chip + 筛选入口 → 优先 `FilterBar`；自定义 Chip 行合法，须加 `data-no-swipe`（横滑场景）。  
   - 卡片：仅当容器承载**独立交互模块**时用 `Card`；列表行、英雄区装饰默认不是 Card。  
   - 无对口或形状明显不符 → 页内局部 UI，仍走 Token。
2. **页内局部 UI** 的颜色 / 字体 / 间距 / 圆角 / 阴影必须走现有 Token（`var(--pb-*)`），禁止硬编码设计值（极少数位图/SVG 装饰除外，且不得引入业务色名 Token）。
3. **禁止组件实例换绑 Token**。切浅色/深色只改 Theme 覆盖值。
4. **Playground 只调** 内容、类型枚举、行为开关；不提供 Token 换绑或自由取色。
5. **BottomNavigation 不做面板容器、不做手势**；一级多面板用 `TabViewport`。
6. **一级主体 Tab 的子视图内禁止再嵌套带 window 的 `Tabs`**；二级栈页允许。维度切换用无 window 分段（见 recipes R7）。
7. **列表外观与滚动分离**：`DataList` 只管表面；`ScrollableDataList` 管刷新/分页/纵滚。
8. **禁止页内自造一套横滑/下拉手势**；复用 `_shared/usePointerSwipe`、`useHorizontalDragScroll` 与 ScrollableDataList 已有仲裁（见 [shared-gestures.md](./components/shared-gestures.md)）。
9. **导航与主题**：多 Tab + 栈须遵守 [shell-and-nav.md](./prototypes/shell-and-nav.md) 与 [tokens/themes.md](./tokens/themes.md)；`theme` 不是业务 Variant。

## 4. 与 Vuetify

Vue + Vuetify 是实现技术。对外契约以 PB `contracts/*.json` 与 `--pb-*` 为准；不要把 Vuetify 私有 class / 主题键当作跨端或文档权威。

## 5. 与 ProtoBridge 识别

组装页面时满足 [`docs/conventions.md`](../../../docs/conventions.md) 的结构角色与标记；本手册补「用哪个组件、如何组合」。检查器依赖稳定的 `data-pb-id` / `inspectId` / `data-pb-role`。

## 6. 文档演进

本手册只沉淀**已稳定的通用规则**。业务原型的视觉与布局可继续打磨；新的可复用规范确认后再写入此处，避免把未定稿的 UI 口味写成铁律。
