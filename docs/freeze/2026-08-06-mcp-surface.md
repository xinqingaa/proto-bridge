# MCP 表面清理：Tools 与 Prompt

- 日期：2026-08-06
- 落地：2026-08-07
- 范围：`packages/mcp-server` 暴露面 vs Consumer projection v4 工作链路
- 状态：**已落地**（过时兼容 tools 已下架；Prompt 未改）

## 一句话

MCP Consumer 表面从约 40 个 tools 收窄为 **27** 个：默认投影链路 + 诊断 plan/tranche + Target + Authoritative Review。整包 Snapshot / Case / revision / Catalog / Acceptance Contract 等兼容入口已删除。Prompt 仍为单一 `consume_evidence_handoff`（Core `buildAgentPrompt` 五段同源）。

## 默认工作链路（现行）

```text
inspect_evidence_workspace
  → read_handoff_index
  → read_screen_packet（含 canonicalBrief / inventory）
  → read_evidence_screenshot
  → inspect_target_readiness + resolve_target_*
  → 按需 read_case_delta / read_evidence_detail
  → 编辑前白话摘要与实现计划 → 等待用户批准
  → 自主实施 + validate_target_changes
  → 实施后 read_reconstruction_obligations / summarize_reconstruction_review
  → 需要时 authoritative Review（start_target_review … finalize）
```

`read_implementation_plan` / `read_implementation_tranche`：**非默认实施路径**，仅诊断。

## 已删除（13）

`list_evidence_bundles`、`list_evidence_history`、`read_evidence_snapshot`、`read_evidence_case`、`read_evidence_run`、`read_evidence_revision`、`read_evidence_fragment`、`read_evidence_catalog`、`read_evidence_issue`、`read_evidence_staleness`、`read_agent_handoff`、`read_evidence_blob`、`read_acceptance_contract`

另：整包 Snapshot MCP resource template 已移除；Screenshot resource 保留。

## 保留

见 [MCP README](../../packages/mcp-server/README.md) 与 [Agent 消费指南](../guides/agent-consumption.md)。

## 非目标（仍成立）

- 不改 Consumer projection v4 默认读取语义。
- 不增强 / 不拆 Prompt。
- Catalog revision / Acceptance Contract 仍为 Store 内部对象；仅不再作为 MCP Agent 入口。
