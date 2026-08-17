# 页面配方规范

标准页面结构与组合规则。实现时只使用 DS 注册组件与共享手势；**不要**依赖某个业务原型目录是否存在。

相关总则见 [composition.md](../components/composition.md)、[shell-and-nav.md](./shell-and-nav.md)、[shared-gestures.md](../components/shared-gestures.md)、[screens-and-variants.md](./screens-and-variants.md)。

---

## R1 — Tabbar 根目的地

**适用**：应用有 2–5 个根目的地，底栏点击切换，视图区位于上方。

**必须**：

```text
（可选）AppBar
TabViewport（items + v-model + keepMounted；根目的地默认关闭 swipe / mouseSwipe）
  └─ #item → 各面板内容
Tabbar（同一当前位置）
```

- 每个根目的地注册独立 Screen，`view` 指向同一壳文件。
- 壳内 `Tabbar` 与 `TabViewport` 共用当前位置；TabViewport `keepMounted`，关闭横滑，时长 `motion.duration-instant`。
- 切 Tab 用 `replace` 更新 home slug；Runtime 保持已加载 view，面板即时切换。
- **AppBar 可选**：一级最大导航页可以没有顶栏。
- UI 先更新，URL `replace` 须节流；各保活面板只消费自己 home 的 variant（见 screens-and-variants）。
- History / 返回语义见 [shell-and-nav.md](./shell-and-nav.md)。

**禁止**：

- 让 Tabbar 兼任面板壳。

**面板内列表**：需要刷新/分页时用 R1 + R6，不要在面板内自造滚动壳。

---

## R2 — 嵌套横向滚动条

**适用**：面板或页面内有一排可横向拖动的卡片/入口。

**必须**：

```text
容器[data-horizontal-scroll] + useHorizontalDragScroll
  └─ 横向子项（按钮或链接）
```

- 仅当 `scrollWidth > clientWidth` 时子级独占横向手势（含边界外拖）。
- 无横向溢出时，拥有横滑权的一级/二级 Tab 或 `TabViewport` 才可翻页。

**禁止**：

- 页内自写一套拖滚逻辑。
- 假设「滑到头再外拖会接力翻父级 Tab」（当前规范不支持）。

---

## R3 — 一级或二级 Tab + 外层纵滚/刷新

**适用**：栈页或非一级主体内，需要多分段内容，且整页需要下拉刷新或统一纵滚。

**必须**：

```text
栈页壳（AppBar + 返回）
└─ ScrollableDataList（pullRefresh 等按需）
     └─ 一级或二级 Tab（fill + swipe / mouseSwipe；内容进具名 slot）
          └─ 各分段 → DataList / EmptyState / 业务块
```

- 外层管纵向滚动与刷新；内层一级或二级 Tab 管横滑。
- 短内容必须开 `fill`。
- **高度链**：Shell → 主列 → ScrollableDataList → Tab 须 `min-height: 0` / 可分配高度传到底；仅设 `fill` 而父级高度塌缩时，空白区仍无法滑动。
- Tab 的每个 `items[].value` 必须有对应具名 slot 内容。

**禁止**：

- 让两个相邻层级同时接管同一横滑区域。
- 只绑 `v-model`、内容放在 Tab 外面。

---

## R4 — 可筛选列表 + 叠加层 Variant

**适用**：列表页需要搜索/筛选，并有 BottomSheet / Dialog / Toast 等叠加态。

**必须**：

- 列表主体：`SearchBar` / `FilterBar` 或带 `data-no-swipe` 的自定义筛选条（形状匹配时优先 DS）+ `ScrollableDataList`（按需）+ `DataList`（按需）。
- 叠加层用 DS 的 `BottomSheet` / `Dialog` / `Toast`。
- **叠加层挂载**：Dialog / Toast 宜作为页面内容的**兄弟节点**（与主滚动列并列），避免深埋在 `ScrollableDataList` 内容变换层内导致层级/capture 异常。Sheet 可按交互放在页内。
- 打开态注册为 Screen Variant，可经 URL 复现；另备 `empty` / `error` / `loading`（按页需要）。
- `FilterBar`：选中即更新当前集合。会改结果列表的 Sheet：选项写入草稿，确认按钮提交，关闭丢弃。点选即生效的设置项保持点选即用。
- 选项 Sheet：选中行右侧 `check` Icon，标签用 `typography.label`；选项 `DataList` 默认不分隔线。

**禁止**：

- 仅靠点击才能到达、无法用 Variant 打开的关键叠加态。
- 用未注册的临时弹层冒充可 capture 状态。

---

## R5 — 简单栈页

**适用**：单页详情/表单/说明，无一级底栏横滑。

**必须**：

```text
AppBar（showBack）
└─ 主内容（普通布局，或 ScrollableDataList）
```

- Screen 写入 `prototypes/registry.ts`。
- 优先 DS 组件；局部 UI 仍走 Token。
- 返回走统一 nav（见 shell-and-nav）。
- 进栈/返回动画由 Runtime `ScreenTransition` 播放，页面不要再包一层平行转场。

**禁止**：

- 无根目的地时强行引入空的 `TabViewport` + `Tabbar`。
- 各页手写互不一致的返回逻辑。

---

## R6 — 纵滚列表（可与 R1/R3/R4/R5 组合）

**适用**：任意需要下拉刷新、触底加载或受控纵滚的区域。

**必须**：

```text
ScrollableDataList
  └─ 页头 / 筛选 / 摘要…
  └─ DataList（表面与分隔）
       └─ 业务行
```

- `refreshing` / `loadingMore` / `hasMore` 由业务受控。
- 父级含本组件时 `overflow: hidden`，保证唯一纵滚。
- **状态页**：`loading` / `empty` / `error`（或等价整页态）时应关闭 `pullRefresh` / `loadMore` / `dragScroll`（或 `enabled: false`），避免空/错页仍可下拉刷新。
- 手势与父级横滑的仲裁见 [shared-gestures.md](../components/shared-gestures.md)。

**禁止**：

- 把 `DataList` 的外观 props 塞进 `ScrollableDataList`。
- 双滚动容器导致顶部下拉失效。

---

## R7 — 无 viewport 局部分段

**适用**：当前页面或滚动区域内的轻量筛选、模式或粒度切换，且**不创建具名内容面板**。业务字段本身（例如时间周期、活动分类或状态）不决定是否使用本配方。

**必须**：

- **不要用**带 viewport 的一级或二级 `Tabs`。
- 使用页内分段控件；根节点加手势忽略：`data-no-swipe`。Filter Bar 自带共享忽略语义；其它局部分段至少保证 `data-no-swipe`。
- 切换必须改变当前区域的可见数据或模式（摘要、列表、图表等），禁止只改高亮不改内容。

**禁止**：

- 用 `Tabs` / `TabViewport` 冒充局部分段。
- 在一级横滑面板内用不带忽略标记的分段条，导致误触翻 Tab。

---

## 选用表

| 需求                           | 配方                    |
| ------------------------------ | ----------------------- |
| 底栏多一级首页                 | R1（面板内列表再加 R6） |
| 页内横向卡片条                 | R2                      |
| 二级多分段 + 整页刷新          | R3                      |
| 列表 + 搜索筛选 + Sheet/Dialog | R4（+ R6）              |
| 无底栏的详情/表单页            | R5                      |
| 仅纵滚/刷新/分页               | R6                      |
| 当前区域内原地更新的筛选/模式/粒度 | R7                   |
