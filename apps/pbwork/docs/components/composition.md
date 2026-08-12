# 组件组合铁律

做原型时优先按下列配方组装；细节见各组件页与 [shared-gestures.md](./shared-gestures.md)。

## 1. 页面壳

```text
（可选）AppBar
└─ 内容区（唯一主滚动或交由 ScrollableDataList）
└─ （可选）Tabbar
```

- **一级最大导航页**：`AppBar` **可选**；需要统一标题/全局操作时再加，否则顶区可放在各面板内。
- **栈页**：通常需要 `AppBar`（`showBack`）+ 业务 `goBack` / nav 辅助函数。
- 根目的地：内容区用 **TabViewport**（或路由内容），底栏用 **Tabbar**，二者共用同一当前位置。
- **禁止**让 Tabbar 同时当面板容器和手势层；根目的地默认不接受横滑。

## 2. 一级多面板

```text
Tabbar  ──value───────────┐
TabViewport      ◄─────────┘  swipe / mouseSwipe / keepMounted
  ├─ panel A → 常为 ScrollableDataList 或可滚 panel
  ├─ panel B
  └─ panel C
```

- 根视图的 **动画与保活** 只在 TabViewport 或路由内容。
- 业务路由只记录当前 Tab 身份；手势层不直接改 history 细节（由原型 nav 统一 replace/push）。

## 3. Tabs 与分段

| 场景            | 规则                                                                   |
| --------------- | ---------------------------------------------------------------------- |
| 一级 Tab        | 主内容分区；使用 Liquid Glass 胶囊与对应具名视图                       |
| 二级 Tab        | 子分区；使用文字居中小三角与对应具名视图                               |
| 一级 + 二级嵌套 | 允许，但同一物理区域只有一个 `v-window` 接收横滑；另一层关闭横滑       |
| 三级 Tab        | 使用 Filter Bar；只改数据，绝不创建 `v-window`                         |
| 日/周/月等维度  | 不用 Tab；无 window 分段 + `data-no-swipe`，切换须改数据（recipes R7） |

短内容也要可横滑：对一级或二级 Tab 开 `fill`，并保证父级高度链（`min-height: 0` / 可分配高度）传到对应 Tab。

## 4. 列表

```text
ScrollableDataList          # 纵滚 + 刷新 + 分页 + 可选鼠标拖滚
  └─ 业务页头 / 筛选 / …
  └─ DataList               # surface / 圆角 / 分隔
       └─ 任意业务行（button、自定义结构均可）
```

- **不合并 props**：ScrollableDataList 不透传 DataList 的 `surface` / `rounded` 等。
- `refreshing` / `loadingMore` / `hasMore` 由业务受控。
- 父级若已含 ScrollableDataList：父容器 `overflow: hidden`，保证**唯一纵滚**与「顶部下拉」语义正确。
- loading / empty / error 整页态应关闭刷新与分页手势（recipes R6）。

## 5. 筛选与搜索

- 搜索：`SearchBar`
- 标准快速 chips：优先三级 Tab（`FilterBar`；自带横滑忽略）
- 自定义 Chip 行：合法，须 `data-no-swipe`

## 6. 表单

使用语义化业务 `<section>` 组织表单分组，内部组合 TextField / Textarea / Select / Checkbox / RadioGroup / Switch；分组的标题、说明、边界与间距属于页面局部结构，必须使用 Foundation Token 并按需声明 Evidence。

提交用 `Button`；主操作默认 `bgColor=color.action`（及配对文字/边框）。

## 7. 反馈与叠加

| 需求     | 组件                                        |
| -------- | ------------------------------------------- |
| 空数据   | EmptyState                                  |
| 加载中   | Spinner（或页级 loading Variant）           |
| 失败     | 独立错误布局（优先）；勿默认滥用 EmptyState |
| 短提示   | Snackbar                                    |
| 确认     | Dialog                                      |
| 半屏操作 | BottomSheet                                 |

打开态用 Screen **Variant** 复现。Dialog / Snackbar 宜与主滚动列**兄弟挂载**（见 recipes R4）。

## 8. 嵌套横向滚动

- 容器标记 `data-horizontal-scroll`
- 使用 `useHorizontalDragScroll`
- 有横向溢出时，父级 Tab **整次手势让权**（含边界外拖）；无溢出时父级可翻页

## 9. 决策速查

```text
要应用根目的地？ → Tabbar + TabViewport（或路由）
要页内主分段面板？ → 一级 Tab
要页内子分段面板？ → 二级 Tab
只改列表数据？ → 三级 Tab（Filter Bar）
要日/周/月维度？ → 无 window 分段 + data-no-swipe（R7）
要刷新/分页列表？ → ScrollableDataList + DataList
要嵌套横滑条？ → data-horizontal-scroll + useHorizontalDragScroll
只要标签外观？ → Chip；标准筛一排？ → 三级 Tab / Filter Bar（自定义 Chip 行亦可）
```
