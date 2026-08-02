# ProtoBridge 文档

ProtoBridge（PB）把可交互原型转化为可追溯、可固定引用的 Evidence，供 Coding Agent 实现和验证目标工程。PBWork 是 PB 的图形工作台、原型生产环境和 instrumented Runtime。

## 按任务阅读

| 任务 | 必读 |
| --- | --- |
| 了解产品与边界 | [产品总览](./product/overview.md) → [完整工作流](./product/workflow.md) |
| 安装并跑通闭环 | [快速上手](./guides/getting-started.md) |
| 使用本地操作脚本 | [本地操作脚本](./guides/operator-scripts.md) |
| 使用 PBWork 采集 | [PBWork 与 PB 协作](./guides/pbwork-and-pb.md) |
| 让 Agent 消费 Evidence | [Agent 消费指南](./guides/agent-consumption.md) |
| 理解 PB 实现 | [系统架构](./architecture/overview.md) → [ProtoBridge 实现](./architecture/proto-bridge.md) |
| 理解 PBWork 实现 | [PBWork 架构](./architecture/pbwork.md) |
| 修改 Contract、Store 或 Capture | [Evidence 模型](./architecture/evidence-model.md) → [采集链路](./architecture/capture-pipeline.md) |
| 在 PBWork 制作原型 | [原型 Authoring Contract](./reference/prototype-authoring.md) → [PBWork 手册](./pbwork/README.md) |
| 标记业务节点与设置门禁 | [语义标记与证据门禁](./reference/semantic-authoring.md) |
| 修改 PBWork Token 或组件 | [PBWork 开发规范](./pbwork/development.md) → [组件总论](./pbwork/components/overview.md) |
| 维护仓库 | [开发规范](./maintenance/development.md) → [文档维护](./maintenance/documentation.md) |
| 理解架构转型背景 | [从 V1 到 Evidence 架构](./history/v1-to-evidence-architecture.md) |

一次性人工验收记录位于 [`docs/acceptance/`](./acceptance/README.md)；它不替代正式指南或产品规范。

## 权威边界

- 产品职责与用户闭环：`docs/product/`
- 当前实现与对象语义：`docs/architecture/`
- 操作步骤：`docs/guides/`
- 跨模块强制契约：`docs/reference/`
- 节点 identity、role、component、Token Evidence 与阻断等级：`docs/reference/semantic-authoring.md`
- PBWork Token、组件、手势和页面组装：`apps/pbwork/docs/`，根目录下的 `docs/pbwork` 是其软链接
- 包级命令和 API：各 `packages/*/README.md`
- 设计取舍及理由：`docs/decisions/`
- 历史迁移：`docs/history/`
- Agent 执行入口：根目录 `AGENT.md` 与 `skills/*/SKILL.md`

同一规则只在所属权威文档中完整定义。其它文档应链接到该规则，不复制一份可独立漂移的说明。
