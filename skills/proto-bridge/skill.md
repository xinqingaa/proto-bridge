---
name: proto-bridge
description: Use when modifying ProtoBridge Evidence contracts, Capture, Store, CLI, MCP, Local Service, Target query/validation, docs, or product regression tests.
---

# ProtoBridge 仓库 Skill

## 必读

1. `AGENT.md`
2. `docs/overview.md`
3. `docs/artifacts.md`
4. `docs/usage.md`
5. 相关 `docs/plans/pb-v2-spec.md`

## 落点

```text
packages/core/src/v2/                  Evidence Contract / Capture / Store
packages/core/src/target/flutter-app/  Target query / validation
packages/local-service/                PBWork process boundary
packages/cli/                          Producer CLI
packages/mcp-server/                   Consumer MCP
apps/pbwork/                           Runtime / Capture control plane
```

## 硬约束

- 产品语义只进入 Core；
- 入口不得维护第二套 Selection、状态枚举、risk 或引用解析；
- Store 历史对象不可变，Handoff 固定 Snapshot/revision；
- unknown、conflict、partial、stale 和 unsupported 对用户与 Agent 可见；
- Source 不是完整性证明；只有 authored Runtime Contract 可以声明 required boundary；
- Target 扫描只读且不污染 Evidence；
- MCP 不暴露 Store 路径，不使用 active/latest 替换固定引用；
- 不恢复 PageCanonical、Planner、Artifact writer 或 page-centric 工作流。

## 改动同步

| 改动 | 同步 |
| --- | --- |
| Evidence Schema/引用 | `docs/artifacts.md`、核心规范、tests |
| CLI | `packages/cli/README.md`、`docs/usage.md` |
| MCP | `packages/mcp-server/README.md`、Consumer 指南 |
| 原型 Contract | `skills/pbwork-prototype`、PBWork docs/checklist |
| 产品边界 | `docs/overview.md`、`AGENT.md` |

完成前运行 `pnpm verify`。
