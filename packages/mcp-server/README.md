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

兼容工具不会被默认 Prompt 调用。普通 JSON 响应没有按字节截断规则；`read_evidence_detail` 只在调用方选择逻辑分页时返回绑定固定查询的 continuation。

## Target Tools

- `read_target_conventions`
- `resolve_target_components`
- `resolve_target_tokens`
- `find_target_examples`
- `validate_target_changes`

这些工具通过 Target adapter 访问目标工程；当前内置 Flutter adapter，其他目标会返回 unsupported。真实目标文档与公开代码优先，可选机器 Contract 不能覆盖政策；显式 mapping 通过当前代码验证才返回 resolved，启发式结果最多为 candidate。`find_target_examples` 支持排除 Control/candidate output，`validate_target_changes` 可复核 Agent 实际采用的 resolved mapping。Target Tools 只读目标仓库，不读取或写入 Evidence。

## Resources 与 Prompt

- `proto-bridge://guides/handoff-consumer`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}`
- `proto-bridge://evidence/{bundleId}/snapshots/{snapshotId}/screenshots/{blobId}`
- Prompt：`consume_evidence_handoff`

Consumer 的唯一默认顺序是 `inspect → read_handoff_index → read_screen_packet → screenshot → case_delta/detail`。详细规则见 [Agent 消费指南](../../docs/guides/agent-consumption.md)。

## 开发

```bash
pnpm --filter @proto-bridge/mcp-server build
pnpm test:e2e:mcp
pnpm test:e2e:consumer
```
