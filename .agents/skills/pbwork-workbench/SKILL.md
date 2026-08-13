---
name: pbwork-workbench
description: >-
  Build or modify the PBWork management shell, navigation, canvas, inspector,
  prototype management, Capture Console, Deliver FlowSheet, task center,
  Evidence Review, or workbench-only UI primitives.
---

# PBWork 工作壳 Skill

用于 PBWork 管理 GUI，不用于业务 Prototype Screen 或 Prototype Design System。

## 必读

1. `docs/architecture/pbwork.md`
2. `docs/guides/pbwork-and-pb.md`
3. `apps/pbwork/docs/development.md`
4. 修改 Evidence 展示时阅读 `docs/architecture/evidence-model.md`
5. 修改 Capture 流程时阅读 `docs/architecture/capture-pipeline.md`
6. 修改语义检查、Inspector 提示或 Preflight 门禁时阅读 `docs/reference/semantic-authoring.md`

## 组件边界

- Workbench 控件从 `src/workbench/ui` 复用或封装。
- 不把临时原生 select、checkbox、input 或不统一 button 放进业务 View。
- 不复用 `src/design-system/components`；它们服务 Prototype Runtime，可能携带采集语义。
- Vuetify 是底层能力，常用 Workbench 控件仍经 `workbench/ui` 收口。
- 一级导航保留可访问名称和 Tooltip，二级导航表达资源层级。

## Capture 与 Evidence

- 产品主路径是「交付到 Agent」（`DeliverFlowSheet`）：范围确认 → 采集 → 结果/风险 → Agent 提示词，并写入 `.proto-bridge/deliveries/`。
- Deliver 可自动预检；开始交付必须明确确认。warning / risk 逐项确认，不提供全局跳过。
- 入口只生成同一种 Core Selection Draft；与 CLI `deliver` 共用 Core。
- Job、Run、Attempt、revision 和 Snapshot 的状态来自 Core Contract。
- 任务中心保留后台历史；Evidence Review 用于按需详情；交付进度默认留在 Deliver Sheet。
- Evidence 可按 Screen/Case/Fragment 重组展示，但不改写 Store JSON。
- fixed refs、provenance、unknown、conflict、Coverage、Issue 和 risks 始终可追溯。
- 语义检查按权威规范区分 Block/Warning/Info；warning 接受不提升 Evidence，Block 不提供绕过入口。
- Inspector 临时 handle 不能持久化；Fragment 使用稳定 identity。

## Bridge

- 校验 origin、source window、runtimeId 和 requestId。
- iframe load 后重新握手，旧消息失效。
- 路由同步使用明确 push/replace/back 语义，不用任意时间窗口猜测。
- Workbench Bridge 与 Capture Protocol 不混用。

## 验证

```bash
pnpm --filter @proto-bridge/pbwork typecheck
pnpm --filter @proto-bridge/pbwork test
pnpm docs:verify
```

交互变化补跑对应 Playwright spec，并检查滚动、焦点、空态、失败态、键盘和深浅主题。
