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
- 建立有过期时间的 session；
- 请求体有固定容量限制；
- 保存短期 Preflight；
- 运行 Core JobHost；
- 读取 Bundle、Snapshot、Evidence 和 Handoff View；
- 服务重启后终结 orphan Job，并使旧 session 失效。
- session/console 绑定 Workspace generation；generation 变化后撤销旧 session，并由 PBWork 清空 Workspace 范围缓存；
- reset 使用 Store 外持久化的 `planId + generation + inventory digest` 两阶段 Contract，范围覆盖 Evidence、Delivery 与未导出 Review；
- writer 校验 root/lock 身份，外部破坏后停止旧 writer，禁止在原进程内自动重建。
- authoritative Review 启动时从固定 Handoff 独立重算 canonical Reconstruction Obligations，拒绝客户端缩小验收分母；append-only event log 保存逐项 assessment，Reducer 在人工完成事件上重新执行 artifact coverage 与语义门禁。

Service Contract 来自 `@proto-bridge/core/v2/service-contract`。PBWork client 不应根据 HTTP 状态猜测第二套产品错误。

## CLI

`packages/cli` 是自动化 Producer：

- `workspace` 初始化和诊断；
- `preflight`、`capture run`；
- `job` 查询、取消和重试；
- `bundle` 列出、检查、fork、archive、clean；
- `snapshot`、`run`、`case` 检查；
- `stale check`；
- `handoff` 创建、显示和导出；
- `service start`。

CLI 只解析参数、加载 Workspace 配置、调用 Core、格式化文本/JSON 并映射退出码。完整参考见 [CLI README](../../packages/cli/README.md)。

## MCP

`packages/mcp-server` 是正式 Consumer：

- 通过 stdio JSON-RPC 暴露 Tools、Resources 和 Prompt；
- 启动时固定 Store root 与 Workspace；
- 使用 Core Evidence Read Model 和 Store Reader；
- 以 `HandoffIndex → Screen Implementation Packet → compact CaseDelta / paged Obligations → EvidenceDetail` 提供固定、闭集、按需投影；Screen packet 直接表达 Region tree、scroll owner/member、pinning、ordering、bbox relation 和 baseline state/content；
- 握手公开 Workspace、能力、契约版本、源码构建指纹、进程身份和 Store generation；
- 校验 Snapshot/revision/Blob 的可达性；
- 返回可见 risks、unknown 和 conflicts；
- 独立提供 Target conventions、examples 和 validation。
- 提供 Target Review 的 render/replay/compare、Target claim verifier receipt 与 obligation assessment 写入；截图或 Scenario coverage 不能替代五维语义核验。

MCP 不创建 Capture Job，不接受 Store 文件路径作为对象引用，不替 Agent 选择实现。完整 Snapshot/Contract 读取仅为兼容和显式 debug，默认 Prompt 不调用。普通响应不按字节阈值截断；detail continuation 只按稳定逻辑查询边界产生。完整参考见 [MCP README](../../packages/mcp-server/README.md)。

Consumer projection version 2 不再让 Case delta 重复完整 Fact/provenance，也不让 Review response 内嵌全部 obligations。Evidence obligations 按 Handoff/Screen/维度分页；Review obligations 额外支持 assessment 状态过滤。所有 continuation 都绑定固定 Snapshot 和规范化查询，不能跨维度复用。

Review 的验收分母来自 Core 对 Acceptance Contract 的确定性编译：等价的 per-Case requirements 按 Screen、维度、kind、subject 和 canonical expected 去重，同时保留全部 Case 与 Evidence refs。Assessment 使用显式 last-write 语义；`deviation`、`unverified`、未 assessment、阻断 finding 和缺少必要 receipt 都会阻止完成。`matched` 必须绑定固定 Target revision 上同一 obligation 的机器 verifier receipt；`not-applicable` 仅允许 operator/human 附 Target basis 写入。旧 event log 仍可恢复，但缺少 obligation 或 verification contract 时禁止完成。

## Target boundary

`packages/core/src/target/flutter-app` 提供：

- Flutter 工程类型识别、文档发现、Dart inventory、显式 mapping 解析和代码校验；
- 开放 component/token ID 的批量解析，输出 `resolved/candidate/stale/conflict/unresolved/unsupported`；
- 既有实现示例查找及 Control/candidate output 排除；
- 目标变更路径、实际采用 mapping 和原生验证结果检查。
- target-independent implementation claims；Flutter adapter 对 Structure 运行目标 inspector 并比较 IR，对 component/token 校验精确 Dart occurrence、owner 和 named-argument slot，对 state/interaction 比较 typed runtime proof。

它不拥有任何具体产品的组件/Token 映射。真实目标工程的 `AGENTS.md`、`docs/proto-bridge.md`、`docs/components.md`、`docs/theme.md` 和公开代码拥有当前约束；可选 `docs/proto-bridge.target.json` 只是这些约束的严格机器投影。政策与机器 Contract 冲突返回 `conflict`，显式声明与代码不符返回 `stale`，代码启发式最多返回 `candidate`。Target root 来自 Agent 当前任务或单次 Tool 参数；目标仓库不需要 ProtoBridge Workspace 配置，Target 结果不写入 Bundle。

Flutter Review machine contract 可在 `review.launcher.structureCommand` 声明确定性 Structure inspector。命令接收 `{caseId}`、`{screenId}`、`{deviceId}` 插值并向 stdout 输出 Consumer projection version 2 的完整 `StructureIR` JSON；Case 可用 `structureArguments` 添加参数。命令缺失、失败、Case 不一致、Schema 不完整或 Source/Target Region 含 unknown 时，verifier 返回 `unverified`，不根据 Widget 类型猜 parent 或 scroll owner。

同一 contract 可用 `review.launcher.stateCommand` 输出 typed State snapshot：Case/shell identity、visible Region IDs、以业务 identity 表达的 keyed collections、selected/default 等标量 values，以及 `complete/unknownKeys`。`scenarioCommand` 输出 Scenario transition：pre-state、实际 action ID/kind/target/input、post-state、checkpoint identity 和 visible result。Verifier 从固定 obligation 读取 Source expected，逐键验证 shell、集合、值、动作目标、required/forbidden visibility 和 checkpoint；不比较原型与 Flutter 的内部状态对象，也不接受 Agent 自填 expected。Case 可分别用 `stateArguments` 和 Scenario `arguments` 增补命令参数。缺少命令、JSON 不完整、状态 unknown 或只有退出码/stdout hash 时返回 `unverified`。

## 公共导出

`@proto-bridge/core` 导出当前 Evidence 产品。`@proto-bridge/core/v2/*` 是需要精确 schema/protocol major 的子路径；Target query/validation 使用独立导出。公共导出以 `packages/core/package.json` 为准。
