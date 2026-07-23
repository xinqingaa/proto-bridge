# Card

> 组件 id：`card` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Card.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/card.json`

承载独立业务摘要与信息区块。

## 职责

- **做什么**：独立信息模块容器。
- **边界**：仅当容器承载独立交互模块时使用；列表行默认不要每行一张 Card。
- **不要用于**：列表每一行、英雄区装饰块。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `任务卡片` | |
| `subtitle` | string | `描述信息` | |
| `elevated` | boolean | `true` | |

## States（Playground / Contract）

- （无预置 state）

## Slots / Events

- **Slots**：`default`
- **Events**：无

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.surface` |
| `border` | `color.border` |
| `radius` | `radius.lg` |
| `elevation` | `elevation.card` |
| `title` | `typography.subtitle` |
| `subtitle` | `typography.caption` |
| `muted` | `color.on-surface-muted` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

