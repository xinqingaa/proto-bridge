# Data List

> 组件 id：`data-list` · 分类：`data`
> 实现：`apps/pbwork/src/design-system/components/data/DataList.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/data-list.json`

## 职责

- **做什么**：需要统一表面/分隔的列表段。
- **边界**：纯列表外观（surface/圆角/分隔）。滚动、刷新、分页一律外层 ScrollableDataList。
- **不要用于**：需要自己处理 overflow 滚动与刷新时（外包 ScrollableDataList）。

## Props

| Prop       | 类型                            | 默认      | 说明 |
| ---------- | ------------------------------- | --------- | ---- |
| `divided`  | boolean                         | `true`    |      |
| `inset`    | boolean                         | `false`   |      |
| `surface`  | `none` \| `default` \| `raised` | `default` |      |
| `rounded`  | `none` \| `sm` \| `md` \| `lg`  | `md`      |      |
| `elevated` | boolean                         | `false`   |      |

## States（Playground / Contract）

- `plain` — 无容器
- `raised` — 抬升容器

## Slots / Events

- **Slots**：`default`
- **Events**：无

Playground 使用标题行、双行业务记录和指标行三种不同插槽结构，明确行内容完全由业务提供；Data List 本身不声明手势事件。

## tokenBindings

| 槽位        | Token                |
| ----------- | -------------------- |
| `surface`   | `color.surface`      |
| `divider`   | `color.border`       |
| `radius`    | `radius.md`          |
| `elevation` | `elevation.card`     |
| `content`   | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/data/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
