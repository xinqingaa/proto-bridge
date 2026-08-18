# 架构决策

本目录记录 ProtoBridge 必须长期保持的设计取舍及理由。ADR 解释“为什么”，当前行为与精确契约仍以 `docs/architecture`、`docs/reference` 和可执行 Schema 为准。

| ADR | 决策 |
| --- | --- |
| [0001](./0001-evidence-is-the-product.md) | Evidence 是产品输出 |
| [0002](./0002-authored-completeness-boundary.md) | 完整性由 authored Runtime Contract 声明 |
| [0003](./0003-immutable-fixed-evidence.md) | 历史不可变，消费使用固定引用 |
| [0004](./0004-producer-consumer-target-boundaries.md) | Producer、Consumer 与 Target 单向分离 |
| [0005](./0005-pbwork-foundation-and-component-boundary.md) | PBWork 使用一套严格的设计基础和组件边界 |
| [0006](./0006-explicit-semantic-evidence.md) | 实现相关语义必须显式进入 Evidence |
| [0007](./0007-reconstruction-acceptance-contract.md) | 高保真重建使用独立 Acceptance Contract |
| [0008](./0008-workspace-generation-and-reset.md) | Workspace generation 与绑定式 Reset |
| [0009](./0009-flutter-official-mcp-driver-bridge.md) | Flutter 官方 MCP 使用操作者 DTD URI 与 Driver Bridge |

ADR 被后续决策替代时保留原文，并在状态中链接替代项；不要改写旧决策以伪装从未发生变化。
