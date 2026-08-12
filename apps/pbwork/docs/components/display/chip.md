# Chip

> 组件 id：`chip` · 分类：`display`
> 实现：`apps/pbwork/src/design-system/components/display/Chip.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/chip.json`

列表中的状态标签，如进行中、即将超时。

## 职责

- **做什么**：状态标签、筛选项展示。
- **边界**：状态/筛选标签；不是按钮。可点击筛选应包在 button 或 FilterBar 内。

## Props

| Prop       | 类型                                                          | 默认      | 说明 |
| ---------- | ------------------------------------------------------------- | --------- | ---- |
| `label`    | string                                                        | `进行中`  |      |
| `tone`     | `primary` \| `secondary` \| `success` \| `warning` \| `error` | `primary` |      |
| `elevated` | boolean                                                       | `false`   |      |

## States（Playground / Contract）

- （无预置 state）

## Slots / Events

- **Slots**：`default`
- **Events**：无

## tokenBindings

| 槽位         | Token                |
| ------------ | -------------------- |
| `background` | `color.primary-soft` |
| `color`      | `color.primary`      |
| `radius`     | `radius.sm`          |
| `elevation`  | `elevation.card`     |
| `typography` | `typography.caption` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/display/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
