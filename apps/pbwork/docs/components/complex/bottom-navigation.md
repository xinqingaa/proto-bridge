# Bottom Navigation

> 组件 id：`bottom-navigation` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/BottomNavigation.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/bottom-navigation.json`

应用主 Tabbar：入口数量、文案与图标均由外部传入。

## 职责

- **做什么**：一级 2–5 个目的地。
- **边界**：只发 `modelValue`，不做面板容器、不做手势。一级面板交给 TabViewport。
- **不要用于**：需要面板动画/保活/横滑时（用 TabViewport）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | string | `one` | |
| `items` | array | `[{"value": "one", "label": "首页"}, {"value": "two", "label": "列表"}, {"value": "three", "label": "我的"}]` | |
| `display` | `icon-label` \| `icon` \| `label` | `icon-label` | |
| `showIndicator` | boolean | `true` | |
| `elevated` | boolean | `true` | |

## States（Playground / Contract）

- `second` — 第二项选中
- `icon-only` — 纯图标
- `label-only` — 纯文字

## Slots / Events

- **Slots**：无
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `surface` | `color.surface-raised` |
| `active` | `color.primary` |
| `inactive` | `color.on-surface-muted` |
| `border` | `border.hairline` |
| `elevation` | `elevation.level-3` |
| `target` | `sizing.touch` |
| `height` | `sizing.bottom-navigation` |
| `label` | `typography.caption` |
| `indicatorRadius` | `radius.full` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 只与 `TabViewport` 组合使用同一选中值；本组件不渲染面板内容。
2. 见 [shell-and-nav.md](../../prototypes/shell-and-nav.md)、recipes R1。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
