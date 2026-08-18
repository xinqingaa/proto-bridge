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
4. 每个实现范围内的 Screen 调用一次 `read_screen_packet`。用 `canonicalBrief`、baseline Structure 与 state 理解主滚动边界、主 section、状态矩阵和固定业务数据；主滚动看 `canonicalBrief.primaryScroll` 与 `baseline.structure.scrollContainers`（packet 的 compact regions **不含** per-region `scrollOwner`）。Evidence Region 用于定位与验收，不是目标侧组件边界、列表项边界或文件边界。
5. 每份不同 Screenshot 内容使用 digest group 的 `representativeBlobId` 调用 `read_evidence_screenshot`，确认 MCP ImageContent，并记录覆盖的全部 Case。相同 digest 不重复注入；metadata、base64 文本和相似 Variant 不能替代 Screenshot。
6. 每个 Screen 在编辑前调用 `inspect_target_readiness`，记录 resolver coverage、component/token candidate/conflict/unresolved、五维 machine authority 和 blockers；没有 authority 的维度只能保持 `unverified`。用 `implementationInventory` 的 `regionId`/`caseId` 批量解析组件和 Token。若 Target 是 Flutter，缺少 `review.version: 2` 或不足以覆盖固定 Handoff Case/Scenario 时，实施计划必须包含 Review Harness：官方 `dart-flutter-mcp` provider、Case/Scenario binding、debug-only identity/prepare/observe service extension、Flutter Driver extension、稳定 finder、typed State/Structure observation，以及 App/build/Target identity；用户批准后先补齐 Harness，再进入 authoritative Runtime Review。非 Flutter Target 不要求或启动该 Harness。`read_implementation_plan` / `read_implementation_tranche` 仅诊断或 Review 辅助，不是默认实施路径。
7. 非 baseline 或包含状态/场景差异的 Case 调用 `read_case_delta`。Delta 使用语义 ID patch；需要来源时再定向调用 `read_evidence_detail`。
8. 每个 Screen 在编辑前用简短散文概括 Evidence 理解：主结构与滚动边界、组件与 Token 落点意向、状态与交互覆盖，并附实现计划（预计修改文件、验证方式、剩余风险）。这是给人纠偏的白话摘要，不是清单或评分表。然后必须暂停，等待用户明确批准；未获批准前不得修改目标工程，也不得执行会改变目标工程状态的命令。Deliver 提示词与此门禁一致，见 [快速上手](./getting-started.md)。
9. 用户批准后，阅读目标仓库自己的 AGENT、README、架构、测试、公共 API 和既有实现。Target adapter 只发现和归一化这些上下文；内置 fallback 不能覆盖真实目标文档。
10. Agent 自行决定文件、组件、状态、路由和 Token，但不得发明证据未支持的容器形态、文案、交互或状态；优先复用 Evidence/Source 固定业务数据；布局敏感 prop 缺失时对照 Screenshot，仍不确定则披露为剩余风险。
11. continuation 只能续读同一规范化查询直到 `complete=true`。完成后不得重启；不得为“读全”轮询所有投影或在 selector 之间循环。一次针对性展开仍不能解决时，记录未知或风险。
12. 完成实现并运行目标原生验证；实施后复查使用 `read_reconstruction_obligations` 按 Screen/维度分页，不读取完整 Acceptance Contract，也不把 obligation 顺序当作编码顺序。调用 `summarize_reconstruction_review` 汇总已处理 Case、已查看 Screenshot、已重放 Scenario、已知偏差和未验证事项。
13. 需要 authoritative Review 时调用 `start_target_review`；Core 从固定风险选择 L1/L2/L3，`requestedProfile` 只能升级。Flutter Review 的 render/replay 由 Local Service attach 已运行 App 的官方 MCP session；不得自行启动设备或回退 launcher。Structure/state/interaction obligation 通过 `verify_target_claims` 读取已持久化 typed Runtime observation，component/token 提交精确 Target occurrence/slot。没有 Runtime receipt、resolved mapping 或精确 occurrence authority时必须保持 `unverified`。L1/L2 只能人工接受为 `closed`，只有 L3 可 `completed`。

整包 Snapshot、原始 Case/revision/fragment、Catalog、Issue、Staleness、`read_agent_handoff` 与 `read_acceptance_contract` 已从 MCP 表面移除；不得回退到旧整包读取路径。

也可以使用 MCP Prompt `consume_evidence_handoff` 创建同一读取任务；Prompt 不放宽上述规则。权威实现纪律以 `proto-bridge://guides/handoff-consumer` 为准。

## Evidence Tools

| Tool | 用途 |
| --- | --- |
| `inspect_evidence_workspace` | 确认 Workspace、能力、契约版本、构建与进程身份、Store generation |
| `read_handoff_index` | 默认入口：固定 refs、风险、Screen/Case/Scenario 摘要和 digest 分组 |
| `read_screen_packet` | 单 Screen 的 baseline、canonicalBrief、inventory、Case/Scenario 和 Screenshot 分组 |
| `read_implementation_plan` | 诊断：Region tranche 索引与 obligation 计数（非默认实施路径） |
| `read_implementation_tranche` | 诊断：展开单个 tranche 的 obligations（非默认实施路径） |
| `read_case_delta` | 指定 Case 相对 baseline 的语义 patch（regionId/caseId） |
| `read_evidence_detail` | 按需读取单 Screen 的指定投影；可按稳定逻辑 continuation 续读 |
| `read_reconstruction_obligations` | 按 Screen 和维度分页读取稳定、去重的五维还原义务 |
| `read_evidence_screenshot` | 将代表 Screenshot 作为真正的 MCP ImageContent 返回 |
| `summarize_reconstruction_review` | 汇总范围覆盖、视觉阅读、场景重放、偏差和未验证事项，不计算分数 |

