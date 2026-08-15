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
| 一级 Tab        | 当前页面的主要内容分区；使用 Liquid Glass 胶囊与对应具名视图           |
| 二级 Tab        | 当前页面内的次级内容分区；使用文字居中小三角与对应具名视图             |
| 一级 + 二级嵌套 | 允许，但同一物理区域只有一个 `v-window` 接收横滑；另一层关闭横滑       |
| 三级 Tab        | 局部筛选/模式/粒度分段；不创建 `v-window`，使用 `data-no-swipe`         |

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
- 标准快速筛选：优先三级 Tab / `FilterBar`；自带横滑忽略
- 自定义 Chip 行：合法，须 `data-no-swipe`

## 6. 表单

使用语义化业务 `<section>` 组织表单分组，内部组合 TextField / Textarea / Select / Checkbox / RadioGroup / Switch；分组的标题、说明、边界与间距属于页面局部结构，必须使用 Foundation Token 并按需声明 Evidence。

提交用 `Button`。一行一颗时用主要类型；两颗时左侧次要类型、右侧主要类型。描边类型只用于卡片内轻量动作，不进入 Confirm / Sheet / FlowSheet 决策区。

## 7. Card surface

- Card 只提供 surface（背景、边框、圆角与可选抬升）；标题、说明、指标、列表和表单均在默认 slot 内由业务页面组织。
- 业务摘要、内容分区等是 slot 内容组织方式，不是 Card 类型，不得写入 Card Props、Contract state 或 Playground 类型区。
- 列表行默认不要逐行包 Card；需要列表 surface 使用 DataList。

## 8. 反馈与叠加

| 需求 | 组件 |
| --- | --- |
| 空数据 | EmptyState |
| 局部忙态（不阻断） | Spinner |
| 蒙层忙态（阻断） | Loading |
| 失败 | 独立错误布局（优先）；勿默认滥用 EmptyState |
| 短提示 | Toast |
| 确认 | Confirm（Dialog / Confirm） |
| 半屏操作 | BottomSheet / FlowSheet；顶栏为返回（FlowSheet 非首页）/ 居中标题 / 关闭 |

打开态用 Screen **Variant** 复现。Confirm / Toast / Loading 宜与主滚动列**兄弟挂载**（见 recipes R4）。

## 9. 嵌套横向滚动

- 容器标记 `data-horizontal-scroll`
- 使用 `useHorizontalDragScroll`
- 有横向溢出时，父级 Tab **整次手势让权**（含边界外拖）；无溢出时父级可翻页

## 10. 决策速查

```text
要应用根目的地？ → Tabbar + TabViewport（或路由）
要当前页面的主要内容面板？ → 一级 Tab
要页面内的次级内容面板？ → 二级 Tab
要当前区域内原地更新的筛选/模式/粒度？ → 三级 Tab / 局部分段（R7）
要刷新/分页列表？ → ScrollableDataList + DataList
要嵌套横滑条？ → data-horizontal-scroll + useHorizontalDragScroll
只要标签外观？ → Chip；标准筛一排？ → 三级 Tab / Filter Bar（自定义 Chip 行亦可）
```
