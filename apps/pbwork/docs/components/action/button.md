# Button

> 组件 id：`button` · 分类：`action`  
> 实现：`apps/pbwork/src/design-system/components/action/Button.vue`  
> 契约：`apps/pbwork/src/design-system/components/contracts/button.json`

表单主次操作，如提交工单、保存草稿。

## 职责

- **做什么**：表单提交、主次操作、空态 CTA。
- **边界**：外观只通过 Token-ref 色槽表达（`bgColor` / `borderColor` / `textColor`），禁止实例硬编码色值。默认主操作使用 `color.action` 配对。
- **不要用于**：纯图标操作（用 `icon-button`）。

## 行为要点

- `loading` / `disabled` 均不可点；loading 保持原强调度，disabled 才使用 `opacity.disabled`。
- `loading` 时 **spinner 与文案同时可见**，不得用加载图标替换文字。
- `disabled` 整钮使用 `opacity.disabled`。
- loading 指示器的尺寸与描边固定绑定 `sizing.icon-sm`、`sizing.progress-stroke`，不得由实例传数字覆盖。
- 未传 `borderColor` 时与 `bgColor` 相同；未传 `textColor` 时按底色推导（实色→`on-*`，`*-soft`→对应实色，透明底→边框色或 `color.action`）。
- 公开语义**不**绑定实现层样式枚举；软底/描边/纯文字等观感由 Token 组合达成。
- Props、默认值、Token 槽以 Contract 为准。

## States

| id         | label | kind        |
| ---------- | ----- | ----------- |
| `loading`  | 加载  | interaction |
| `disabled` | 禁用  | interaction |

Playground：`presentation: interactive`（点击触发 loading 与完成反馈；可用/禁用态在画布内对照；令牌只读折叠展示）。

## 用法要点

1. 从 `@/design-system/components/action/Button.vue` 引入。
2. 需要新能力先改 Contract + registry + 本文叙事。
3. 业务原型必须传业务稳定 `inspectId`。
