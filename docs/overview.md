# ProtoBridge 架构总览

ProtoBridge 的核心产物是可追溯 Evidence，不是目标工程实现计划。

```text
Registry + authored Runtime Contract
  → Selection Draft
  → Preflight / stable Case Matrix
  → isolated Capture
  → immutable Run / revision / Snapshot / Blob
  → Handoff
  → MCP fixed read
  → Coding Agent + Target validation
```

## 进程与职责

| 边界 | 职责 |
| --- | --- |
| PBWork Runtime | 声明 Screen/Variant/Action/Scenario，准备状态，返回稳定语义节点 |
| Core Capture | 展开 Matrix、固定环境、采集、判断完整性并提交 Store |
| Local Service | 连接浏览器 PBWork 与 Node/Playwright/Store |
| PBWork | 选择、预检、后台任务、Evidence Review、重采与 Handoff |
| CLI | 使用相同 Core 能力执行自动化生产和 Bundle 生命周期 |
| MCP | 按固定 Workspace/Snapshot/revision 只读消费 Evidence |
| Target boundary | 独立扫描和验证目标仓库，不参与 Capture，不写 Evidence |

## Evidence 原则

- 稳定 Case identity 与一次采集的 revision 分离；
- Run、revision、Snapshot、Staleness Report 与 Handoff 不可变；
- active successful Evidence 与 latest Attempt 分离；
- unknown、conflict、partial、unsupported 和 stale 不得被推断覆盖；
- Handoff 固定 Snapshot 和具体 revision，禁止 latest fallback；
- Screenshot Blob 必须具有可验证 owner ref；
- 目标工程不需要 ProtoBridge 配置。

## 原型合规

PBWork 中没有进入 `LEGACY_EVIDENCE_SCREEN_IDS` 的 Screen 默认执行严格门禁：

- default 与 critical Variant 必须声明非空 `requiredFragments`；
- Fragment 使用稳定 `screenId + pbId + optional pbKey`；
- Runtime 必须能够 prepare、readiness、semantic-snapshot 和 reset；
- 关键交互使用 Action、Scenario 和 Checkpoint；
- required Fragment 必须在真实浏览器中可见并具有有效 bbox；
- Capture 同时保存语义 Facts、provenance 与截图。

当前回归样本为账本星球 `task-list`、`task-detail`、`ledger-list`。其他现有页面可继续展示，但不作为闭环质量证明。

## 包边界

```text
packages/core/src/v2/                  Contract / Capture / Store
packages/core/src/target/flutter-app/  Target query / validation
packages/local-service/                PBWork local process boundary
packages/cli/                          Evidence Producer CLI
packages/mcp-server/                   Evidence Consumer MCP
apps/pbwork/                           Runtime + Capture control plane
```

旧 PageCanonical、Planner、Artifact writer、Source Adapter、CLI generate 和 page-centric MCP 工作流已删除。
