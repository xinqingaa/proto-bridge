# Dialog

> 组件 id：`dialog` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/DialogPanel.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/dialog.json`

需要确认或知悉的打断式说明，如完成工单、离线提示。

## 职责

- **做什么**：破坏性/确认操作。
- **边界**：确认/阻断对话；轻提示用 Snackbar。宜与主滚动列**兄弟挂载**（见 recipes R4），打开态注册 Variant。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | boolean | `true` | |
| `title` | string | `确认完成工单？` | |
| `message` | string | `完成后将通知客户，并记录处理结果。` | |
| `confirmLabel` | string | `确认完成` | |
| `contained` | boolean | `true` | |

## States（Playground / Contract）

- `closed` — 关闭

## Slots / Events

- **Slots**：`default`
- **Events**：`update:modelValue`, `confirm`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `scrim` | `color.scrim` |
| `surface` | `color.surface-raised` |
| `border` | `color.border` |
| `text` | `color.on-surface` |
| `radius` | `radius.xl` |
| `elevation` | `elevation.level-5` |
| `title` | `typography.title` |
| `body` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

