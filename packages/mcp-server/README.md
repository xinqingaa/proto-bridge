# @proto-bridge/mcp-server

ProtoBridge MCP 是 Coding Agent 读取持久 Evidence 的正式边界。它只接受逻辑 Workspace/Object ID，不暴露或猜测 Store 布局。

## 启动

```bash
proto-bridge-mcp \
  --store-root .proto-bridge/store \
  --workspace pbwork-local
```

也可使用 `PB_STORE_ROOT` 与 `PB_WORKSPACE_ID`。

在本仓库中可以让 wrapper 从 `proto-bridge.json` 自动解析两者：

```bash
pnpm pb:mcp
pnpm pb:mcp -- --print-config
```

第二个命令只打印 Cursor/Codex 可使用的 stdio 配置材料，不启动 server。

成功的 `tools/call` 对声明了 `outputSchema` 的工具会同时返回：

- `content`：JSON 文本（兼容只读 `content` 的客户端）；
- `structuredContent`：同一对象（Cursor 等严格客户端要求）。

## Evidence Tools

默认消费路径：

- `inspect_evidence_workspace`（Workspace、能力、契约版本、build fingerprint、进程启动时间和 Store generation 握手）
- `read_handoff_index`
- `read_screen_packet`
- `read_case_delta`
- `read_reconstruction_obligations`
- `read_evidence_detail`
- `read_evidence_screenshot`（视觉消费必须使用；返回 MCP ImageContent）
- `summarize_reconstruction_review`

兼容与显式 debug 路径：

- `list_evidence_bundles`
- `list_evidence_history`
- `read_evidence_snapshot`
- `read_evidence_case`
- `read_evidence_run`
- `read_evidence_revision`
- `read_evidence_fragment`
- `read_evidence_catalog`
- `read_evidence_issue`
- `read_evidence_staleness`
- `read_agent_handoff`
- `read_evidence_blob`
- `read_acceptance_contract`（非评分的五维实施与复查指引）

`read_screen_packet` 返回 baseline Structure IR（Region tree、scroll owner/member、positioning/pinning、sibling order、bbox relation）和可见 state/content。`read_case_delta` 只返回紧凑 value/resolution/state patch；完整 provenance 必须定向读取。`read_reconstruction_obligations` 按 Screen/维度分页，避免重新注入完整 Acceptance Contract。

兼容工具不会被默认 Prompt 调用。普通 JSON 响应没有按字节截断规则；detail/obligation continuation 绑定固定 Snapshot 和规范化查询。

## Target Tools

- `read_target_conventions`
- `resolve_target_components`
- `resolve_target_tokens`
- `find_target_examples`
- `validate_target_changes`

这些工具通过 Target adapter 访问目标工程；当前内置 Flutter adapter，其他目标会返回 unsupported。真实目标文档与公开代码优先，可选机器 Contract 不能覆盖政策；显式 mapping 通过当前代码验证才返回 resolved，启发式结果最多为 candidate。`find_target_examples` 支持排除 Control/candidate output，`validate_target_changes` 可复核 Agent 实际采用的 resolved mapping。Target Tools 只读目标仓库，不读取或写入 Evidence。

## Authoritative Review Tools

- `start_target_review` / `read_target_review`
- `read_review_obligations`
- `verify_target_claims`
- `render_target_case` / `compare_target_artifacts`
- `replay_target_scenario`
- `record_review_assessments`
- `record_review_findings`
- `request_review_tranche` / `finalize_target_review`

Review 启动时把固定 Handoff 的五维 Acceptance Requirements 编译成稳定、跨 Case 去重的 Reconstruction Obligations，Local Service 会独立重算以阻止客户端缩小验收范围。Screenshot、render、compare 和 Scenario receipts 只代表 artifact coverage；每项 obligation 还必须显式 assessment。未核验、`deviation`、`unverified`、阻断 finding 或缺少 receipt 都会阻止人工完成；Agent 不能自行声明 `not-applicable`。

`verify_target_claims` 不接受 Agent 自填 expected。它从固定 Review obligation 读取 Source expected：Structure 运行 Target 自有 deterministic `launcher.structureCommand` 并比较同构 IR；component/token 重新解析 mapping 并验证精确 Dart occurrence/slot；state 运行 `launcher.stateCommand` 比较 shell、visible Regions、keyed collections 和值；interaction 解析 `scenarioCommand` 的 pre/action/post/visible-result transition。Receipt 绑定 `HEAD + tracked diff + untracked bytes` 的 Target content digest，同一 Review 不能混用不同内容状态。错误 occurrence/slot、默认值、动作对象或 post-state 均返回 `deviation`；缺少 inspector、incomplete/unknown JSON 或 unresolved mapping 返回 `unverified`。State/interaction result 会自动成为 blocking assessment。

Review tools 只返回 Session 摘要、attempt、finding、obligation 和 verifier receipt 计数，不重复完整验收分母。`read_review_obligations` 按 Screen、维度和 `unassessed/matched/deviation/unverified/not-applicable` 状态分页。新 Review 的 `matched` assessment 必须引用同一 obligation 的成功 verifier receipt；旧 event log 可恢复，但没有 verification contract 时不能完成。

## Resources 与 Prompt

- `proto-bridge://guides/handoff-consumer`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}/screenshots/{blobId}`
- Prompt：`consume_evidence_handoff`

Consumer 的唯一默认顺序是 `inspect → handoff index → Screen implementation packet → screenshot → compact Case delta / paged obligations → targeted detail`。详细规则见 [Agent 消费指南](../../docs/guides/agent-consumption.md)。

## 开发

```bash
pnpm --filter @proto-bridge/mcp-server build
pnpm test:e2e:mcp
pnpm test:e2e:consumer
```