## Target Tools

| Tool | 用途 |
| --- | --- |
| `read_target_conventions` | 读取目标工程政策入口、架构和约定摘要 |
| `resolve_target_components` | 批量解析开放 component ID，并校验声明、symbol/import/签名/usage |
| `resolve_target_tokens` | 批量解析开放 token ID，并校验 accessor/定义/usage |
| `find_target_examples` | 查找可复用模式；Treatment 必须排除 Control 和 candidate output |
| `validate_target_changes` | 验证变更范围、文件与实际采用的 resolved mapping |
| `inspect_target_readiness` | 编辑前报告 resolver coverage、machine authority、Case/Scenario 声明和 blockers |

## Authoritative Target Review

`start_target_review` 从固定 Handoff 风险确定 L1/L2/L3，选择 Case/Scenario/Screenshot 后再将适用 Acceptance Requirements 规范化并跨 Case 去重。每项义务保留适用的 Case、Evidence refs、预期值和五维分类；Local Service 会从持久 Handoff 与当前 Target 独立重算，拒绝客户端删减或改写。Flutter 自动固定 `dart-flutter-mcp` 为必需 Runtime provider；非 Flutter 不启动它。

| Tool | 用途 |
| --- | --- |
| `start_target_review` | 固定风险 Profile、Screenshot、Scenario 和五维 Reconstruction Obligations；请求只能升级 Profile |
| `read_target_review` | 恢复 append-only Session 摘要、artifact coverage 和 obligation 计数，不内嵌完整义务 |
| `read_review_obligations` | 按 Screen、维度和 assessment 状态分页读取 Review obligations |
| `render_target_case` / `compare_target_artifacts` | 由 Local Service 经官方 Flutter MCP 采集 Screenshot、Widget/State/Structure observation，并生成视觉比较回执 |
| `replay_target_scenario` | 经同一 App session 记录 pre-state、实际 action/input、post-state 和 visible result |
| `verify_target_claims` | 比较已持久化 Flutter MCP Structure/state/interaction observation；对 component/token 验证精确 occurrence/slot，并写入机器 receipt |
| `record_review_assessments` | 对固定 obligation 写入 `matched`、`deviation` 或 `unverified`；`matched` 必须引用成功 verifier receipt，后写结果显式替代旧 assessment |
| `record_review_findings` | 记录偏差、严重度和处理状态；不能代替 obligation assessment |
| `request_review_tranche` | 消费由 PBWork/CLI/operator 或 MCP host approval 预先签发的一次性授权 token；普通参数不能自证授权 |
| `finalize_target_review` | 消费人工确认，并由 Reducer 重新执行全部门禁 |

Screenshot/Scenario coverage 与语义完成是两类独立事实。即使所有图片都已查看、所有 Case 都已渲染且 findings 为空，只要存在未核验、偏差、未验证 obligation 或没有 authority 的 `matched`，Review 就不能完成。Agent 不能声明 `not-applicable`；该状态需要 operator/human authority 和明确 Target basis。State/interaction 只有完整 typed runtime proof 才能 matched；普通命令成功或点击记录不足以通过。

Target 结果是实现上下文，不是原型事实。真实目标文档/公开代码优先于 adapter fallback；机器 Contract 与政策冲突时必须保留 conflict。它不能写回 Evidence，也不能覆盖 unknown 或 conflict。

Evidence Contract 可以服务任意技术栈；当前 Target tools 的公共门面下只实现 Flutter adapter（`packages/core/src/target/flutter-app`）。非 Flutter 目标在对应 Adapter 落地前仍可消费固定 Evidence，但不能宣称已完成 PB Target query/validation 闭环。component/token occurrence 的文件形态由当前 adapter 解释（Flutter：`lib/**/*.dart`）。

Component / Token 落点以 `read_screen_packet` 的 `implementationInventory` 为准，再调用 `inspect_target_readiness` / `resolve_target_*`。Catalog revision 仍由 Producer 固定在 Snapshot 上，Consumer 不得读取当前源码目录补造旧 Snapshot 的目录事实。

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
- 缺少 `handoff-index`、`screen-implementation-packet`、`case-delta`、`evidence-detail`、`reconstruction-obligations` 或 `image-content-screenshot` 能力；
- 固定 Snapshot、revision、Staleness Report 或 Handoff 不存在；
- revision 不能由 Handoff Snapshot 到达；
- Schema major 不受支持；
- Debug/Trace 未经显式请求；
- Target 路径越界或目标仓库无法验证；
- 发明 Screenshot / Fragment 未支持的视觉结构、文案或交互，却不披露偏差。

不得通过切换 active/latest、拼接 Store 文件路径、忽略风险、重新解释旧对象或退回已移除的整包读取工具恢复。

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

这里的完成报告是范围与验证事实摘要，不是还原度评分。组件或 Token Evidence 无法逐项映射时可以继续结合 Screenshot 和目标规范实施，但 authoritative Review 必须将对应 obligation 标为 `deviation` 或 `unverified`，不能用空 findings 隐去；不要为了填满映射表而弱化最终视觉。
