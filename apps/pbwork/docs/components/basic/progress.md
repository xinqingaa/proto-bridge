# Progress

> 组件 id：`progress` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/ProgressIndicator.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/progress.json`

展示任务进度，如附件上传或后台同步。

## 职责

- **做什么**：任务/活动完成度。
- **边界**：确定/不确定进度；整页加载用 Spinner/EmptyState 组合。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `value` | number | `68` | |
| `indeterminate` | boolean | `false` | |
| `label` | string | `工单完成度` | |

## States（Playground / Contract）

- `indeterminate` — 加载中
- `complete` — 已完成

## Slots / Events

- **Slots**：无
- **Events**：无

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `fill` | `color.primary` |
| `track` | `color.primary-soft` |
| `radius` | `radius.full` |
| `motion` | `motion.duration-normal` |
| `text` | `color.on-surface` |
| `label` | `typography.caption` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。

