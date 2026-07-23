# Snackbar / Toast

> 组件 id：`snackbar` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/SnackbarToast.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/snackbar.json`

轻量成败反馈，不打断当前页面上下文。

## 职责

- **做什么**：操作成功/失败短提示。
- **边界**：短暂反馈；不要用 Dialog 替代 Toast。宜与主内容**兄弟挂载**；打开态可用 `toast-open` 等 Variant。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | boolean | `true` | |
| `message` | string | `工单已创建` | |
| `tone` | `success` \| `error` \| `info` | `success` | |

## States（Playground / Contract）

- `error` — 错误
- `hidden` — 隐藏

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `accent` | `color.success` |
| `surface` | `color.surface-raised` |
| `text` | `color.on-surface` |
| `radius` | `radius.lg` |
| `elevation` | `elevation.level-4` |
| `message` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

