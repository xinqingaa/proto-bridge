# Card

> 组件 id：`card` · 分类：`display`
> 实现：`apps/pbwork/src/design-system/components/display/Card.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/card.json`

只提供圆角 surface 的基础容器；内容完全由调用方的默认 slot 定义。

## 职责

- **做什么**：为独立内容模块提供背景、边框、圆角与可选抬升。
- **边界**：Card 不拥有标题、副标题、指标、列表或表单结构；这些都由调用方放入 slot。
- **不要用于**：列表每一行、英雄区装饰块，或把业务内容结构固化进组件 Props。

## Props

| Prop           | 类型                         | 默认      | 说明                                                 |
| -------------- | ---------------------------- | --------- | ---------------------------------------------------- |
| `elevated`     | boolean                      | `false`   | 是否使用 `elevation.card` 表面层级                   |
| `semanticRole` | `section \| card \| summary` | `section` | contextual role，只能从 Contract `allowedRoles` 选择 |

## States（Playground / Contract）

- `flat`：平面基础 surface。
- `elevated`：使用 `elevation.card` 的抬升 surface。

## Slots / Events

- **Slots**：`default`
- **Events**：无

## tokenBindings

| 槽位        | Token            |
| ----------- | ---------------- |
| `surface`   | `color.surface`  |
| `border`    | `color.border`   |
| `radius`    | `radius.lg`      |
| `elevation` | `elevation.card` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/display/...` 引入实现组件，并在默认 slot 内组织业务标题、正文和操作。
2. 需要不同内容组织时修改调用方，不为 Card 新增业务内容 Props 或“业务类型”。
3. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
4. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
