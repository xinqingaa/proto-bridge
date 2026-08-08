# Underline Tabs

> 组件 id：`underline-tabs` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/UnderlineTabs.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/underline-tabs.json`

页内分区导航：滑线指示选中，或极简纯文字样式。

## 职责

- **做什么**：同一页内多分区内容切换，用滑线或纯文字强调选中项。
- **边界**：页内/二级分区导航。内容必须进具名 slot。短内容可滑用 `fill`。
- **不要用于**：pill 分段筛选（用 `tabs`）；一级 BottomNavigation 面板内部再套一层横滑 Tabs。

## States（Playground / Contract）

- `minimal` — 极简纯文字，无滑线
- `equal` — 等宽铺满

Playground：`presentation: tile`。

## Slots / Events

- **Slots**：契约示例为 `overview`、`activity`；实际按 `items[].value` 具名。**每个 value 必须有对应 slot 内容。**
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `indicator` | `color.primary` |
| `activeBackground` | `transparent` |
| `activeColor` | `color.primary` |
| `inactiveColor` | `color.on-surface-muted` |
| `border` | `border.hairline` |
| `radius` | `radius.md` |
| `height` | `sizing.control-md` |
| `target` | `sizing.touch` |
| `typography` | `typography.label` |
| `panel` | `typography.caption` |
| `duration` | `motion.duration-slow` |
| `easing` | `motion.easing-standard` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/UnderlineTabs.vue` 引入。
2. `variant=underline` 默认显示底部滑线；`variant=minimal` 无滑线、仅文字强调。
3. `fill` 须配合父级高度链（`min-height: 0` / 可分配高度），否则短内容可能仍滑不动。
4. `swipe` / `mouseSwipe` 分离，不可互兜底。
5. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.underline-tabs` 只用于 Playground、组件测试或非业务预览。
6. 详见 [composition.md](../composition.md)、[recipes.md](../../prototypes/recipes.md)、[shared-gestures.md](../shared-gestures.md)。
