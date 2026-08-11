# Switch

> 组件 id：`switch` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/SwitchControl.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/switch.json`

即时开关设置，如进度通知、离线缓存。

## 职责

- **做什么**：设置项开闭。
- **边界**：设置类即时开关；表单提交类二元选择优先 Checkbox。
- **色**：`color` 为开启轨 Token-ref（默认 `color.primary`）。

## 行为要点

- 禁止实例硬编码色值。
- `disabled` 使用 `opacity.disabled`。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id         | label | kind        |
| ---------- | ----- | ----------- |
| `off`      | 关闭  | content     |
| `disabled` | 禁用  | interaction |

## 用法要点

1. 从 `@/design-system/components/basic/SwitchControl.vue` 引入。
2. 需要新能力先改 Contract + registry + 本文叙事。
3. 业务原型必须传业务稳定 `inspectId`。
