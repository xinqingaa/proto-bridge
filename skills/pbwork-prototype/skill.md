---
name: pbwork-prototype
description: >-
  Build or change PBWork Vue prototypes and design-system usage in apps/pbwork.
  Covers tokens, themes, basic/complex components, TabViewport, Tabs,
  ScrollableDataList, nested gestures, shells, screens, and variants.
  Use when the user asks to create or modify a pbwork prototype, screen, panel,
  shell, or DS component usage.
---

# PBWork 原型 Skill

在 **`apps/pbwork`** 做或改业务原型、原型页面壳、原型面板，以及原型设计系统组件用法时使用。

改 ProtoBridge Core / CLI / MCP / 产物契约时用 `skills/proto-bridge`，不要用本 skill 替代。
改 PBWork 管理工作壳、采集任务、证据 Review 或 `src/workbench/ui` 时用
`skills/pbwork-workbench/SKILL.md`；工作壳不得复用带原型采集标记的设计系统组件。

## 必读顺序

1. `apps/pbwork/docs/README.md`  
2. `apps/pbwork/docs/principles.md`  
3. `apps/pbwork/docs/components/composition.md`  
4. 按任务选读：  
   - Token / 主题 → `docs/tokens/overview.md`、`catalog.md`、`themes.md`  
   - 具体组件 → `docs/components/basic|complex/{id}.md`  
   - 横滑 / 下拉刷新 / 嵌套横滚 → `docs/components/shared-gestures.md`  
   - 壳 / 导航 / Variant / 配方 → `docs/prototypes/shell-and-nav.md`、`screens-and-variants.md`、`recipes.md`  
5. 提交前对照 `apps/pbwork/docs/checklist.md`  

仓库根 `docs/pbwork` 是上述目录的软链接，路径等价。

## 硬约束（摘要）

- 形状匹配时优先 DS 组件；外观走 Token，禁止实例换绑。  
- `BottomNavigation` 只导航；一级面板用 `TabViewport`。  
- 一级主体 Tab 子视图内禁止再嵌套带 window 的 `Tabs`；维度切换用无 window 分段。  
- 列表：`ScrollableDataList` + `DataList`，勿合并职责；状态页关闭刷新手势。  
- 禁止页内自造手势仲裁；复用 `_shared` 与 ScrollableDataList。  
- 多 Tab + 栈遵守 `docs/prototypes/shell-and-nav.md`；`keepMounted` 下 ownsVariant；theme ≠ variant。  
- Screen / Variant 写入 `prototypes/registry.ts`；稳定 `data-pb-id` / `inspectId`。  
- 只把已稳定的通用规则写入 docs；未定稿视觉口味不要写成铁律。  

## 改动落点

| 改什么 | 落点 | 同步 |
| --- | --- | --- |
| 业务页面 | `src/prototypes/{id}/` | registry、按需 requirements |
| 组件行为 | `contracts` + Vue + `registry.ts` | `apps/pbwork/docs/components/**` |
| Token | `tokens.json`、`bindTokens.ts`、themes | `docs/tokens/**` |
| 手势 | `_shared/*`、ScrollableDataList | `shared-gestures.md` + 测试 |

## 验证

```bash
pnpm --filter @proto-bridge/pbwork test
pnpm --filter @proto-bridge/pbwork typecheck
```

涉及手势时至少跑 `pointer-gestures` 相关测试；涉及原型交互时按该原型 e2e / 手工清单验收。
