# Bottom Sheet

> 组件 id：`bottom-sheet` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/BottomSheet.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/bottom-sheet.json`

从底部展开的临时面板，用于筛选或更多操作。

## 职责

- **做什么**：次要操作、详情补充。
- **边界**：半屏操作面板；打开态用 Screen Variant 复现。

## Props

| Prop         | 类型    | 默认       | 说明 |
| ------------ | ------- | ---------- | ---- |
| `title`      | string  | `操作面板` |      |
| `modelValue` | boolean | `true`     |      |

## States（Playground / Contract）

- `open` — 打开
- `closed` — 关闭

## Slots / Events

- **Slots**：`default`
- **Events**：`update:modelValue`

## tokenBindings

| 槽位        | Token                 |
| ----------- | --------------------- |
| `surface`   | `color.surface`       |
| `border`    | `color.border`        |
| `radius`    | `radius.lg`           |
| `elevation` | `elevation.raised`    |
| `title`     | `typography.subtitle` |
| `body`      | `typography.content`  |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
4. 关闭态通过交互切换为打开态时，组件会重新注册实际 Sheet surface，确保 Scenario Checkpoint 能读取可见、非零 bbox 的 Overlay Evidence。
5. Overlay 宿主必须保留顶部 `radius.lg`；Vuetify 的 Bottom Sheet 默认零圆角不得覆盖该语义绑定。
