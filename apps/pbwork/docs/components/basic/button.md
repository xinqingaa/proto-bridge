# Button

> 组件 id：`button` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/Button.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/button.json`

表单主次操作，如提交工单、保存草稿。

## 职责

- **做什么**：表单提交、主次操作、空态 CTA。
- **边界**：主操作优先 `tone="action"`；强调/链接语义才用 `primary`。不在按钮上硬编码颜色。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `label` | string | `确认` | |
| `variant` | `flat` \| `tonal` \| `outlined` \| `text` | `flat` | |
| `tone` | `action` \| `primary` \| `secondary` \| `error` \| `success` | `action` | |
| `size` | `sm` \| `md` \| `lg` | `md` | |
| `loading` | boolean | `false` | |
| `block` | boolean | `false` | |
| `disabled` | boolean | `false` | |
| `type` | `button` \| `submit` \| `reset` | — | |

## States（Playground / Contract）

- `tonal` — 柔和
- `outlined` — 描边
- `text` — 文字
- `primary` — 主色
- `loading` — 加载
- `disabled` — 禁用

## Slots / Events

- **Slots**：`default`
- **Events**：`click`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `background` | `color.action` |
| `onBackground` | `color.on-action` |
| `radius` | `radius.md` |
| `elevation` | `elevation.none` |
| `height` | `sizing.control-md` |
| `paddingX` | `spacing.md` |
| `typography` | `typography.label` |
| `duration` | `motion.duration-fast` |
| `easing` | `motion.easing-standard` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 原型内建议传稳定 `inspectId`（若组件支持）便于检查器定位。

