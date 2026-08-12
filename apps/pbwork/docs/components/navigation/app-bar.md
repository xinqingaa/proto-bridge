# App Bar

> 组件 id：`app-bar` · 分类：`navigation`
> 实现：`apps/pbwork/src/design-system/components/navigation/AppBar.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/app-bar.json`

移动端页顶导航：首页工作台，或详情页返回与操作。

## 职责

- **做什么**：页顶栏（标题、返回、右侧操作）。
- **边界**：栈页通常需要（返回）；**一级最大导航页可选**，无统一顶栏需求时可不放。返回逻辑由页面/nav 处理，不在 AppBar 内写死路由。
- **不要用于**：强制给每个一级 Tab 根都加一层空顶栏。

## Props

| Prop          | 类型                                       | 默认       | 说明 |
| ------------- | ------------------------------------------ | ---------- | ---- |
| `title`       | string                                     | `项目协作` |      |
| `dense`       | boolean                                    | `false`    |      |
| `elevated`    | boolean                                    | `false`    |      |
| `showBack`    | boolean                                    | `true`     |      |
| `backLabel`   | string                                     | `返回`     |      |
| `showAction`  | boolean                                    | `true`     |      |
| `actionIcon`  | `more` \| `plus` \| `search` \| `settings` | `more`     |      |
| `actionLabel` | string                                     | `更多操作` |      |

## States（Playground / Contract）

- `no-back` — 无返回

## Slots / Events

- **Slots**：`append`
- **Events**：`back`, `action`

## tokenBindings

| 槽位                | Token                 |
| ------------------- | --------------------- |
| `surface`           | `color.surface`       |
| `border`            | `color.border`        |
| `text`              | `color.on-surface`    |
| `elevation`         | `elevation.card`      |
| `title`             | `typography.subtitle` |
| `padding`           | `spacing.md`          |
| `safeInsetFallback` | `spacing.none`        |
| `restingElevation`  | `elevation.none`      |
| `iconSize`          | `sizing.icon-md`      |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/navigation/...` 引入实现组件。
2. Props 保持在契约枚举内；需要新能力先改 contract + registry + 本文。
3. 业务原型作为 Evidence 使用时必须传业务稳定 `inspectId`；默认 `ds.*` 只用于 Playground、组件测试或非业务预览。
