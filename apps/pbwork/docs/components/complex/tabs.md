# Tabs

> 组件 id：`tabs` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/Tabs.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/tabs.json`

页内 pill 分段：详情二级分区，或列表顶等宽状态筛选。

## 职责

- **做什么**：同一页内多分段内容（二级页或非一级主体）；轨道容器带背景与圆角，选中胶囊左右滑动过渡。
- **边界**：页内/二级分段。一级主体 Tab 子视图内禁止再嵌套带 window 的 Tabs。内容必须进具名 slot。短内容可滑用 `fill`。
- **不要用于**：滑线/极简分区导航（用 `underline-tabs`）；一级 BottomNavigation 面板内部再套一层横滑 Tabs；年/月/周/日等无面板切换（用无 window 分段）。

## 行为要点

- 最外层轨道：`trackBackground` + `trackRadius`。
- 选中态为独立滑动胶囊（`activeBackground`），切换时水平过渡；`prefers-reduced-motion: reduce` 时关闭位移。
- `swipe` / `mouseSwipe` 分离，不可互兜底。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id | label | kind |
| --- | --- | --- |
| `equal` | 等宽 | variant |

Playground：`presentation: single`。

## Slots / Events

- **Slots**：契约示例为 `overview`、`activity`；实际按 `items[].value` 具名。**每个 value 必须有对应 slot 内容。**
- **Events**：`update:modelValue`

## 用法要点

1. 从 `@/design-system/components/complex/Tabs.vue` 引入。
2. `fill` 须配合父级高度链（`min-height: 0` / 可分配高度），否则短内容可能仍滑不动。
3. 一级主体子视图内禁止使用；维度切换用 recipes R7。
4. 业务原型必须传业务稳定 `inspectId`。
5. 详见 [composition.md](../composition.md)、[recipes.md](../../prototypes/recipes.md)、[shared-gestures.md](../shared-gestures.md)。
