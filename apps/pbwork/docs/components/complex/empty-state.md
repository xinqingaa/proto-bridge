# Empty State

> 组件 id：`empty-state` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/EmptyState.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/empty-state.json`

无数据或无结果时给出说明与下一步操作。

## 职责

- **做什么**：无数据可展示时。
- **边界**：空列表/空页；与 loading 分开。**失败态优先独立错误布局**，不要默认用 EmptyState 表达 error（除非该屏明确把「不可用」写成空态文案）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `暂无工单` | |
| `description` | string | `调整筛选条件，或创建第一张现场工单。` | |
| `actionLabel` | string | `新建工单` | |

## States（Playground / Contract）

- `without-action` — 无操作

## Slots / Events

- **Slots**：无
- **Events**：`action`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `iconSurface` | `color.primary-soft` |
| `icon` | `color.primary` |
| `title` | `color.on-surface` |
| `description` | `color.on-surface-muted` |
| `radius` | `radius.full` |
| `spacing` | `spacing.lg` |
| `iconSize` | `sizing.icon-lg` |
| `typography` | `typography.subtitle` |
| `body` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。

