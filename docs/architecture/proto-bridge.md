# ProtoBridge 实现

ProtoBridge 的实现分为语义层、执行层、持久化层和消费层。Core 是唯一产品语义来源。

## Core Contract

`packages/core/src/v2/contracts` 使用 Zod 定义持久对象、状态词汇、稳定 ID 和跨对象引用。TypeScript 类型必须从 Schema 推导，入口不得复制枚举或维护兼容形状。

Core Contract 负责：

- Workspace、Bundle、Run、Attempt、Evidence revision、Snapshot、Catalog、Issue、Staleness Report、Handoff 和 Blob；
- Prototype、Screen、Variant、Action、Scenario、Checkpoint、Case 和 Capture Scope；
- Evidence Level、状态、风险和错误码；
- ID 格式、Case identity、Scope key；
- 不可变字段和引用断言。

`packages/core/src/v2/resolver` 负责 active slot 与引用可达性。入口不能自行实现“取最新成功结果”等算法。

## Capture

`packages/core/src/v2/capture` 负责：

- 将不同入口归一为 `SelectionDraft`；
- 从 Runtime manifest 生成 Preflight 和稳定 Case Matrix；
- 校验 warning 接受状态与 Case 容量；
- 用 Playwright 固定浏览器环境并执行 Case；
- 运行 Action、Scenario 和 Checkpoint；
- 生成 Attempt、Evidence revision、Coverage、Issue 和 Snapshot；
- 通过 `CaptureJobHost` 管理后台 Job、取消、失败恢复和重试；
- 按固定 Snapshot 创建 Agent Handoff。

Capture Driver 只报告观测结果。它不能用 Target 扫描或源码命名补齐 required Facts。

## Store

`packages/core/src/v2/store` 实现本地不可变 Store：

- 原子创建 Bundle 和首 Snapshot；
- Run、revision、Snapshot、Catalog、Issue、Staleness Report、Handoff 与 Blob 追加写；
- 单 writer lock；
- active pointer 原子更新；
- orphan Job 终结；
- 容量检查；
- Bundle fork、archive 和安全 clean；
- owner ref 与对象可达性校验。

本地目录结构是实现细节。Producer 可以通过 Core Store API 操作，Consumer 只能通过 MCP 逻辑 ID 读取。

## Local Service

`packages/local-service` 把浏览器 PBWork 接到 Node 能力：

- 只允许 loopback host 和本地 Runtime origin；
- 校验允许的 Workbench origins；
- 建立有过期时间的 session，并在 session 上加法返回已解析的 `deliveryTargetRoot`；
- 请求体有固定容量限制；
- 保存短期 Preflight；
- 运行 Core JobHost；
- 读取 Bundle、Snapshot、Evidence 和 Handoff View；
- 服务重启后终结 orphan Job，并使旧 session 失效。
- session/console 绑定 Workspace generation；generation 变化后撤销旧 session，并由 PBWork 清空 Workspace 范围缓存；
- reset 使用 Store 外持久化的 `planId + generation + inventory digest` 两阶段 Contract，范围覆盖 Evidence、Delivery 与未导出 Review；
- writer 校验 root/lock 身份，外部破坏后停止旧 writer，禁止在原进程内自动重建。
- 仓库保留 L1/L2/L3 Review reducer、event log 和 Flutter Runtime provider 的实验实现；默认 MCP 不注册对应工具，正常 Capture、Delivery 和 Evidence 消费不会进入该路径。实验代码位置、协议限制和恢复条件由 Flutter MCP Roadmap 维护。

Service Contract 来自 `@proto-bridge/core/v2/service-contract`。当前 Local Service protocol version 5 覆盖 Capture、Delivery、Workspace reset、持久 Prototype lifecycle，以及仓库内保留的实验 Review 类型；默认 MCP Consumer 不调用这些内部入口。Lifecycle 文档存于 Core Store root 下 `pbwork/<workspaceId>/lifecycle-v1.json`，由 Local Service 校验 generation/revision 后写入并负责 reconciliation；PBWork 只提交允许的人类确认、读取和呈现该文档。回退期间由 Service 单独移入 trash 并提交终态；单个回退失败会持久显示为 `failed(action: rollback)`，其它原型仍继续 reconciliation。Lifecycle JSON 与 Delivery Receipt 原子替换前同步临时文件，替换后同步父目录。PBWork client 不应根据 HTTP 状态猜测第二套产品错误。

## CLI

`packages/cli` 是自动化 Producer：

- `workspace` 初始化和诊断；
- `preflight`、`capture run`；
- `job` 查询、取消和重试；
- `bundle` 列出、检查、fork、archive、clean；
- `snapshot`、`run`、`case` 检查；
- `stale check`；
- `handoff` 创建、显示和导出；
- `deliver`（非正式；默认目标来自 `delivery.targetRoot`）；
- `service start`。

CLI 只解析参数、加载 Workspace 配置、调用 Core、格式化文本/JSON 并映射退出码。`capture run` / `deliver` 在非 PBWork 定稿路径上发出非正式采集确认。完整参考见 [CLI README](../../packages/cli/README.md)。

## MCP

`packages/mcp-server` 是正式 Consumer：

