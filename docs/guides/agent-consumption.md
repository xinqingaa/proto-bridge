# Agent 消费指南

本指南适用于通过 ProtoBridge MCP 读取 Handoff 并修改目标仓库的 Coding Agent。

Handoff 是固定 Evidence 索引，不是实现计划。Agent 必须使用 Handoff 指定的 Workspace、Snapshot、Staleness Report 和 revision，不能改读 active/latest，也不能直接解析 Store 目录。

## MCP 配置

构建仓库后，MCP server 的等价启动命令为：

```bash
node /absolute/path/to/proto-bridge/packages/mcp-server/dist/index.js \
  --store-root /absolute/path/to/.proto-bridge/store \
  --workspace pbwork-local
```

也可以使用 `PB_STORE_ROOT` 和 `PB_WORKSPACE_ID`。Store 与 Workspace 必须和 Producer 创建 Handoff 时一致。

MCP 客户端应把上述命令登记为一个 stdio server。Agent 不应通过 shell 遍历 Store 代替 MCP。

## 强制读取顺序

1. 读取资源 `proto-bridge://guides/handoff-consumer`。
2. 调用 `inspect_evidence_workspace`。
3. 调用 `read_agent_handoff`。
4. 校验 Handoff Workspace 与 MCP Workspace。
5. 在编辑前原样报告 `mandatoryRiskReport` 的全部风险。
6. 读取 Handoff 固定的 Snapshot、Coverage 和 Staleness Report。
7. 按实现范围读取固定 Case revision；局部任务再读取对应 Fragment。
8. 实际查看 Screenshot（构图约束与 Fragment 结构同级）；按需读取 Catalog 和 Issue。
9. 阅读目标仓库自己的 AGENT、README、架构、测试和既有实现。
10. 必要时调用 `read_target_conventions` 与 `find_target_examples`；Target 结果不是 Source Evidence，不得覆盖 Screenshot / Fragment。
11. Agent 自行决定文件、组件、状态、路由和 Token，但不得发明证据未支持的容器形态、文案、交互或状态；布局敏感 prop 缺失时对照截图，仍不确定则披露为剩余风险。
12. 完成实现并运行目标原生验证，调用 `validate_target_changes`，报告变更范围、验证结果、原始风险、相对 Evidence 的已知偏差和剩余风险。

也可以使用 MCP Prompt `consume_evidence_handoff` 创建同一读取任务；Prompt 不放宽上述规则。权威实现纪律以 `proto-bridge://guides/handoff-consumer` 为准。

## Evidence Tools

| Tool | 用途 |
| --- | --- |
| `inspect_evidence_workspace` | 确认 MCP 绑定的逻辑 Workspace |
| `list_evidence_bundles` | 发现 Bundle；不能据此把 active 当作 Handoff 引用 |
| `list_evidence_history` | 查看 Bundle 的固定历史对象 |
| `read_evidence_snapshot` | 读取 Handoff 固定 Snapshot |
| `read_evidence_case` | 读取 Snapshot 中的 Case 聚合 |
| `read_evidence_run` | 读取 Selection、Attempt 与 Coverage |
| `read_evidence_revision` | 读取 Snapshot 可达的固定 revision |
| `read_evidence_fragment` | 按 `pbId`/`pbKey` 读取局部 Facts |
| `read_evidence_catalog` | 读取固定 Prototype/Screen/Component/Token 目录 |
| `read_evidence_issue` | 读取 unknown、conflict、失败原因和 next action |
| `read_evidence_staleness` | 读取指定 Snapshot 的 freshness 判断 |
| `read_agent_handoff` | 读取固定范围、引用和 mandatory risks |
| `read_evidence_blob` | 读取 Snapshot/Catalog 可达的截图或经许可的调试 Blob |

## Target Tools

| Tool | 用途 |
| --- | --- |
| `read_target_conventions` | 只读扫描目标 Flutter 工程的结构与约定 |
| `find_target_examples` | 查找目标工程中可复用的既有模式 |
| `validate_target_changes` | 验证目标变更路径、文件与原生检查结果 |

Target 结果是实现上下文，不是原型事实。它不能写回 Evidence，也不能覆盖 unknown 或 conflict。

Evidence Contract 可以服务任意技术栈；当前表中的 Target tools 只实现 Flutter。非 Flutter 目标在对应 Adapter 落地前仍可消费固定 Evidence，但不能宣称已完成 PB Target query/validation 闭环。

当 Handoff 范围依赖 PBWork Component 或 Token Fact 时，Agent 必须读取 Handoff/Snapshot 固定的 Catalog revision；Catalog 缺失或不能解析相关 ID 时应报告 Evidence 不完整，不得读取当前源码目录补造旧 Snapshot 的目录事实。

## 必须报告的风险

- `partial-coverage`
- `stale-evidence`
- `required-unknown`
- `unresolved-conflict`
- `evidence-level-limitation`
- `manual-promotion`

Producer 对风险的确认只允许生成 Handoff，不代表 Consumer 可以省略风险，也不改变 Evidence 内容。

## 硬失败

以下情况必须停止：

- Workspace 不匹配；
- 固定 Snapshot、revision、Staleness Report 或 Handoff 不存在；
- revision 不能由 Handoff Snapshot 到达；
- Schema major 不受支持；
- Debug/Trace 未经显式请求；
- Target 路径越界或目标仓库无法验证；
- 发明 Screenshot / Fragment 未支持的视觉结构、文案或交互，却仍宣称完成。

不得通过切换 active/latest、拼接 Store 文件路径、忽略风险或重新解释旧对象恢复。

## 完成报告

Agent 最终至少报告：

- 使用的 Handoff、Snapshot 和 revision；
- 编辑前发现的 mandatory risks；
- 实际修改的目标文件；
- 使用了哪些目标工程既有模式；
- 运行的原生测试和结果；
- `validate_target_changes` 结果；
- 相对 Evidence 的已知偏差；
- 尚未解决的 Evidence 或实现风险。
