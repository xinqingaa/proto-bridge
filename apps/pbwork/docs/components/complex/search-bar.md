# Search Bar

> 组件 id：`search-bar` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/SearchBar.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/search-bar.json`

在列表顶部按编号或客户搜索，支持清除。

## 职责

- **做什么**：列表顶搜索。
- **边界**：搜索输入；筛选 chips 用 FilterBar。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | string | `空调检修` | |
| `placeholder` | string | `搜索工单、客户或设备` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `empty` — 空输入
- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`, `submit`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.surface-variant` |
| `text` | `color.on-surface` |
| `radius` | `radius.md` |
| `height` | `sizing.control-lg` |
| `typography` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

