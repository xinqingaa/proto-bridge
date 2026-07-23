# Bottom Sheet

> 组件 id：`bottom-sheet` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/BottomSheet.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/bottom-sheet.json`

从底部展开的临时面板，用于筛选或更多操作。

## 职责

- **做什么**：次要操作、详情补充。
- **边界**：半屏操作面板；打开态用 Screen Variant 复现。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `title` | string | `操作面板` | |
| `modelValue` | boolean | `true` | |

## States（Playground / Contract）

- `open` — 打开
- `closed` — 关闭

## Slots / Events

- **Slots**：`default`
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.surface` |
| `border` | `color.border` |
| `radius` | `radius.lg` |
| `elevation` | `elevation.raised` |
| `title` | `typography.subtitle` |
| `body` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

