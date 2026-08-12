# Toast

> 组件 id：`toast` · 分类：`feedback`
> 实现：`apps/pbwork/src/design-system/components/feedback/Toast.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/toast.json`

轻量短提示：半透明黑底 + 纯文本，timeout 后自动关闭，不阻断页面。

## 职责

- **做什么**：成败或状态短反馈。
- **边界**：不打断操作；确认类用 Confirm；蒙层忙态用 Loading。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | boolean | `false` | 是否显示 |
| `message` | string | 必填 | 提示文案 |

## States（Playground / Contract）

- `visible` — 显示
- `hidden` — 隐藏

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.toast` |
| `text` | `color.on-toast` |
| `radius` | `radius.lg` |
| `paddingX` | `spacing.sm` |
| `paddingY` | `spacing.xs-plus` |
| `message` | `typography.content` |
| `duration` | `motion.duration-toast` |

## 用法要点

1. 从 `@/design-system/components/feedback/Toast.vue` 引入。
2. 与主滚动列兄弟挂载；Playground 使用 trigger。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`。
