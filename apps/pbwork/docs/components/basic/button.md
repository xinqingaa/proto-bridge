# Button

> 组件 id：`button` · 分类：`basic`  
> 实现：`apps/pbwork/src/design-system/components/basic/Button.vue`  
> 契约：`apps/pbwork/src/design-system/components/contracts/button.json`

表单主次操作，如提交工单、保存草稿。

## 职责

- **做什么**：表单提交、主次操作、空态 CTA。
- **边界**：主操作优先 `tone="action"`；强调/链接语义才用 `primary`。不在按钮上硬编码颜色。
- **不要用于**：纯图标操作（用 `icon-button`）。

## 行为要点

- `loading` / `disabled` 均不可点；同时为真时以不可点为准。
- `variant` / `tone` 是同一 role 下的外观槽，**不拆成多个组件**。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id | label | kind |
| --- | --- | --- |
| `tonal` | 柔和 | variant |
| `outlined` | 描边 | variant |
| `text` | 文字 | variant |
| `primary` | 主色 | variant |
| `loading` | 加载 | interaction |
| `disabled` | 禁用 | interaction |

Playground：`presentation: tile`（默认 + 上表平铺）。

## 用法要点

1. 从 `@/design-system/components/basic/Button.vue` 引入。
2. 需要新能力先改 Contract + registry + 本文叙事。
3. 业务原型必须传业务稳定 `inspectId`。
