# 架构说明

ProtoBridge 采用 capability-first 架构。CLI、MCP 和 core API 是不同入口；source 分析、runtime capture、target inspect、planning、review 和 validation 都沉淀为共享 core capabilities。

```text
CLI / MCP / Core API
  -> capability orchestration
  -> unified page context
  -> implementation artifacts
  -> target implementation
  -> validation
```

## 核心术语

| 术语 | 定义 |
| --- | --- |
| Mode | 入口形态。CLI 是终端入口，MCP 是 agent/tool 入口，core 是嵌入式库入口。 |
| Workflow | 面向输入组合的预设能力编排，例如 source-only、runtime-only、hybrid、screenshot/OCR 或 validation。 |
| Capability | 有稳定职责和数据边界的可复用 core 操作。 |
| Artifact | 给人、agent 或工具继续消费的持久化输出。 |

这组边界让入口保持简单，同时避免每个入口都被锁死在一条固定 workflow 上。

## 包边界

```text
packages/
├── core/
├── cli/
└── mcp-server/
```

- `packages/core`：capabilities、workflow 编排、source/snapshot/target 实现、artifact writers 和共享类型。
- `packages/cli`：命令解析、config 读取、终端输出，以及调用 core。
- `packages/mcp-server`：MCP stdio 协议、tools、resources、prompts、session state，以及调用 core。

入口包负责输入输出适配。产品逻辑应放在 `packages/core`。

## 原型平台与客户端对应关系

ProtoBridge 的核心假设之一是：交互原型平台不是一次性 demo，而是产品、UI 和客户端共同认可的工程化输入。

在理想模式下：

- 原型组件与客户端组件存在明确对应关系。
- 原型主题 token 与客户端 theme token 存在明确对应关系。
- 原型页面结构、状态和交互能通过源码或运行时证据被采集。
- 客户端 target repo 中的 modules、routes、components、theme、i18n 和 assets 是落地实现的约束。

因此，`source.analyze` 的价值不只是读取源码文件，而是提取原型平台里的结构、状态、组件和 token 意图；`target.inspect` 和 `ui.plan` 则负责把这些意图映射到客户端工程规范中。

## Capability 分层

```text
source.analyze
runtime.capture
screenshot.attach
target.inspect
page.merge
ui.plan
ui.review
ui.validate
```

| Capability | 读取 | 写入 |
| --- | --- | --- |
| `source.analyze` | source root、route、Vue SFC path | source facts：页面身份、sections、state space、interactions、assets、style intent |
| `runtime.capture` | running URL、viewport | runtime facts：visible nodes、bbox、computed style、assets、interactions、screenshots |
| `screenshot.attach` | screenshot path、OCR text/boxes | screenshot facts 和 OCR evidence |
| `target.inspect` | Flutter target root | target facts：modules、routes、theme、components、assets、examples |
| `page.merge` | source/runtime/screenshot/target facts | `page-canonical.json`、`page-debug-index.json` |
| `ui.plan` | canonical page、target facts | `ui-build-plan.json` |
| `ui.review` | canonical page、UI plan | `ui-build-review.md` |
| `ui.validate` | target diff、plan expectations | validation result |

Capability 的粒度小于完整 workflow。CLI 命令或 MCP tool 可以根据可用输入组合它们。

## 字段级优先级

ProtoBridge 不把某一类证据源整体视为绝对优先，而是按字段类型决定优先级：

- Source 更适合表达结构、语义、状态空间、交互意图和设计意图。
- Runtime 更适合表达实际可见性、bbox、computed style、active/open state 和可见文案。
- Screenshot/OCR 更适合表达最终视觉对照和补充文字证据。
- Target repository conventions 更适合表达文件落点、可复用组件、theme tokens、i18n、assets 和 route integration。

证据冲突时，canonical artifact 会保留 provenance，并暴露 mismatches 或 manual confirmations，而不是隐藏冲突。

## 产物

Canonical 产物：

- `page-canonical.json`：完整页面事实模型，包含 facts、merge metadata、provenance、trace、warnings、nodes、sections、screenshots 和 artifact references。

Projection 产物：

- `page-debug-index.json`：面向调试的紧凑索引。
- `ui-build-plan.json`：机器可读 target implementation plan。
- `ui-build-review.md`：人类可读 implementation handoff。
- `screenshots/`：runtime visual evidence。
- validation result：CLI/MCP/core validation caller 返回的结构化结果。

Canonical artifact 是真相源。Projection artifacts 针对具体读者和任务优化。

## Core 目录

```text
packages/core/src/
├── capabilities/
├── workflows/
│   └── capability-first/
├── source/
├── snapshot/
├── target/
├── artifacts/
├── shared/
└── types/
```

- `capabilities`：共享能力 facade。
- `workflows/capability-first`：围绕 capabilities 的统一编排。
- `source`：source adapters，例如 Vue prototype analysis。
- `snapshot`：browser capture、OCR attachment 和 evidence enrichment。
- `target`：Flutter conventions、examples、planning 和 validation。
- `artifacts`：JSON 和 Markdown 写出。
- `shared`：跨层工具。
- `types`：共享数据契约。

## 公开 API

推荐使用的 package subpaths：

- `@proto-bridge/core/workflows/capability-first`
- `@proto-bridge/core/capabilities`
- `@proto-bridge/core/target/flutter-app`
- `@proto-bridge/core/source/vue3-prototype`
- `@proto-bridge/core/snapshot`
- `@proto-bridge/core/artifacts`
- `@proto-bridge/core/shared`

需要标准编排时使用 workflow API；需要自定义编排时直接使用 capability APIs。
