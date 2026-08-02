# Badge

> 组件 id：`badge` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Badge.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/badge.json`

数量或状态角标，如未读数、已完成。

## 职责

- **做什么**：未读数、状态点。
- **边界**：计数/状态角标；文案保持短。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `3` | |
| `tone` | `primary` \| `error` \| `success` \| `warning` | `error` | |

## States（Playground / Contract）

- `success` — 成功
- `warning` — 警告

## Slots / Events

- **Slots**：无
- **Events**：无

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `background` | `color.error` |
| `text` | `color.on-error` |
| `radius` | `radius.full` |
| `label` | `typography.caption-strong` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
4. 同一 Screen 中多个 Badge 共用一个模板 `inspectId` 时，必须同时传稳定业务 `pbKey`，不能把数组 index 或展示文案写入 identity。
