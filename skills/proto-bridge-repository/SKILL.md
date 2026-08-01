---
name: proto-bridge
description: >-
  Modify ProtoBridge Core contracts, Capture, Store, Local Service, CLI, MCP,
  Target query/validation, repository documentation, or product regression tests.
---

# ProtoBridge 仓库 Skill

## 必读

1. `AGENT.md`
2. `docs/README.md`
3. 按任务阅读：
   - Contract/Store → `docs/architecture/evidence-model.md`
   - Capture/Runtime → `docs/architecture/capture-pipeline.md`
   - Semantic authoring/门禁 → `docs/reference/semantic-authoring.md`
   - CLI/MCP/Service → `docs/architecture/proto-bridge.md`
   - 文档 → `docs/maintenance/documentation.md`

## 落点

```text
packages/core/src/v2/                  Contract / Capture / Store
packages/core/src/target/flutter-app/  Target query / validation
packages/local-service/                browser ↔ Node process boundary
packages/cli/                          Producer CLI
packages/mcp-server/                   Consumer MCP
apps/pbwork/                           Runtime and Capture control plane
```

## 硬约束

- 产品语义只进入 Core。
- 入口不维护第二套 Selection、状态、risk、Case identity 或引用算法。
- Store 历史对象不可变，Handoff 固定 Snapshot/revision。
- unknown、conflict、partial、stale 和 unsupported 对用户与 Agent 可见。
- 只有 authored Runtime Contract 可以声明 required boundary。
- Target 扫描只读且不污染 Evidence。
- MCP 不暴露 Store 布局，不用 active/latest 替代固定引用。

## 文档同步

修改公共 Schema、命令、Tool、Resource、Prompt、配置、环境变量、目录或产品边界时，先查 `docs/maintenance/documentation.md` 的所有权矩阵，并在同一任务更新权威文档。

主体文档只描述当前产品；迁移背景写入 `docs/history`，设计理由写入 `docs/decisions`。

## 验证

按改动运行范围测试，并在完成前执行：

```bash
pnpm docs:verify
pnpm verify
```
