# Tabs

> 组件 id：`tabs` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/Tabs.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/tabs.json`

页内二级切换：详情分区，或列表顶等宽分段筛选。

## 职责

- **做什么**：同一页内多分段内容（二级页或非一级主体）。
- **边界**：页内/二级分段。一级主体 Tab 子视图内禁止再嵌套带 window 的 Tabs。内容必须进具名 slot。短内容可滑用 `fill`。
- **不要用于**：一级 BottomNavigation 面板内部再套一层横滑 Tabs；年/月/周/日等无面板切换（用无 window 分段）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | string | `overview` | |
| `selectionStyle` | `pill` \| `underline` \| `text` | `pill` | |
| `showIndicator` | boolean | `false` | |
| `showDivider` | boolean | `false` | |
| `grow` | boolean | `false` | |
| `align` | `start` \| `center` | `start` | |
| `size` | `sm` \| `md` \| `lg` | `md` | |
| `swipe` | boolean | `true` | |
| `mouseSwipe` | boolean | `true` | |
| `fill` | boolean | `false` | |
| `items` | array | `[{"value": "overview", "label": "概览"}, {"value": "activity", "label": "活动"}]` | |

## States（Playground / Contract）

- `underline` — 滑线
- `equal` — 等宽
- `minimal` — 极简

## Slots / Events

- **Slots**：按 `items[].value` 具名（契约示例仅为示意；业务以实际 `items` 为准）。**每个 value 必须有对应 slot 内容。**
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `indicator` | `color.primary` |
| `activeBackground` | `color.primary-soft` |
| `activeColor` | `color.primary` |
| `inactiveColor` | `color.on-surface-muted` |
| `border` | `border.hairline` |
| `radius` | `radius.full` |
| `height` | `sizing.control-md` |
| `target` | `sizing.touch` |
| `typography` | `typography.label` |
| `panel` | `typography.caption` |
| `duration` | `motion.duration-slow` |
| `easing` | `motion.easing-standard` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/Tabs.vue` 引入。
2. `fill` 须配合父级高度链（`min-height: 0` / 可分配高度），否则短内容可能仍滑不动。
3. `swipe` / `mouseSwipe` 分离，不可互兜底。
4. 一级主体子视图内禁止使用；维度切换用 recipes R7。
5. 详见 [composition.md](../composition.md)、[recipes.md](../../prototypes/recipes.md)、[shared-gestures.md](../shared-gestures.md)。

