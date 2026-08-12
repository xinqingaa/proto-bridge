# Spinner

> 组件 id：`spinner` · 分类：`display`
> 实现：`apps/pbwork/src/design-system/components/display/Spinner.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/spinner.json`

行内或整页加载等待反馈。

## 职责

- **做什么**：加载中。
- **边界**：局部或整页加载指示；空数据用 EmptyState。

## Props

| Prop    | 类型                 | 默认       | 说明 |
| ------- | -------------------- | ---------- | ---- |
| `label` | string               | `正在加载` |      |
| `size`  | `sm` \| `md` \| `lg` | `md`       |      |

## States（Playground / Contract）

- `small` — 小尺寸
- `large` — 大尺寸

## Slots / Events

- **Slots**：无
- **Events**：无

## tokenBindings

| 槽位     | Token                        |
| -------- | ---------------------------- |
| `active` | `color.primary`              |
| `text`   | `color.on-surface-muted`     |
| `size`   | `sizing.icon-md`             |
| `motion` | `motion.duration-slow`       |
| `label`  | `typography.caption`         |
| `stroke` | `sizing.indicator-thickness` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/display/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
