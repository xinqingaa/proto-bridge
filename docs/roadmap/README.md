# 产品演进 Roadmap

本目录记录当前产品基线之上的计划性演进。Roadmap 用于评审范围、优先级、投入、依赖和退出标准，不代表能力已经实现，也不建立现行 Contract 或 Block。

当前 PB/PBWork 核心 Evidence 链路已经验收。现行行为以 `docs/product`、`docs/architecture`、`docs/reference` 和可执行 Schema 为准；设计取舍及理由仍进入 `docs/decisions`。

| 全局优先级 | 状态 | Roadmap | 目标投入 | 主线 |
| --- | --- | --- | --- | --- |
| P2 | Deferred | [官方 Flutter MCP 与分级 Target 验收](./flutter-mcp-target-review.md) | 暂不投入 | 保留实验代码与复盘；满足恢复条件后重新 spike |
| P2 | Delivered | [PBWork 原型生命周期管理](./prototype-lifecycle-and-release.md) | 已完成 | PBWork 四阶段职责、定稿自动整原型采集、回退清理、归档终态与生命周期控制台 |

## 状态定义

- `Planned`：范围和顺序可评审，尚未成为现行能力；
- `In Progress`：已经开始实施，只有落地部分可同步到现行文档；
- `Delivered`：主线退出标准已满足，未完成探索项已明确转入后续计划；
- `Deferred`：当前不投入，保留评审结果和恢复条件；
- `Superseded`：由新的 Roadmap 替代，并链接替代项。

Roadmap 状态变化不替代代码、测试、Acceptance 或权威文档中的事实状态。
