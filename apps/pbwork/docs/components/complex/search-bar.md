# Search Bar

> 组件 id：`search-bar` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/SearchBar.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/search-bar.json`

在列表顶部按编号或客户搜索，支持清除。

## 职责

- **做什么**：列表顶搜索。
- **边界**：搜索输入；筛选 chips 用 FilterBar。

## Props

| Prop          | 类型    | 默认                   | 说明 |
| ------------- | ------- | ---------------------- | ---- |
| `modelValue`  | string  | `空调检修`             |      |
| `placeholder` | string  | `搜索工单、客户或设备` |      |
| `disabled`    | boolean | `false`                |      |

## States（Playground / Contract）

- `empty` — 空输入
- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`, `submit`

## tokenBindings

| 槽位              | Token                    |
| ----------------- | ------------------------ |
| `surface`         | `color.surface-variant`  |
| `text`            | `color.on-surface`       |
| `placeholder`     | `color.on-surface-muted` |
| `radius`          | `radius.md`              |
| `height`          | `sizing.control-lg`      |
| `icon`            | `sizing.icon-compact`    |
| `typography`      | `typography.content`     |
| `disabledOpacity` | `opacity.disabled`       |
| `fill`            | `layout.fill`            |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
