# Icon Button

> 组件 id：`icon-button` · 分类：`basic`
> 实现：`apps/pbwork/src/design-system/components/basic/IconButton.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/icon-button.json`

顶栏与工具区的紧凑图标操作，如更多、新建。

## 职责

- **做什么**：AppBar/工具区紧凑图标操作。
- **边界**：`ariaLabel` 必填。`icon` 与基础组件 `icon` 共用 `_shared/icons.ts` 策展清单；清单不足时先扩共享目录，禁止页内复制图标。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `ariaLabel` | string | `更多` | |
| `icon` | `PbIconName`（与基础 `icon` 同一策展清单） | `more` | |
| `size` | `sm` \| `md` \| `lg` | `md` | |
| `tone` | `primary` \| `secondary` | `secondary` | |
| `variant` | `tonal` \| `flat` \| `outlined` \| `text` | `tonal` | |
| `loading` | boolean | `false` | |
| `disabled` | boolean | `false` | |

## States（Playground / Contract）

- `primary` — 主色
- `loading` — 加载
- `disabled` — 禁用

## Slots / Events

- **Slots**：无
- **Events**：`click`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `color` | `color.secondary` |
| `background` | `color.secondary-soft` |
| `radius` | `radius.full` |
| `elevation` | `elevation.none` |
| `size` | `sizing.control-md` |
| `target` | `sizing.touch` |
| `duration` | `motion.duration-fast` |
| `easing` | `motion.easing-standard` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/basic/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。

