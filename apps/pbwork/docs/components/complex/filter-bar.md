# Filter Bar

> 组件 id：`filter-bar` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/FilterBar.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/filter-bar.json`

快捷状态筛选，并可挂接高级筛选入口。

## 职责

- **做什么**：列表顶标准快速筛选（一排选项 + 可选高级筛选入口）。
- **边界**：横滑场景下组件根带 `.pb-filter-bar`，父级 Tab 会忽略。自定义 Chip 行也合法，须自行加 `data-no-swipe`。
- **不要用于**：无 window 的日/周/月维度切换（用 recipes R7）；搜索框（用 SearchBar）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `items` | array | `["全部", "进行中", "已超时"]` | |
| `modelValue` | string | `进行中` | |
| `showFilter` | boolean | `true` | |

## States（Playground / Contract）

- `all` — 全部
- `compact` — 无筛选按钮

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`, `filter`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `active` | `color.primary` |
| `activeSurface` | `color.primary-soft` |
| `surface` | `color.surface` |
| `border` | `color.border` |
| `radius` | `radius.sm` |
| `gap` | `spacing.sm` |
| `label` | `typography.label` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

