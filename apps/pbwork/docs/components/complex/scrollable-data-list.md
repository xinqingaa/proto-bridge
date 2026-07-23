# Scrollable Data List

> 组件 id：`scrollable-data-list` · 分类：`complex`
> 实现：`apps/pbwork/src/design-system/components/complex/ScrollableDataList.vue`
> 契约：`apps/pbwork/src/design-system/components/contracts/scrollable-data-list.json`

列表滚动壳：下拉刷新、触底加载、可选鼠标拖拽纵滚。外观列表段请再包 `DataList`。

## 职责

- **做什么**：需要下拉刷新、触底加载或受控纵滚的页面/面板。
- **边界**：唯一纵滚壳；`refreshing`/`loadingMore`/`hasMore` 业务受控。不透传 DataList 外观 props。
- **不要用于**：不需要滚动语义的静态片段（直接 DataList 或普通布局）。

## Props

| Prop | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `pullRefresh` | boolean \| { enabled: boolean, threshold: number, maxDistance: number, mouse: boolean } | `true` | |
| `loadMore` | boolean \| { enabled: boolean, rootMargin: string, manualFallback: boolean } | `true` | |
| `dragScroll` | boolean \| { enabled: boolean, mouse: boolean, momentum: boolean } | `false` | |
| `refreshing` | boolean | `false` | |
| `loadingMore` | boolean | `false` | |
| `hasMore` | boolean | `true` | |
| `disabled` | boolean | `false` | |

### 配置对象

- `pullRefresh`: `boolean` 或 `{ enabled, threshold?, maxDistance?, mouse? }`（默认 threshold 64、maxDistance 112、mouse false）
- `loadMore`: `boolean` 或 `{ enabled, rootMargin?, manualFallback? }`
- `dragScroll`: `boolean` 或 `{ enabled, mouse?, momentum? }`（鼠标拖拽纵滚；滚轮保持原生）
- `refreshing` / `loadingMore` / `hasMore` 由业务受控；触底有重复锁
- **loading / empty / error 整页态**应将 `pullRefresh` / `loadMore` / `dragScroll` 关闭（`enabled: false` 或布尔 false）

## States（Playground / Contract）

- `refreshing` — 刷新中
- `loading-more` — 加载更多
- `complete` — 没有更多

## Slots / Events

- **Slots**：`default`, `refresh-indicator`, `load-footer`, `no-more`
- **Events**：`refresh`, `load-more`

## tokenBindings

| 槽位 | Token |
| --- | --- |
| `background` | `color.background` |
| `primary` | `color.primary` |
| `muted` | `color.on-surface-muted` |
| `footer` | `typography.caption` |
| `duration` | `motion.duration-normal` |

切浅色/深色只改 Theme 覆盖值，不改本表绑定。

## 用法要点

1. 从 `@/design-system/components/complex/ScrollableDataList.vue` 引入。
2. 与 `DataList` 分层组合；手势仲裁见 [shared-gestures.md](../shared-gestures.md)。
3. 父级含本组件时设 `overflow: hidden`，保证唯一纵滚。
4. 原型内建议传稳定 `inspectId`。

