# Tab Viewport

> 组件 id：`tab-viewport` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/TabViewport.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/tab-viewport.json`

与导航解耦的内容视图，负责保活、转场与横向手势。

## 职责

- **做什么**：底部导航对应的多面板内容区。
- **边界**：一级多面板横滑/保活。禁止与 BottomNavigation 合并实现。`keepMounted` 时各面板须遵守 Variant 所有权（见 [screens-and-variants.md](../../prototypes/screens-and-variants.md)）。
- **不要用于**：页内二级分段（用 `Tabs`）；与底栏抢同一职责。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | string | `one` | |
| `items` | array | `[{"value": "one"}, {"value": "two"}, {"value": "three"}]` | |
| `swipe` | boolean | `true` | |
| `mouseSwipe` | boolean | `true` | |
| `keepMounted` | boolean | `true` | |
| `transitionDuration` | number | `240` | |

## States（Playground / Contract）

- `second` — 第二屏
- `no-swipe` — 禁用滑动

## Slots / Events

- **Slots**：`item`
- **Events**：`update:modelValue`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `background` | `color.background` |
| `duration` | `motion.duration-normal` |
| `easing` | `motion.easing-standard` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 与 `BottomNavigation` 共用同一 `v-model`；手势先改 UI，URL replace 须节流。
2. `swipe` / `mouseSwipe` 分离；仲裁见 [shared-gestures.md](../shared-gestures.md)。
3. 壳与 history 见 [shell-and-nav.md](../../prototypes/shell-and-nav.md)；配方 R1。
4. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
