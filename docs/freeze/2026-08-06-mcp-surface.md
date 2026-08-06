# MCP 表面清理：Tools 与 Prompt

- 日期：2026-08-06
- 范围：`packages/mcp-server` 暴露面 vs Consumer projection v4 工作链路
- 依据：[Agent 消费指南](../guides/agent-consumption.md)、[渐进消费](../history/progressive-evidence-consumption.md)、`packages/mcp-server/src/tools/registry.ts`、`packages/core/src/v2/prompts/`
- 状态：封板前待决（未改代码）

## 一句话

约 40 个 MCP tools 中，默认工作链路只需十几个；文档已标「兼容/debug」的一批对 Consumer **无默认价值**。清理兼容面优先于再拆多个 Prompt；Prompt 以增强现有一个为主，最多再拆出一个 Review Prompt。

## 默认工作链路（现行，勿改语义）

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

## Tool 分层

### A. 默认消费 / 实施（保留）

| Tool | 角色 |
| --- | --- |
| `inspect_evidence_workspace` | Workspace / capability / 契约握手 |
| `read_handoff_index` | 默认入口：refs、risks、Screen/图地图 |
| `read_screen_packet` | 单屏 baseline + canonicalBrief + inventory |
| `read_evidence_screenshot` | MCP ImageContent |
| `inspect_target_readiness` | 编辑前 coverage / authority / blockers |
| `resolve_target_components` / `resolve_target_tokens` | 批量落点 |
| `read_case_delta` | 非 baseline 语义 patch |
| `read_evidence_detail` | 明确未决时定向展开 |
| `read_target_conventions` / `find_target_examples` | 批准后目标上下文 |
| `validate_target_changes` | 变更校验 |
| `read_reconstruction_obligations` | 实施后五维义务分页 |
| `summarize_reconstruction_review` | 覆盖汇总（非评分） |

### B. Authoritative Review（保留；阶段不同）

`start_target_review`、`read_target_review`、`read_review_obligations`、`verify_target_claims`、`render_target_case`、`replay_target_scenario`、`compare_target_artifacts`、`record_review_assessments`、`record_review_findings`、`request_review_tranche`、`finalize_target_review`

首轮实现不必默认调用；闭环验收需要，清理时不要当死代码删除。

### C. 诊断残留（能力契约仍声明）

| Tool | 说明 |
| --- | --- |
| `read_implementation_plan` | 仍在 `CONSUMER_PROJECTION_CAPABILITIES`；易被误当编排入口 |
| `read_implementation_tranche` | 同上 |

取舍：硬删则同步降 capability + 合同测试；或保留并继续强化「禁止默认调用」。

### D. 兼容 / debug（默认链路零价值 — 清理主战场）

文档与默认 Prompt 均不走此路径。e2e（`scripts/test-mcp-evidence.mjs` 等）仍调用，删除需改测试。

| Tool | 默认链路价值 | 建议 |
| --- | --- | --- |
| `read_acceptance_contract` | 无（已被 obligations/review 取代；膨胀风险最高） | P0 删或隐藏 |
| `read_evidence_snapshot` | 无（整包反模式） | P0 |
| `read_evidence_case` | 无（packet/delta/detail 覆盖） | P0 |
| `read_agent_handoff` | 基本无（index 已含 refs/risks） | P1 |
| `read_evidence_blob` | 弱（视觉应走 screenshot） | P1 |
| `read_evidence_revision` / `read_evidence_fragment` | 弱 | P1 |
| `list_evidence_bundles` / `list_evidence_history` | 弱（诱惑 active/latest） | P1 |
| `read_evidence_run` | 无（Capture 内部） | P1 |
| `read_evidence_issue` | 弱（Producer/运维） | P1 |
| `read_evidence_staleness` | 弱（index 已有 freshness + reportId） | P1 |
| `read_evidence_catalog` | 有条件（指南仍要求 Catalog 依赖时读固定 revision） | 暂留，或并入 packet 后再删 |

## Prompt 现状与建议

- MCP 仅一个 Prompt：`consume_evidence_handoff`（`buildAgentPrompt`：consumer + target + discipline + verification + final-report）。
- Deliver `agent-prompt.md` 同源；权威纪律仍以 `proto-bridge://guides/handoff-consumer` 为准。

| 选项 | 必要性 | 结论 |
| --- | --- | --- |
| 增强现有 1 个 | 高 | 黑名单兼容 tools；强调 readiness；plan/tranche 禁止默认；Review 标为实施后 |
| 拆成 2 个 | 可选 | `consume_evidence_handoff`（读证→批准→实施）+ `authoritative_target_review` |
| 拆成 3+ 个 | 低 | 与「按需靠投影契约」原则冲突，且与 Deliver 单提示词不一致 |

原则：**接口不提供整包默认路径** 硬于 Prompt 纪律；故 **先清 D 类 tools，再增强 Prompt**。

## 建议落地顺序（封板可勾选）

1. [ ] 对齐运行中 MCP 与源码（当前挂载 catalog 曾缺 readiness/plan/tranche，疑 dist 未重建）
2. [ ] P0：去掉或 debug 门禁 `read_acceptance_contract` / snapshot / case
3. [ ] P1：其余 D 类兼容 tools（catalog 暂留）
4. [ ] P2：plan/tranche 硬删或继续诊断保留 + 合同同步
5. [ ] Prompt 增强；若需要再拆 Review Prompt
6. [ ] 同步：`packages/mcp-server/README.md`、`docs/guides/agent-consumption.md`、e2e/合同脚本；本条目归档或删除

## 非目标

- 不改 Consumer projection v4 默认读取语义。
- 不把本文件提升为操作手册；落地后权威仍在 guides / MCP README。
