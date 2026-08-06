# 5R 减法收敛

- 日期：2026-08-06
- 状态：implemented（代码与契约已落地；人工对照清单见 runs）
- 关联：
  - [Phase 1–5 优化计划](./2026-08-03-cold-chain-reconstruction-audit-and-optimization-plan.md)
  - [Phase 5R 系统补强](./2026-08-05-phase-5r-system-remediation.md)
  - [人工对照清单](./runs/2026-08-06-5r-subtraction-manual-checklist/manual-acceptance.md)

## 结论

Phase 1–5 的渐进消费路径保持 Promote。5R 的验收 hardening 保留；默认实施编排中的 Region tranche 强制与 Agent 面数字索引撤出。默认链路回到：按 Screen 读取语义 → Agent 自主组织代码 → obligations/verifier 实施后复查。

## 精华（保留）

| 项 | 说明 |
| --- | --- |
| Phase 1–5 渐进消费 | Handoff index → Screen packet → delta/detail/screenshot |
| 固定 obligation 分母 | 5R.1；验收不可删减 |
| 五维 verifier | structure / component / token / state / interaction |
| Target readiness + resolver | 编辑前暴露缺口 |
| Consumer contract 单一来源 + drift gate | Prompt asset / MCP guide 一致 |
| 传输类 quality 指标 | payload、重复率、delta amplification、continuation |

## 糟粕（本轮减法）

| 项 | 改法 |
| --- | --- |
| 默认强制 `read_implementation_plan` / `read_implementation_tranche` | 移出默认链路；工具保留为 diagnostic |
| Evidence Region ≡ 实施工作单元 / 目标组件边界 | Consumer contract 显式禁止 |
| Agent 面 `regionIndex` / `caseIndexes` | 改回 `regionId` / `caseId` |
| tranche 分母作为默认质量门禁 | 降为显式诊断项 |
| 业务语义被过度压缩 | Screen packet 增加 `canonicalBrief` |

## 默认链路（改后）

```text
inspect_evidence_workspace
  → read_handoff_index
  → read_screen_packet（含 canonicalBrief）
  → read_evidence_screenshot
  → inspect_target_readiness + resolve
  → 按需 case_delta / detail
  → 编辑前按 Screen 白话理解摘要
  → Agent 自主实施
  → 实施后 obligations / verify / Review
```

## 理解摘要（轻量）

编辑前每个 Screen 用简短散文概括：主结构与滚动边界、组件与 Token 落点意向、状态与交互覆盖。不写评分表、不写固定 Markdown 模版、不把摘要当成验收分母。权威文案在 `handoff-consumer.md`；`agent-prompt.ts` 只保留只读阶段暂停门禁，不新增维度模版。

## 契约变更

- Consumer projection version：`3` → `4`
- continuation 前缀：`pbcp4` / `pbop4`
- Screen packet 新增 `canonicalBrief`
- inventory / case delta / plan tranche 面向 Agent 的引用改为语义 ID

## 非目标

- 不回退 Phase 1–5；不恢复 full-read；不重做 Capture
- 不引入综合还原分数；不把 Flutter/cold-chain 规则写入 Core
- 不强上 5R-G 全量跨样本盲测（另开）

## 验证

- Core：`consumer-projection` / `consumer-quality` 单测
- `consumer-contract:verify`
- MCP E2E：默认路径断言 `canonicalBrief` 与语义 ID；plan/tranche 仅作诊断可用性检查
- 人工对照：见 `runs/2026-08-06-5r-subtraction-manual-checklist`
