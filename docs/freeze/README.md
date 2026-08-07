# 封板梳理

本目录用于封板前的开放项归纳：盘点、取舍草案、清理优先级。**不是**产品权威文档。

- 现行消费顺序与 Tool 语义：仍以 [Agent 消费指南](../guides/agent-consumption.md)、[产品工作流](../product/workflow.md)、[MCP README](../../packages/mcp-server/README.md) 为准。
- 已收敛的设计背景：见 [渐进消费](../history/progressive-evidence-consumption.md) 与 `docs/decisions/`。
- 本目录条目落地为产品变更后：更新权威文档与测试，再删除或归档对应条目。

## 开放项

| 条目 | 状态 | 说明 |
| --- | --- | --- |
| [MCP 表面清理](./2026-08-06-mcp-surface.md) | 已落地 | 过时兼容 tools 已下架（40→27）；Prompt 未拆分 |
| [结构断言 vs 观测拓扑](./2026-08-06-structure-assertions.md) | 已落地 | 删冷链冗余断言；文档默认不写；e2e 钉观测 |
| [PBWork 产品重置](./2026-08-06-pbwork-product-reset.md) | 待决 | DS 精修、原型收敛、采集交互重做 |

后续条目按 `YYYY-MM-DD-主题.md` 追加到此表。