- 通过 stdio JSON-RPC 暴露 Tools、Resources 和 Prompt；
- 启动时固定 Store root、Workspace 与 `delivery.targetRoot`；
- 使用 Core Evidence Read Model 和 Store Reader；
- 以 `HandoffIndex → Screen Packet（含 canonicalBrief 与 semantic inventory）→ compact CaseDelta → paged Obligations → EvidenceDetail` 提供固定、闭集、按需投影；Screen packet 表达主滚动边界、Region 语义关系、inventory occurrence，以及状态矩阵所需的固定业务数据摘要；
- 握手公开 Workspace、能力、契约版本、源码构建指纹、进程身份和 Store generation；
- 校验 Snapshot/revision/Blob 的可达性；
- 返回可见 risks、unknown 和 conflicts；
- 独立提供 Target conventions、examples、readiness 与 validation；
- 提供 Target conventions、resolver、readiness 与变更 validation；五维实施后复查使用固定 Reconstruction Obligations、严格 observation 语义和 consumer-reported summary。

MCP 不创建 Capture Job，不接受 Store 文件路径作为对象引用，不替 Agent 选择实现。Target 工具省略 `targetRoot` 时使用绑定的 `delivery.targetRoot`，禁止回落到 cwd。完整 Snapshot/Contract 读取仅为显式 debug，默认 Prompt 不调用。`read_implementation_plan` / `read_implementation_tranche` 保留为诊断能力，不是默认实施路径。普通响应不按字节阈值截断；detail continuation 只按稳定逻辑查询边界产生。当前 MCP Tool Contract version 3 直接采用严格 Reconstruction Review observation 语义，不保留旧的空依据 Review 逻辑。完整参考见 [MCP README](../../packages/mcp-server/README.md)。

Consumer projection version 4 是当前默认契约：Screen packet 含 `canonicalBrief`；inventory 与 Case delta 面向 Agent 使用 `regionId` / `caseId`；Case delta 不重复完整 Fact/provenance。Evidence obligations 按 Handoff/Screen/维度分页，continuation 前缀为 `pbcp4` / `pbop4`，绑定固定 Snapshot 与规范化查询，不能跨维度复用。Evidence Region 是 Source 定位与验收单元，不等于目标侧组件、列表项或文件边界。

五维复查分母来自 Core 对 Acceptance Contract 的确定性编译：等价的 per-Case requirements 按 Screen、维度、kind、subject 和 canonical expected 去重，同时保留全部 Case 与 Evidence refs。`summarize_reconstruction_review` 要求每个 requirement 最多一个 observation：`matched` / `deviation` 必须有依据，`deviation` / `unverified` / `not-applicable` 必须有理由；它分别输出范围覆盖、observation Review completeness、五维 findings 和人工复查输入，不将 Consumer 自报提升为独立 Runtime receipt。

## Target boundary

Target 分为**公共门面**与**栈适配器**：

- [`packages/core/src/target/`](../../packages/core/src/target/)：adapter 检测与分发、resolution/readiness 类型与聚合、implementation claim 信封、栈无关 occurrence 路径安全。MCP 与 Consumer 只依赖该门面。
- [`packages/core/src/target/flutter-app/`](../../packages/core/src/target/flutter-app/)：当前唯一实现。提供 Flutter 工程识别、文档发现、Dart inventory、显式 mapping 解析与代码校验；它不执行 Target 自定义命令。目录中的 Runtime claim/comparator 属于保留实验实现。

公共门面提供：

- 开放 component/token ID 的批量解析（分发到适用 adapter），输出 `resolved/candidate/stale/conflict/unresolved/unsupported`；
- 编辑前 readiness：汇总 resolver coverage、五维 machine authority、实施 blockers 与未验证边界；
- 既有实现示例查找及 Control/candidate output 排除；
- 目标变更路径与实际采用 mapping 的只读验证；
- 目标变更 validation 复核实际采用的 mapping；缺少 Structure、State 或 Interaction machine authority 时保持未验证，不要求补实验 Harness。

适配器不拥有任何具体产品的组件/Token 映射。真实目标工程的 `AGENTS.md`、`docs/proto-bridge.md`、`docs/components.md`、`docs/theme.md` 和公开代码拥有当前约束；可选的根目录 `proto-bridge.target.json` 只是这些约束的严格机器投影。政策与机器 Contract 冲突返回 `conflict`，显式声明与代码不符返回 `stale`，代码启发式最多返回 `candidate`。缺少 authority 的维度只能保持 `unverified`。Target root 来自 Agent 当前任务或单次 Tool 参数；目标仓库不需要 ProtoBridge Workspace 配置，Target 结果不写入 Bundle。无适用 adapter 时仍可消费固定 Evidence，但不能宣称已完成 Target query/validation 闭环。

Flutter MCP `review.version: 3`、DTD attach、Driver Bridge、App/build identity 和 Runtime receipt 仍保留在实验代码与测试中，但不属于当前 Target Contract、默认 MCP Tool 或 Agent Prompt。当前 Flutter 目标工程只拥有组件/Token mapping、公开代码、路由和目标原生测试。详见 [Flutter MCP 实验记录](../history/flutter-mcp-experiment-2026-08.md)。

## 公共导出

`@proto-bridge/core` 导出当前 Evidence 产品。`@proto-bridge/core/v2/*` 是需要精确 schema/protocol major 的子路径；Target query/validation 使用独立导出。公共导出以 `packages/core/package.json` 为准。
