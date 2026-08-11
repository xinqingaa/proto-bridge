# Form Section

> 组件 id：`form-section` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/FormSection.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/form-section.json`

表单分组：必填客户信息，或可选补充信息。

## 职责

- **做什么**：长表单分组。
- **边界**：表单分区标题+内容槽；字段仍用基础表单组件。

## Props

| Prop           | 类型              | 默认                   | 说明                                                 |
| -------------- | ----------------- | ---------------------- | ---------------------------------------------------- |
| `title`        | string            | `客户信息`             |                                                      |
| `description`  | string            | `填写联系人和服务地址` |                                                      |
| `required`     | boolean           | `true`                 |                                                      |
| `actionLabel`  | string            | `编辑`                 |                                                      |
| `semanticRole` | `section \| form` | `section`              | contextual role，只能从 Contract `allowedRoles` 选择 |

## States（Playground / Contract）

- `optional` — 选填
- `no-action` — 无操作

## Slots / Events

- **Slots**：`default`, `action`
- **Events**：`action`

## tokenBindings

| 槽位          | Token                    |
| ------------- | ------------------------ |
| `surface`     | `color.surface`          |
| `border`      | `color.border`           |
| `title`       | `color.on-surface`       |
| `description` | `color.on-surface-muted` |
| `required`    | `color.error`            |
| `radius`      | `radius.lg`              |
| `gap`         | `spacing.sm-plus`        |
| `typography`  | `typography.subtitle`    |
| `caption`     | `typography.caption`     |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
