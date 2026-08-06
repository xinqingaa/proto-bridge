# 一次性验收记录

本目录只保存特定日期、原型和目标工程的一次性人工验收记录，以及生成这些记录所用的模板。

这些文件：

- 不是当前产品规范；
- 不定义公共 Contract、role、Token binding 或命令；
- 不描述默认消费/实施流程（见 [产品工作流](../product/workflow.md) 与 [Agent 消费指南](../guides/agent-consumption.md)）；
- 与当前文档冲突时，以 `docs/product`、`docs/architecture`、`docs/reference`、PBWork 手册和可执行 Schema 为准。

## 模板

- [人工五维保真对照模板](./templates/human-fidelity-acceptance.md)

触发时机：实施会话已结束，且操作者明确要求「生成人工验收骨架/归档」。  
硬边界：仅写入 `docs/acceptance/runs/...`；不得写回 Prompt / Skill / MCP；不得驱动 Agent 按验收文档改代码。

## 记录

- [2026-08-06 冷链 ops_evidence 人工五维对照](./runs/2026-08-06-cold-chain-ops-evidence-human-fidelity-01/manual-acceptance.md)
