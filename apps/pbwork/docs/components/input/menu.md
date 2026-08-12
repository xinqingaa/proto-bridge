# Menu

> 组件 id：`menu` · 分类：`input`
> 实现：`apps/pbwork/src/design-system/components/input/Menu.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/menu.json`

从有限业务选项中选择，如服务类型、负责人。

## 职责

- **做什么**：固定选项集合。
- **边界**：选项列表进 `options`；复杂自定义项用 `item` slot。

## Props

| Prop          | 类型    | 默认                       | 说明 |
| ------------- | ------- | -------------------------- | ---- |
| `label`       | string  | `服务类型`                 |      |
| `modelValue`  | string  | `维修`                     |      |
| `options`     | array   | `["维修", "巡检", "安装"]` |      |
| `placeholder` | string  | `请选择服务类型`           |      |
| `clearable`   | boolean | `true`                     |      |
| `loading`     | boolean | `false`                    |      |
| `error`       | string  | ``                         |      |
| `open`        | boolean | `false`                    |      |
| `disabled`    | boolean | `false`                    |      |

## States（Playground / Contract）

- `open` — 展开菜单
- `loading` — 加载
- `error` — 错误
- `disabled` — 禁用

## Slots / Events

- **Slots**：`item`
- **Events**：`update:modelValue`, `update:open`

## tokenBindings

| 槽位                 | Token                     |
| -------------------- | ------------------------- |
| `surface`            | `color.surface`           |
| `border`             | `color.border`            |
| `focus`              | `color.primary`           |
| `radius`             | `radius.md`               |
| `height`             | `sizing.control-md`       |
| `text`               | `typography.content`      |
| `muted`              | `color.on-surface-muted`  |
| `menuSurface`        | `color.surface-raised`    |
| `menuBorder`         | `border.hairline`         |
| `menuRadius`         | `radius.lg`               |
| `menuElevation`      | `elevation.level-3`       |
| `menuItemHeight`     | `sizing.menu-item`        |
| `selectedBackground` | `color.primary-soft`      |
| `duration`           | `motion.duration-normal`  |
| `easing`             | `motion.easing-standard`  |
| `openRotation`       | `motion.rotate-half-turn` |
| `disabledOpacity`    | `opacity.disabled`        |
| `menuMaxHeight`      | `layout.menu-max-height`  |
| `menuOffset`         | `spacing.xs-plus`         |
| `iconSize`           | `sizing.icon-compact`     |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/input/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
