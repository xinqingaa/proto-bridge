# Switch

> 组件 id：`switch` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/SwitchControl.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/switch.json`

即时开关设置，如进度通知、离线缓存。

## 职责

- **做什么**：设置项开闭。
- **边界**：设置类即时开关；表单提交类二元选择优先 Checkbox。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `接收进度通知` | |
| `modelValue` | boolean | `true` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `off` — 关闭
- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `active` | `color.primary` |
| `track` | `color.surface-variant` |
| `thumb` | `color.surface` |
| `text` | `color.on-surface` |
| `target` | `sizing.touch` |
| `label` | `typography.content` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。

