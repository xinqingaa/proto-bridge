# 产品演进 Roadmap

本目录记录当前产品基线之上的计划性演进。Roadmap 用于评审范围、优先级、投入、依赖和退出标准，不代表能力已经实现，也不建立现行 Contract 或 Block。

当前 PB/PBWork 核心 Evidence 链路已经验收。现行行为以 `docs/product`、`docs/architecture`、`docs/reference` 和可执行 Schema 为准；设计取舍及理由仍进入 `docs/decisions`。

| 全局优先级 | 状态 | Roadmap | 目标投入 | 主线 |
| --- | --- | --- | --- | --- |
| P0 | Planned | [官方 Flutter MCP 与 Target 验收增强](./flutter-mcp-target-review.md) | 约两周 | 官方 MCP provider、固定 Target receipt、模拟器/真机截图与交互验收、OCR 诊断 |
| P2 | Planned | [PBWork 原型生命周期与 Release 管理](./prototype-lifecycle-and-release.md) | 待单独排期 | 稳定 Prototype identity、不可变 v1/v2 Release、定稿采集与 Archive |

## 状态定义

- `Planned`：范围和顺序可评审，尚未成为现行能力；
- `In Progress`：已经开始实施，只有落地部分可同步到现行文档；
- `Delivered`：主线退出标准已满足，未完成探索项已明确转入后续计划；
- `Deferred`：当前不投入，保留评审结果和恢复条件；
- `Superseded`：由新的 Roadmap 替代，并链接替代项。

Roadmap 状态变化不替代代码、测试、Acceptance 或权威文档中的事实状态。
