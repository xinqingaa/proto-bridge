# 一次性验收记录

本目录保存特定日期、原型和目标工程的一次性人工验收记录，用于追溯问题和验证路径。

这些文件：

- 不是当前产品规范；
- 不定义公共 Contract、role、Token binding 或命令；
- 不应被新原型复制为模板；
- 与当前文档冲突时，以 `docs/product`、`docs/architecture`、`docs/reference`、PBWork 手册和可执行 Schema 为准。

原型被删除后可以保留验收记录；若记录已无追溯价值，应在独立清理任务中删除，不在协议或文档收敛任务中顺带改写历史。

## 模板

- [人工五维保真对照模板](./templates/human-fidelity-acceptance.md)

触发时机：实施会话已结束，且操作者明确要求「生成人工验收骨架/归档」。  
硬边界：仅写入 `docs/acceptance/runs/...`；不得写回 Prompt / Skill / MCP；不得驱动 Agent 按验收文档改代码。

## 记录

- [2026-08-03 冷链原型高保真还原：现状诊断、边界与优化规划](./2026-08-03-cold-chain-reconstruction-audit-and-optimization-plan.md)
- [2026-08-05 Phase 5R：还原义务与系统性质量门禁](./2026-08-05-phase-5r-system-remediation.md)
- [2026-08-06 5R 减法收敛](./2026-08-06-5r-subtraction-convergence.md)
- [2026-08-05 冷链人工验收](./runs/2026-08-05-cold-chain-manual-acceptance-01/manual-acceptance.md)
- [2026-08-05 冷链 V6 实施回查](./runs/2026-08-05-cold-chain-v6-implementation-review-01/manual-acceptance.md)
- [2026-08-06 5R 减法人工对照清单](./runs/2026-08-06-5r-subtraction-manual-checklist/manual-acceptance.md)
- [2026-08-06 冷链 ops_evidence 人工五维对照](./runs/2026-08-06-cold-chain-ops-evidence-human-fidelity-01/manual-acceptance.md)
