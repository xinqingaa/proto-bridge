---
name: pbwork-workbench
description: >-
  Build or change the PBWork management shell and its own UI primitives.
  Covers navigation, prototype management, capture composer, task center,
  evidence review, canvas toolbar, inspector, and apps/pbwork/src/workbench/ui.
  Use for PBWork platform UX rather than business prototype pages.
---

# PBWork 工作壳 Skill

用于 `apps/pbwork` 的管理工作壳、采集控制面与证据检查，不用于业务原型页面。

## 必读

1. `docs/design.md` 的工作台壳、导航与 Runtime 边界。
2. `docs/plans/pbwork-pb-v2-workflow.md` 的 Capture 操作闭环。
3. 相关实现与测试；改证据语义时同时读 V2 Evidence Read Model。

## 组件边界

- 工作壳控件统一从 `src/workbench/ui/` 复用或封装。
- 不直接把原生 `select`、`checkbox` 或样式不统一的临时按钮放进业务视图。
- 不复用 `src/design-system/components/` 的原型组件；它们服务 Runtime，
  可能携带 `data-pb-*` 采集语义。
- Vuetify 是工作壳底层能力，不是页面直接随意选择样式的理由。常用按钮、
  图标按钮、选择框、勾选框和输入框必须经工作壳组件收口。
- 一级导航只显示图标，必须保留可访问名称和 Tooltip；二级导航表达资源层级。

## Capture 与 Evidence

- 用户打开采集 Sheet 后自动执行范围检查；真正启动采集始终需要明确确认。
- Prototype 级策略一次设置，只有例外 Screen 才逐项覆盖。
- 任务中心先回答“现在要处理什么”，任务详情与结果 Review 分开。
- 结果以采集记录为主轴，Prototype 是来源和筛选维度。
- Evidence 默认按 Screen → Case → 语义区域映射展示；原始事实顺序和 ID
  必须可追溯，不改写 Store 中的 JSON。
- 无稳定 `data-pb-id` 时，优先使用明确显示的稳定语义祖先；没有可采祖先时
  禁用 Fragment 采集并解释替代入口。

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
```

改交互后补跑对应 Playwright E2E，并在真实工作台宽度下检查滚动、焦点、
空态、失败态和深浅主题。
