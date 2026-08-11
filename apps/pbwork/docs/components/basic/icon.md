# Icon

> 组件 id：`icon` · 分类：`basic`  
> 实现：`apps/pbwork/src/design-system/components/basic/Icon.vue`  
> 契约：`apps/pbwork/src/design-system/components/contracts/icon.json`

Lucide 常用图标；按稳定 `name` 渲染，尺寸与颜色走 Token。

## 职责

- **做什么**：在按钮、空态、导航等处展示策展清单内的图标。
- **边界**：不是可点控件；可点操作用 `icon-button`。
- **不要用于**：引入第二图标包或任意 Lucide 全量名。

## 行为要点

- `name` 仅允许 DS 策展清单（Contract / `_shared/icons.ts`）。
- 无 `label` 时按装饰图标（`aria-hidden`）。
- Props 与 Token 槽以 Contract 为准。

## States

Playground：`presentation: gallery` — 默认 + 各 `name` 平铺。

常用 id：`more` `plus` `search` `settings` `home` `list` `user` `inbox` `check` `chevron-down` `chevron-right` `alert-triangle` `alert-circle` `clock` `refresh-cw` `clipboard-check` `shield-check` `folder-open` `thermometer` `snowflake` `copy` `file-text` `sliders-horizontal`。

## 用法要点

1. 从 `@/design-system/components/basic/Icon.vue` 引入，或经 `icon-button` / `empty-state` 间接使用。
2. 新增常用图标：先扩 `_shared/icons.ts` + Contract enum/states，再改调用方。
