# Loading

> 组件 id：`loading` · 分类：`feedback`
> 实现：`apps/pbwork/src/design-system/components/feedback/Loading.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/loading.json`

蒙层加载反馈：有 scrim 并阻断下层操作。局部不阻断忙态请用 Spinner。

## 职责

- **做什么**：区域或页级忙碌，打开时拦截点击。
- **边界**：不替代行内 `spinner`；不承担业务结果提示（用 Toast）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | boolean | `false` | 是否打开 |
| `label` | string | `正在加载` | 可选说明文案 |
| `contained` | boolean | `true` | 附着容器内绝对定位 |

## States（Playground / Contract）

- `open` — 打开

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `scrim` | `color.scrim` |
| `active` | `color.primary` |
| `text` | `color.on-surface` |
| `size` | `sizing.icon-lg` |
| `stroke` | `sizing.indicator-thickness` |
| `motion` | `motion.duration-slow` |
| `label` | `typography.caption` |

## 用法要点

1. 从 `@/design-system/components/feedback/Loading.vue` 引入。
2. 与主滚动列兄弟挂载；Playground 使用 trigger 打开。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`。
