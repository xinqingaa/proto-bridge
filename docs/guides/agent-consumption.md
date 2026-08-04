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
2. 调用 `inspect_evidence_workspace`，校验 Workspace、projection contract version 和 capabilities。能力缺失时停止，不回退旧链路。
3. 调用 `read_handoff_index`，在编辑前原样报告 `mandatoryRisks` 的全部风险，并固定 Screen 顺序、Case/Scenario 范围与 Screenshot digest 分组。
4. 每个实现范围内的 Screen 调用一次 `read_screen_packet`。
5. 每份不同 Screenshot 内容使用 digest group 的 `representativeBlobId` 调用 `read_evidence_screenshot`，确认 MCP ImageContent，并记录覆盖的全部 Case。相同 digest 不重复注入；metadata、base64 文本和相似 Variant 不能替代 Screenshot。
6. 非 baseline 或包含状态/场景差异的 Case 调用 `read_case_delta`。只有出现明确实现问题时才调用 `read_evidence_detail` 的 structure、components、tokens、interactions 或 provenance。
7. continuation 只能续读同一规范化查询直到 `complete=true`。完成后不得重启；不得为“读全”轮询所有投影或在 selector 之间循环。一次针对性展开仍不能解决时，记录未知或风险。
8. 阅读目标仓库自己的 AGENT、README、架构、测试、公共 API 和既有实现。Target adapter 只发现和归一化这些上下文；内置 fallback 不能覆盖真实目标文档。
9. Agent 自行决定文件、组件、状态、路由和 Token，但不得发明证据未支持的容器形态、文案、交互或状态；布局敏感 prop 缺失时对照 Screenshot，仍不确定则披露为剩余风险。
10. 完成实现并运行目标原生验证；调用 `summarize_reconstruction_review` 汇总已处理 Case、已查看 Screenshot、已重放 Scenario、已知偏差和未验证事项。

`read_agent_handoff`、`read_evidence_snapshot`、`read_evidence_case`、`read_evidence_revision`、`read_evidence_fragment` 和 `read_acceptance_contract` 只保留为显式 debug/兼容入口，不属于默认消费顺序。

也可以使用 MCP Prompt `consume_evidence_handoff` 创建同一读取任务；Prompt 不放宽上述规则。权威实现纪律以 `proto-bridge://guides/handoff-consumer` 为准。

## Evidence Tools

| Tool | 用途 |
| --- | --- |
| `inspect_evidence_workspace` | 确认 Workspace、能力、契约版本、构建与进程身份、Store generation |
| `read_handoff_index` | 默认入口：固定 refs、风险、Screen/Case/Scenario 摘要和 digest 分组 |
| `read_screen_packet` | 单 Screen 的 baseline、Case/Scenario、壳层、滚动和查询提示 |
| `read_case_delta` | 指定 Case 相对 baseline 的变化、未决项和 Screenshot 语义 |
| `read_evidence_detail` | 按需读取单 Screen 的指定投影；可按稳定逻辑 continuation 续读 |
| `read_evidence_screenshot` | 将代表 Screenshot 作为真正的 MCP ImageContent 返回 |
| `summarize_reconstruction_review` | 汇总范围覆盖、视觉阅读、场景重放、偏差和未验证事项，不计算分数 |
| 以下兼容/debug Tool | 不在默认读取链路中 |
| `list_evidence_bundles` | 发现 Bundle；不能据此把 active 当作 Handoff 引用 |
| `list_evidence_history` | 查看 Bundle 的固定历史对象 |
| `read_evidence_snapshot` | 读取 Handoff 固定 Snapshot |
| `read_evidence_case` | 读取 Snapshot 中的 Case 聚合 |
| `read_evidence_run` | 读取 Selection、Attempt 与 Coverage |
| `read_evidence_revision` | 读取 Snapshot 可达的固定 revision |
| `read_evidence_fragment` | 按 `pbId`/`pbKey` 读取局部 Facts |
| `read_evidence_catalog` | 按 `bundleId + snapshotId + catalogRevisionId` 读取固定 Snapshot 可达的目录 |
| `read_evidence_issue` | 读取 unknown、conflict、失败原因和 next action |
| `read_evidence_staleness` | 读取指定 Snapshot 的 freshness 判断 |
| `read_agent_handoff` | 读取固定范围、引用和 mandatory risks |
| `read_evidence_blob` | 读取 Snapshot/Catalog 可达的截图或经许可的调试 Blob |
| `read_acceptance_contract` | 读取固定 Handoff 派生的非评分 Review 合同 |

## Target Tools

| Tool | 用途 |
| --- | --- |
| `read_target_conventions` | 读取目标工程政策入口、架构和约定摘要 |
| `resolve_target_components` | 批量解析开放 component ID，并校验声明、symbol/import/签名/usage |
| `resolve_target_tokens` | 批量解析开放 token ID，并校验 accessor/定义/usage |
| `find_target_examples` | 查找可复用模式；Treatment 必须排除 Control 和 candidate output |
| `validate_target_changes` | 验证变更范围、文件与实际采用的 resolved mapping |

Target 结果是实现上下文，不是原型事实。真实目标文档/公开代码优先于 adapter fallback；机器 Contract 与政策冲突时必须保留 conflict。它不能写回 Evidence，也不能覆盖 unknown 或 conflict。

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
- 缺少 `handoff-index`、`screen-packet`、`case-delta`、`evidence-detail` 或 `image-content-screenshot` 能力；
- 固定 Snapshot、revision、Staleness Report 或 Handoff 不存在；
- revision 不能由 Handoff Snapshot 到达；
- Schema major 不受支持；
- Debug/Trace 未经显式请求；
- Target 路径越界或目标仓库无法验证；
- 发明 Screenshot / Fragment 未支持的视觉结构、文案或交互，却不披露偏差。

不得通过切换 active/latest、拼接 Store 文件路径、忽略风险、重新解释旧对象或退回完整读取链路恢复。

## 完成报告

Agent 最终至少报告：

- 使用的 Handoff、Snapshot 和 revision；
- 编辑前发现的 mandatory risks；
- 实际修改的目标文件；
- 使用了哪些目标工程既有模式；
- 运行的原生测试和结果；
- 适用 adapter 的变更校验结果（若存在）；
- 相对 Evidence 的已知偏差；
- 尚未解决的 Evidence 或实现风险。

这里的完成报告是范围与验证事实摘要，不是还原度评分。组件或 Token Evidence 无法逐项映射时可以继续结合 Screenshot 和目标规范实施，但必须如实说明取舍；不要为了填满映射表而弱化最终视觉。
